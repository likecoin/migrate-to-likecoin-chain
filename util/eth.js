import BigNumber from 'bignumber.js';
import Web3 from 'web3';

import {
  ETH_LOCK_ADDRESS,
  ETH_CONFIRMATION_NEEDED,
  ETH_ENDPOINT,
  IS_TESTNET,
} from '../constant';
import { LIKE_COIN_ABI, LIKE_COIN_ADDRESS } from '../common/constant/contract/likecoin';
import { timeout } from '../common/util/misc';
import { isStatusSuccess } from '../common/util/web3';

let web3 = null;
let LikeCoin = null;
let readWeb3 = null;
let readLikeCoin = null;

export async function getWeb3Provider() {
  let provider;
  if (window.ethereum) {
    await window.ethereum.enable();
    provider = window.ethereum;
  } if (window.web3) {
    provider = window.web3.currentProvider;
  }
  return provider;
}

export function initReadOnlyWeb3() {
  readWeb3 = new Web3(new Web3.providers.HttpProvider(ETH_ENDPOINT));
  readLikeCoin = new readWeb3.eth.Contract(LIKE_COIN_ABI, LIKE_COIN_ADDRESS);
  return readWeb3;
}

export function initWindowWeb3(provider) {
  web3 = new Web3(provider);
  LikeCoin = new web3.eth.Contract(LIKE_COIN_ABI, LIKE_COIN_ADDRESS);
  return web3;
}

export function getLikeCoinInstance() {
  return LikeCoin;
}

export function getLikeCoinBalance(address) {
  if (!readLikeCoin) initReadOnlyWeb3();
  return readLikeCoin.methods.balanceOf(address).call();
}

export async function checkNetwork() {
  const network = await web3.eth.net.getNetworkType();
  const target = (IS_TESTNET ? 'rinkeby' : 'main');
  if (network !== target) throw new Error(`Please switch to ${target} network`);
}

export async function getFromAddr() {
  const accounts = await web3.eth.getAccounts();
  if (!accounts || !accounts.length) throw new Error('Cannot get eth address, please unlock MetaMask');
  return accounts[0];
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
        resolve(hash);
      })
      .on('error', (err) => {
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

export async function waitForTxToBeMined(txHash) {
  if (!readWeb3) initReadOnlyWeb3();
  let done = false;
  while (!done) {
    /* eslint-disable no-await-in-loop */
    const txReceipt = await readWeb3.eth.getTransactionReceipt(txHash);
    if (txReceipt && !isStatusSuccess(txReceipt.status)) throw new Error('Transaction failed');
    if (txReceipt) {
      const [t, currentBlockNumber] = await Promise.all([
        readWeb3.eth.getTransaction(txHash),
        readWeb3.eth.getBlockNumber(),
      ]);
      done = t && txReceipt && currentBlockNumber && t.blockNumber
        && (currentBlockNumber - t.blockNumber > ETH_CONFIRMATION_NEEDED);
    }
    if (!done) await timeout(10000);
  }
}
