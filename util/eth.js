import { ETH_LOCK_ADDRESS } from '../config/config';
import { LIKE_COIN_ABI, LIKE_COIN_ADDRESS } from '../constant/contract/likecoin';

let web3 = null;
let LikeCoin = null;

export function initWeb3(newWeb3) {
  web3 = newWeb3;
  LikeCoin = new web3.eth.Contract(LIKE_COIN_ABI, LIKE_COIN_ADDRESS);
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
