/* eslint-disable import/no-extraneous-dependencies */
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import {
  QueryClient,
  SigningStargateClient,
  setupAuthExtension,
  setupBankExtension,
} from '@cosmjs/stargate';
import { BaseAccount } from 'cosmjs-types/cosmos/auth/v1beta1/auth';

import {
  db,
  txCollection as txLogRef,
} from './firebase';
import { timeout } from '../common/util/misc';
import { PUBSUB_TOPIC_MISC } from '../constant';
import publisher from './gcloudPub';

import {
  COSMOS_ENDPOINT as cosmosRPCEndpoint,
  COSMOS_GAS_PRICE,
  COSMOS_DENOM,
} from '../config/config';
import { COSMOS_PRIVATE_KEY } from '../config/secret';

let wallet;
let delegatorAddress;
let queryClient;
let signingClient;

(() => async function createSigner() {
  wallet = await DirectSecp256k1Wallet.fromKey(COSMOS_PRIVATE_KEY);
  const [firstAccount] = await wallet.getAccounts();
  delegatorAddress = firstAccount.address;
  const tendermint34Client = await Tendermint34Client.connect(cosmosRPCEndpoint);
  queryClient = QueryClient.withExtensions(
    tendermint34Client,
    setupAuthExtension,
    setupBankExtension,
  );
  signingClient = await SigningStargateClient.connectWithSigner(cosmosRPCEndpoint, wallet);
})();

export function getCosmosDelegatorAddress() {
  return delegatorAddress;
}

export async function getCosmosAccountLIKE(address) {
  const { amount } = await queryClient.bank.balance(address, COSMOS_DENOM);
  return amount;
}

async function getAccountInfo(address) {
  const { value } = await queryClient.auth.account(address);
  const accountInfo = BaseAccount.decode(value);
  return accountInfo;
}

async function sendCoins(targets) {
  const RETRY_LIMIT = 10;
  let retryCount = 0;
  let retry = false;
  let txHash;
  let signedTx;
  const msg = targets.map((target) => ({
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    value: {
      fromAddress: delegatorAddress,
      toAddress: target.toAddress,
      amount: [target.amount],
    },
  }));
  const gas = (45000 * targets.length).toString();
  const feeAmount = (gas * COSMOS_GAS_PRICE).toFixed(0);
  const fee = {
    amount: [{ denom: COSMOS_DENOM, amount: feeAmount }],
    gas,
  };
  const memo = '';
  const { sequence } = await getAccountInfo(delegatorAddress);

  const counterRef = txLogRef.doc(`!counter_${delegatorAddress}`);
  const pendingCount = await db.runTransaction(async (t) => {
    const d = await t.get(counterRef);
    if (!d.data()) {
      const count = Number(sequence);
      await t.create(counterRef, { value: count + 1 });
      return count;
    }
    const v = d.data().value + 1;
    await t.update(counterRef, { value: v });
    return v - 1;
  });

  do {
    /* eslint-disable no-await-in-loop */
    retry = false;
    try {
      const { transactionHash } = await signingClient.signAndBroadcast(
        delegatorAddress, msg, fee, memo,
      );
      txHash = transactionHash;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      if (err.code === 3 || err.code === 4) {
        // eslint-disable-next-line no-console
        console.log(`Nonce ${pendingCount} failed, trying refetch sequence`);
      } else {
        retry = true;
        retryCount += 1;
        await timeout(500);
      }
    }
  } while (retry && retryCount < RETRY_LIMIT);
  try {
    while (!txHash) {
      const { transactionHash } = await signingClient.signAndBroadcast(
        delegatorAddress, msg, fee, memo,
      );
      txHash = transactionHash;
      if (!txHash) {
        await timeout(200);
      }
    }
    /* eslint-enable no-await-in-loop */
    await db.runTransaction((t) => t.get(counterRef).then((d) => {
      if (pendingCount + 1 > d.data().value) {
        return t.update(counterRef, {
          value: pendingCount + 1,
        });
      }
      return Promise.resolve();
    }));
  } catch (err) {
    await publisher.publish(PUBSUB_TOPIC_MISC, null, {
      logType: 'eventCosmosError',
      fromWallet: delegatorAddress,
      txHash,
      txSequence: pendingCount,
      error: err.toString(),
    });
    // eslint-disable-next-line no-console
    console.error(err);
    throw err;
  }
  return {
    tx: signedTx,
    txHash,
    gasAmount: feeAmount,
    delegatorAddress,
    pendingCount,
  };
}

export function sendCoin(toAddress, amount) {
  return sendCoins([{ toAddress, amount }]);
}
