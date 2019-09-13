import * as config from '../config'
import { abi } from './contract.json'

let web3 = null
let LikeCoin = null

export function initWeb3 (newWeb3) {
  web3 = newWeb3
  LikeCoin = new web3.eth.Contract(abi, config.ETH_CONTRACT_ADDRESS)
}

export function getLikeCoinInstance () {
  return LikeCoin
}

export function getLikeCoinBalance (address) {
  return LikeCoin.methods.balanceOf(address).call()
}

export async function getTransactionReceipt (txHash) {
  const currentBlock = await web3.eth.getBlockNumber()
  const receipt = await web3.eth.getTransactionReceipt(txHash)
  if (!receipt || currentBlock < receipt.blockNumber + config.ETH_CONFIRMATION_NEEDED) {
    return null
  }
  return receipt
}

export function getTransfersFromReceipt (receipt) {
  const inputs = abi.filter(entity => entity.name === 'Transfer' && entity.type === 'event')[0].inputs
  return receipt.logs
    .filter(log => log.address.toLowerCase() === config.ETH_CONTRACT_ADDRESS.toLowerCase())
    .map(log => web3.eth.abi.decodeLog(inputs, log.data, log.topics.slice(1)))
}

export async function getFromAddr () {
  return (await web3.eth.getAccounts())[0]
}

function signTyped (msg, from) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      method: 'eth_signTypedData',
      params: [msg, from],
      from
    }, (err, response) => {
      if (err) {
        reject(err)
      } else {
        resolve(response.result)
      }
    })
  })
}

export async function signMigration (from, value) {
  const contract = config.ETH_CONTRACT_ADDRESS
  const to = config.ETH_LOCK_ADDRESS
  const nonce = web3.utils.randomHex(32)
  const maxReward = '0'
  const msg = [
    {
      type: 'address',
      name: 'contract',
      value: contract
    },
    {
      type: 'string',
      name: 'method',
      value: 'transferDelegated'
    },
    {
      type: 'address',
      name: 'to',
      value: to
    },
    {
      type: 'uint256',
      name: 'value',
      value
    },
    {
      type: 'uint256',
      name: 'maxReward',
      value: maxReward
    },
    {
      type: 'uint256',
      name: 'nonce',
      value: nonce
    }
  ]
  const sig = await signTyped(msg, from)
  return {
    contract,
    from,
    to,
    value,
    maxReward,
    nonce,
    sig
  }
}

export function sendSignedTransaction (rawTx) {
  return new Promise((resolve, reject) => {
    web3.eth.sendSignedTransaction(rawTx)
      .on('transactionHash', resolve)
      .on('error', reject)
  })
}
