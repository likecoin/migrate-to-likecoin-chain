import BigNumber from 'bignumber.js';
import Web3 from 'web3';

import {
  ETH_LOCK_ADDRESS,
  ETH_CONFIRMATION_NEEDED,
  ETH_ENDPOINT,
} from '../config/config';
import { LIKE_COIN_ABI, LIKE_COIN_ADDRESS } from '../constant/contract/likecoin';
import { timeout } from './misc';

let web3 = null;
let LikeCoin = null;

export function initReadOnlyWeb3() {
  web3 = new Web3(new Web3.providers.HttpProvider(ETH_ENDPOINT));
  LikeCoin = new web3.eth.Contract(LIKE_COIN_ABI, LIKE_COIN_ADDRESS);
  return web3;
}

export function initWindowWeb3(windowWeb3) {
  web3 = new Web3(windowWeb3);
  LikeCoin = new web3.eth.Contract(LIKE_COIN_ABI, LIKE_COIN_ADDRESS);
  return web3;
}

export function getLikeCoinInstance() {
  return LikeCoin;
}

export function getLikeCoinBalance(address) {
  return LikeCoin.methods.balanceOf(address).call();
}

export async function getFromAddr() {
  return (await web3.eth.getAccounts())[0];
}

function signTyped(msg, from) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      method: 'eth_signTypedData',
      params: [msg, from],
      from,
    }, (err, response) => {
      if (err) {
        reject(err);
      } else {
        resolve(response.result);
      }
    });
  });
}

export async function signMigration(from, value) {
  const contract = LIKE_COIN_ADDRESS;
  const to = ETH_LOCK_ADDRESS;
  const nonce = web3.utils.randomHex(32);
  const maxReward = '0';
  const msg = [
    {
      type: 'address',
      name: 'contract',
      value: contract,
    },
    {
      type: 'string',
      name: 'method',
      value: 'transferDelegated',
    },
    {
      type: 'address',
      name: 'to',
      value: to,
    },
    {
      type: 'uint256',
      name: 'value',
      value,
    },
    {
      type: 'uint256',
      name: 'maxReward',
      value: maxReward,
    },
    {
      type: 'uint256',
      name: 'nonce',
      value: nonce,
    },
  ];
  const sig = await signTyped(msg, from);
  return {
    contract,
    from,
    to,
    value,
    maxReward,
    nonce,
    sig,
  };
}

export async function signTransferMigration(from, value) {
  const to = ETH_LOCK_ADDRESS;
  const balance = await LikeCoin.methods.balanceOf(from).call();
  if (new BigNumber(balance).lt(value)) {
    throw new Error('NOT_ENOUGH_BALANCE');
  }
  const methodCall = LikeCoin.methods.transfer(to, value);
  const gas = await methodCall.estimateGas({
    to: LIKE_COIN_ADDRESS,
    from,
    gas: 1000000,
  });
  const [myEth, gasPrice] = await Promise.all([
    web3.eth.getBalance(from),
    web3.eth.getGasPrice(),
  ]);
  const gasNumber = new BigNumber(gas).multipliedBy(1.5);
  if ((gasNumber.multipliedBy(gasPrice).gt(myEth))) {
    throw new Error('NOT_ENOUGH_GAS');
  }
  const txEventEmitter = new Promise((resolve, reject) => {
    LikeCoin.methods.transfer(to, value)
      .send({
        from,
        gas: Math.ceil(gasNumber.toFixed()),
        gasPrice,
      })
      .on('transactionHash', (hash) => {
        if (this.onSigned) this.onSigned();
        resolve(hash);
      })
      .on('error', (err) => {
        if (this.onSigned) this.onSigned();
        reject(err);
      });
  });
  const txHash = await txEventEmitter;
  return {
    txHash,
    from,
    to,
    value,
  };
}

export function isStatusSuccess(status) {
  if (typeof status === 'string') {
    switch (status) {
      case '0x1':
      case '1':
      case 'true':
        return true;
      default:
        return false;
    }
  } else {
    return !!status;
  }
}

export async function waitForTxToBeMined(txHash) {
  if (!web3) initReadOnlyWeb3();
  let done = false;
  while (!done) {
    /* eslint-disable no-await-in-loop */
    await timeout(1000);
    const [t, txReceipt, currentBlockNumber] = await Promise.all([
      web3.eth.getTransaction(txHash),
      web3.eth.getTransactionReceipt(txHash),
      web3.eth.getBlockNumber(),
    ]);
    if (txReceipt && !isStatusSuccess(txReceipt.status)) throw new Error('Transaction failed');
    done = t && txReceipt && currentBlockNumber && t.blockNumber
      && (currentBlockNumber - t.blockNumber > ETH_CONFIRMATION_NEEDED);
  }
}
