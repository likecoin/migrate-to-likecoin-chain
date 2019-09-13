import axios from 'axios'
import createHash from 'create-hash'
import secp256k1 from 'secp256k1'
import bech32 from 'bech32'
import jsonStringify from 'fast-json-stable-stringify'

import * as config from '../config'

let api = null

export function init (endpoint) {
  api = axios.create({
    baseURL: endpoint,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export class Coin {
  constructor (amount, denom) {
    this.amount = amount
    this.denom = denom
  }
  toString () {
    return `${this.amount}${this.denom}`
  }
}

export function createSigner (privateKey) {
  const publicKey = secp256k1.publicKeyCreate(privateKey, true)
  const sha256 = createHash('sha256')
  const ripemd = createHash('ripemd160')
  sha256.update(publicKey)
  ripemd.update(sha256.digest())
  const rawAddr = ripemd.digest()
  const cosmosAddress = bech32.encode('cosmos', bech32.toWords(rawAddr))
  const sign = (msg) => {
    const msgSha256 = createHash('sha256')
    msgSha256.update(msg)
    const msgHash = msgSha256.digest()
    const { signature } = secp256k1.sign(msgHash, privateKey)
    return { signature, publicKey }
  }
  return { cosmosAddress, sign }
}

export async function getAccountInfo (address) {
  const res = await api.get(`/auth/accounts/${address}`)
  if (res.status !== 200) {
    throw new Error(`Response failed with status ${res.status}: ${res.statusText}`)
  }
  console.log(res.data)
  if (res.data.result) {
    return res.data.result.value
  }
  return res.data.value
}

export async function sendCoins (signer, targets, providedSeq) {
  const msg = targets.map(target => ({
    type: 'cosmos-sdk/MsgSend',
    value: {
      from_address: signer.cosmosAddress,
      to_address: target.toAddress,
      amount: [target.coin]
    }
  }))
  const gas = (30000 * targets.length).toString()
  const stdTx = {
    msg,
    fee: { amount: null, gas },
    memo: ''
  }
  const { sequence, account_number: accNum } = await getAccountInfo(signer.cosmosAddress)
  const signMessage = jsonStringify({
    fee: { amount: [], gas },
    msgs: stdTx.msg,
    chain_id: config.COSMOS_CHAIN_ID,
    account_number: accNum,
    sequence: providedSeq || sequence,
    memo: stdTx.memo
  })
  const { signature, publicKey } = signer.sign(Buffer.from(signMessage, 'utf-8'))
  stdTx.signatures = [{
    signature: signature.toString('base64'),
    account_number: accNum,
    sequence: providedSeq || sequence,
    pub_key: {
      type: 'tendermint/PubKeySecp256k1',
      value: publicKey.toString('base64')
    }
  }]
  const res = await api.post('/txs', {
    tx: stdTx,
    mode: 'sync'
  })
  if (res.data.code) {
    throw new Error(res.data.raw_log)
  }
  return res.data.txhash
}

export function sendCoin (signer, toAddress, coin, providedSeq) {
  return sendCoins(signer, [{ toAddress, coin }], providedSeq)
}
