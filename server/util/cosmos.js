/* eslint-disable import/no-extraneous-dependencies */
import createHash from 'create-hash';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import {
  QueryClient,
  SigningStargateClient,
  setupAuthExtension,
  setupBankExtension,
} from '@cosmjs/stargate';
import { BaseAccount } from 'cosmjs-types/cosmos/auth/v1beta1/auth';
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

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

let cosmosPromise; // don't call this directly, call getCosmos() instead

async function getCosmosAPIClients() {
  if (!cosmosPromise) {
    cosmosPromise = (async () => {
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
      return { delegatorAddress, queryClient, signingClient };
    })();
  }
  return cosmosPromise;
}

export async function getCosmosDelegatorAddress() {
  const { delegatorAddress } = await getCosmosAPIClients();
  return delegatorAddress;
}

export async function getCosmosAccountLIKE(address) {
  const { queryClient } = await getCosmosAPIClients();
  const { amount } = await queryClient.bank.balance(address, COSMOS_DENOM);
  return amount;
}

async function getAccountInfo(address) {
  const { queryClient } = await getCosmosAPIClients();
  const { value } = await queryClient.auth.account(address);
  const accountInfo = BaseAccount.decode(value);
  return accountInfo;
}

async function computeTransactionHash(signedTx) {
  const tx = Uint8Array.from(TxRaw.encode(signedTx).finish());
  const sha256 = createHash('sha256');
  const txHash = sha256
    .update(Buffer.from(tx.buffer))
    .digest('hex');
  return txHash.toUpperCase();
}

async function sendTransaction(signedTx) {
  const { signingClient } = await getCosmosAPIClients();
  const txBytes = TxRaw.encode(signedTx).finish();
  try {
    const { transactionHash } = await signingClient.broadcastTx(txBytes);
    await signingClient.broadcastTx(txBytes);
    return transactionHash;
  } catch (err) {
    const { message } = err;
    if (message && message.includes('tx already exists')) {
      const txHash = await computeTransactionHash(signedTx);
      return txHash;
    }
    throw new Error(err);
  }
}

async function sendCoins(targets) {
  let txHash;
  let signedTx;
  const { delegatorAddress, signingClient } = await getCosmosAPIClients();
  const msg = targets.map((target) => ({
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    value: {
      fromAddress: delegatorAddress,
      toAddress: target.toAddress,
      amount: [target.amount],
    },
  }));
  const gas = (80000 * targets.length).toString();
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
    const { message } = err;
    if (message && message.includes('code 32')) {
      // eslint-disable-next-line no-console
      console.log(`Nonce ${pendingCount} failed, trying refetch sequence`);
      const { sequence: seq2 } = await getAccountInfo(delegatorAddress);
      pendingCount = Number(seq2);
      signerData.sequence = pendingCount;
      signedTx = await signingClient.sign(delegatorAddress, msg, fee, memo, signerData);
    } else {
      await timeout(2000);
    }
  }

  try {
    if (!txHash) {
      txHash = await sendTransaction(signedTx);
    }
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
