import axios from 'axios';
import BigNumber from 'bignumber.js';
import createHash from 'create-hash';
import secp256k1 from 'secp256k1';
import bech32 from 'bech32';
import jsonStringify from 'fast-json-stable-stringify';
import {
  db,
  txCollection as txLogRef,
} from './firebase';
import { timeout } from '../common/util/misc';
import { PUBSUB_TOPIC_MISC } from '../constant';
import publisher from './gcloudPub';

import {
  COSMOS_ENDPOINT as cosmosLCDEndpoint,
  COSMOS_GAS_PRICE,
  COSMOS_DENOM,
  COSMOS_CHAIN_ID,
} from '../config/config';
import { COSMOS_PRIVATE_KEY } from '../config/secret';

const api = axios.create({
  baseURL: cosmosLCDEndpoint,
  headers: {
    'Content-Type': 'application/json',
  },
});

function createSigner(privateKey) {
  const publicKey = secp256k1.publicKeyCreate(privateKey, true);
  const sha256 = createHash('sha256');
  const ripemd = createHash('ripemd160');
  sha256.update(publicKey);
  ripemd.update(sha256.digest());
  const rawAddr = ripemd.digest();
  const cosmosAddress = bech32.encode('cosmos', bech32.toWords(rawAddr));
  const sign = (msg) => {
    const msgSha256 = createHash('sha256');
    msgSha256.update(msg);
    const msgHash = msgSha256.digest();
    const { signature } = secp256k1.sign(msgHash, privateKey);
    return { signature, publicKey };
  };
  return { cosmosAddress, sign };
}
const cosmosSigner = createSigner(COSMOS_PRIVATE_KEY);

function LIKEToNanolike(value) {
  return (new BigNumber(value)).multipliedBy(1e9).toFixed();
}

export function LIKEToAmount(value) {
  return { denom: COSMOS_DENOM, amount: LIKEToNanolike(value) };
}
export function amountToLIKE(likecoin) {
  if (likecoin.denom === 'nanolike') {
    return (new BigNumber(likecoin.amount)).dividedBy(1e9).toFixed();
  }
  // eslint-disable-next-line no-console
  console.error(`${likecoin.denom} is not supported denom`);
  return -1;
}

export function getCosmosDelegatorAddress() {
  return cosmosSigner.cosmosAddress;
}

export async function getCosmosAccountLIKE(address) {
  const { data } = await api.get(`/auth/accounts/${address}`);
  if (!data.result.value || !data.result.value.coins || !data.result.value.coins.length) return 0;
  const likecoin = data.result.value.coins.find((c) => c.denom === COSMOS_DENOM);
  return likecoin ? amountToLIKE(likecoin) : 0;
}

export async function getAccountInfo(address) {
  const res = await api.get(`/auth/accounts/${address}`);
  if (res.data.result) {
    return res.data.result.value;
  }
  return res.data.value;
}

function signTransaction({
  signer,
  accNum,
  stdTx: inputStdTx,
  sequence,
}) {
  const stdTx = { ...inputStdTx };
  const signMessage = jsonStringify({
    fee: stdTx.fee,
    msgs: stdTx.msg,
    chain_id: COSMOS_CHAIN_ID,
    account_number: accNum,
    sequence: sequence.toString(),
    memo: stdTx.memo,
  });
  const { signature, publicKey } = signer.sign(Buffer.from(signMessage, 'utf-8'));
  stdTx.signatures = [{
    signature: signature.toString('base64'),
    account_number: accNum,
    sequence: sequence.toString(),
    pub_key: {
      type: 'tendermint/PubKeySecp256k1',
      value: publicKey.toString('base64'),
    },
  }];
  return stdTx;
}

async function sendTransaction(signedTx) {
  try {
    const res = await api.post('/txs', {
      tx: signedTx,
      mode: 'sync',
    });
    if (res.data.code) {
      throw new Error(res.data.raw_log);
    }
    return res.data.txhash;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    if (err && err.response && err.response.data) {
      if (err.response.data.error
        && err.response.data.error.includes('Tx already exists')) {
        // return tx hash
        try {
          const { data } = await api.post('/txs/encode', {
            type: 'cosmos-sdk/StdTx',
            value: signedTx,
          });
          const sha256 = createHash('sha256');
          const txHash = sha256
            .update(data.tx, 'base64')
            .digest('hex');
          return txHash.toUpperCase();
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
          return '';
        }
      }
      if (err.response.data.code) {
        // eslint-disable-next-line no-console
        console.error(err.response.data.raw_log);
        return '';
      }
    } else {
      // eslint-disable-next-line no-console
      console.error(err);
    }
    return '';
  }
}

export async function sendCoins(signer, targets) {
  const RETRY_LIMIT = 10;
  let retryCount = 0;
  let retry = false;
  let txHash;
  let signedTx;
  const msg = targets.map((target) => ({
    type: 'cosmos-sdk/MsgSend',
    value: {
      from_address: signer.cosmosAddress,
      to_address: target.toAddress,
      amount: [target.amount],
    },
  }));
  const gas = (45000 * targets.length).toString();
  const feeAmount = (gas * COSMOS_GAS_PRICE).toFixed(0);
  const stdTx = {
    msg,
    fee: {
      amount: [{ denom: COSMOS_DENOM, amount: feeAmount }],
      gas,
    },
    memo: '',
  };
  const { sequence, account_number: accNum } = await getAccountInfo(signer.cosmosAddress);

  const counterRef = txLogRef.doc(`!counter_${signer.cosmosAddress}`);
  let pendingCount = await db.runTransaction(async (t) => {
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
    signedTx = signTransaction({
      signer,
      accNum,
      stdTx,
      sequence: pendingCount,
    });
    try {
      txHash = await sendTransaction(signedTx);
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
      const { sequence: seq } = await getAccountInfo(signer.cosmosAddress);
      pendingCount = Number(seq);
      signedTx = signTransaction({
        signer,
        accNum,
        stdTx,
        sequence: pendingCount,
      });
      txHash = await sendTransaction(signedTx);
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
      fromWallet: signer.cosmosAddress,
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
    delegatorAddress: signer.cosmosAddress,
    pendingCount,
  };
}

export function sendCoin(toAddress, amount) {
  return sendCoins(cosmosSigner, [{ toAddress, amount }]);
}
