import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import { LIKE_COIN_ABI, LIKE_COIN_ADDRESS } from '../common/constant/contract/likecoin';
import { ETH_PRIVATE_KEY } from '../config/secret';
import {
  ETH_ENDPOINT,
  ETH_CONFIRMATION_NEEDED,
} from '../config/config';
// import { PUBSUB_TOPIC_MISC } from '../../constant';
// import publisher from '../gcloudPub';
import { getGasPrice } from '../poller/gas';
import {
  db,
  txCollection as txLogRef,
} from './firebase';
import { timeout } from '../common/util/misc';
import { isStatusSuccess } from '../common/util/web3';

export const web3 = new Web3(new Web3.providers.HttpProvider(ETH_ENDPOINT));
export const LikeCoin = new web3.eth.Contract(LIKE_COIN_ABI, LIKE_COIN_ADDRESS);

const ethSigner = web3.eth.accounts.privateKeyToAccount(ETH_PRIVATE_KEY);

export async function prepareWeb3Payload({
  from, to, value, maxReward, nonce, sig,
}) {
  const methodCall = LikeCoin.methods.transferDelegated(from, to, value, maxReward, 0, nonce, sig);
  const { address } = LikeCoin.options;
  const gas = await methodCall.estimateGas({
    address,
    from: ethSigner.address,
    gas: 1000000,
  });
  return {
    address,
    methodCall,
    gas,
  };
}

export async function getTransactionReceipt(txHash) {
  const currentBlock = await web3.eth.getBlockNumber();
  const receipt = await web3.eth.getTransactionReceipt(txHash);
  if (!receipt || currentBlock < receipt.blockNumber + ETH_CONFIRMATION_NEEDED) {
    return null;
  }
  receipt.isSuccess = isStatusSuccess(receipt.status);
  return receipt;
}

export function getTransfersFromReceipt(receipt) {
  const { inputs } = LIKE_COIN_ABI.filter((entity) => entity.name === 'Transfer' && entity.type === 'event')[0];
  return receipt.logs
    .filter((log) => log.address.toLowerCase() === LIKE_COIN_ADDRESS.toLowerCase())
    .map((log) => web3.eth.abi.decodeLog(inputs, log.data, log.topics.slice(1)));
}

export function sendTransaction(tx) {
  return new Promise((resolve, reject) => {
    const txEventEmitter = web3.eth.sendSignedTransaction(tx.rawTransaction);
    txEventEmitter.on('transactionHash', resolve)
      .on('error', (err) => {
        if (err.message === 'Returned error: replacement transaction underpriced') {
          resolve(false);
        } else if (err.message.includes('Returned error: known transaction:')) {
          resolve(web3.utils.sha3(tx.rawTransaction));
        } else {
          reject(err);
        }
      });
  });
}

export async function signTransaction(addr, txData, pendingCount, gasPrice, gasLimit) {
  const signedTx = await ethSigner.signTransaction({
    to: addr,
    nonce: pendingCount,
    data: txData,
    gasPrice,
    gas: gasLimit,
  });
  return signedTx;
}

async function sendWithLoop(
  addr,
  txData,
  { gasLimit, privateKey, address },
) {
  const RETRY_LIMIT = 10;
  let retryCount = 0;
  let retry = false;
  let txHash;
  let tx;
  let networkGas = await web3.eth.getGasPrice();
  networkGas = BigNumber.max(networkGas, '1500000000'); // min 1.5gwei
  const gasPrice = BigNumber.min(getGasPrice(), networkGas).toString();
  const counterRef = txLogRef.doc(`!counter_${address}`);
  /* eslint-disable no-await-in-loop */
  let pendingCount = await db.runTransaction(async (t) => {
    const d = await t.get(counterRef);
    if (!d.data()) {
      await t.create(counterRef, { value: 1 });
      return 0;
    }
    const v = d.data().value + 1;
    await t.update(counterRef, { value: v });
    return d.data().value;
  });
  do {
    retry = false;
    tx = await signTransaction(addr, txData, pendingCount, gasPrice, gasLimit, privateKey);
    try {
      txHash = await sendTransaction(tx);
    } catch (err) {
      console.error(err);
      if (err.message.includes('replacement transaction underpriced')
        || err.message.includes('nonce too low')) {
        console.log(`Nonce ${pendingCount} failed, trying web3 pending`);
      } else {
        retry = true;
        retryCount += 1;
        await timeout(500);
      }
    }
  } while (retry && retryCount < RETRY_LIMIT);
  try {
    while (!txHash) {
      pendingCount = await web3.eth.getTransactionCount(address, 'pending');
      tx = await signTransaction(addr, txData, pendingCount, gasPrice, gasLimit, privateKey);
      txHash = await sendTransaction(tx);
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
    // await publisher.publish(PUBSUB_TOPIC_MISC, null, {
    //   logType: 'eventInfuraError',
    //   fromWallet: address,
    //   txHash,
    //   rawSignedTx: tx.rawTransaction,
    //   txNonce: pendingCount,
    //   error: err.toString(),
    // });
    console.error(err);
    throw err;
  }
  return {
    tx,
    txHash,
    gasPrice,
    delegatorAddress: address,
    pendingCount,
  };
}

export function sendTransactionWithLoop(addr, txData, { gas } = {}) {
  const { address } = ethSigner;
  const privateKey = ETH_PRIVATE_KEY;
  return sendWithLoop(
    addr,
    txData,
    {
      gasLimit: gas || 150000,
      privateKey,
      address,
    },
  );
}
