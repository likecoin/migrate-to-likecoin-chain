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
import { TxRaw } from '@cosmjs/stargate/build/codec/cosmos/tx/v1beta1/tx';

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
  COSMOS_CHAIN_ID,
} from '../config/config';
import { COSMOS_PRIVATE_KEY } from '../config/secret';

const getCosmos = (() => {
  let cosmos;
  return async () => {
    if (!cosmos) {
      const wallet = await DirectSecp256k1Wallet.fromKey(COSMOS_PRIVATE_KEY);
      const [firstAccount] = await wallet.getAccounts();
      const delegatorAddress = firstAccount.address;
      const tendermint34Client = await Tendermint34Client.connect(cosmosRPCEndpoint);
      const queryClient = QueryClient.withExtensions(
        tendermint34Client,
        setupAuthExtension,
        setupBankExtension,
      );
      const signingClient = await SigningStargateClient.connectWithSigner(
        cosmosRPCEndpoint, wallet,
      );
      cosmos = { delegatorAddress, queryClient, signingClient };
    }
    return cosmos;
  };
})();

export async function getCosmosDelegatorAddress() {
  const { delegatorAddress } = await getCosmos();
  return delegatorAddress;
}

export async function getCosmosAccountLIKE(address) {
  const { queryClient } = await getCosmos();
  const { amount } = await queryClient.bank.balance(address, COSMOS_DENOM);
  return amount;
}

async function getAccountInfo(address) {
  const { queryClient } = await getCosmos();
  const { value } = await queryClient.auth.account(address);
  const accountInfo = BaseAccount.decode(value);
  return accountInfo;
}

async function sendTransaction(signedTx) {
  const { signingClient } = await getCosmos();
  const txBytes = TxRaw.encode(signedTx);
  const { transactionHash, code, rawLog } = await signingClient.broadcastTx(txBytes);
  if (code) {
    throw new Error(rawLog);
  }
  return transactionHash;
}

async function sendCoins(targets) {
  let txHash;
  let signedTx;
  const { delegatorAddress, signingClient } = await getCosmos();
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
  const { accountNumber, sequence: seq1 } = await getAccountInfo(delegatorAddress);
  const counterRef = txLogRef.doc(`!counter_${delegatorAddress}`);
  let pendingCount = await db.runTransaction(async (t) => {
    const d = await t.get(counterRef);
    if (!d.data()) {
      const count = Number(seq1);
      await t.create(counterRef, { value: count + 1 });
      return count;
    }
    const v = d.data().value + 1;
    await t.update(counterRef, { value: v });
    return v - 1;
  });
  const signerData = {
    accountNumber: Number(accountNumber),
    sequence: pendingCount,
    chainId: COSMOS_CHAIN_ID,
  };
  signedTx = await signingClient.sign(delegatorAddress, msg, fee, memo, signerData);

  try {
    txHash = await sendTransaction(signedTx);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    if (err.code === 3 || err.code === 4) {
      // eslint-disable-next-line no-console
      console.log(`Nonce ${pendingCount} failed, trying refetch sequence`);
    } else {
      await timeout(500);
      txHash = await sendTransaction(signedTx);
    }
  }

  try {
    if (!txHash) {
      const { sequence: seq2 } = await getAccountInfo(delegatorAddress);
      pendingCount = Number(seq2);
      signerData.accountNumber = pendingCount;
      signedTx = await signingClient.sign(delegatorAddress, msg, fee, memo, signerData);
      txHash = await sendTransaction(signedTx);
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
