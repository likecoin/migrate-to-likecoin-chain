import Web3 from 'web3'
import { initWeb3, getLikeCoinInstance, sendSignedTransaction, getTransfersFromReceipt } from '../lib/eth'
import { init as cosmosInit, createSigner, sendCoin, Coin } from '../lib/cosmos'
import { addMigrationEthTx, subscriptMigrationEthTxConfirm, startPoller } from '../lib/database'
import * as config from '../config'
import { ETH_PRIVATE_KEY, COSMOS_PRIVATE_KEY } from './secret'

cosmosInit(config.COSMOS_ENDPOINT)
const cosmosSigner = createSigner(COSMOS_PRIVATE_KEY)
console.log(`cosmosSigner.address = ${cosmosSigner.cosmosAddress}`)

const web3 = new Web3(config.ETH_ENDPOINT)
initWeb3(web3)
const ethSigner = web3.eth.accounts.privateKeyToAccount(ETH_PRIVATE_KEY)
console.log(`ethSigner.address = ${ethSigner.address}`)

startPoller()

async function verifyMigrationData ({ from, to, value, maxReward, nonce, sig }) {
  if (to.toLowerCase() !== config.ETH_LOCK_ADDRESS.toLowerCase()) {
    throw new Error('Invalid to address')
  }
  if (web3.utils.toBN(value).lt(web3.utils.toBN(config.ETH_MIN_LIKECOIN_AMOUNT))) {
    throw new Error(`Invalid value, should be at least ${config.ETH_MIN_LIKECOIN_AMOUNT} * 1e-18 LikeCoin`)
  }
  const LikeCoin = getLikeCoinInstance()
  const methodCall = LikeCoin.methods.transferDelegated(from, to, value, maxReward, 0, nonce, sig)
  const gas = await methodCall.estimateGas({
    from: ethSigner.address,
    gas: 1000000
  })
  return {
    contract: LikeCoin.options.address,
    methodCall,
    gas
  }
}

export async function migrateHandler (req, res) {
  const { from, to, value, maxReward, nonce, sig, cosmosAddress } = req.body
  console.log({ from, to, value, maxReward, nonce, sig, cosmosAddress })
  const { contract, methodCall, gas } = await verifyMigrationData({ from, to, value, maxReward, nonce, sig })
  const callData = methodCall.encodeABI()
  // TODO: nonce calculation
  const signedTx = await ethSigner.signTransaction({
    to: contract,
    data: callData,
    // TODO: gasPrice
    gas: Number.parseInt(gas) * 2
  })
  const ethTxHash = await sendSignedTransaction(signedTx.rawTransaction)
  console.log(ethTxHash)
  const dbTxRecord = {
    from,
    value,
    ethTxHash,
    cosmosAddress
  }
  await addMigrationEthTx(dbTxRecord)
  res.send({ ethTxHash })
}

subscriptMigrationEthTxConfirm(migrationAfterEthTx)

function validateTransferInReceipt (receipt, dbTxRecord) {
  const transfers = getTransfersFromReceipt(receipt)
  for (const transfer of transfers) {
    console.log(transfer)
    console.log(`transfer.to.toLowerCase() ===             ${transfer.to.toLowerCase()}`)
    console.log(`config.ETH_LOCK_ADDRESS.toLowerCase() === ${config.ETH_LOCK_ADDRESS.toLowerCase()}`)
    console.log(`transfer.value === ${transfer.value}`)
    console.log(`web3.utils.toBN(transfer.value) ===   ${web3.utils.toBN(transfer.value).toString()}`)
    console.log(`web3.utils.toBN(dbTxRecord.value) === ${web3.utils.toBN(dbTxRecord.value).toString()}`)
    if (transfer.to.toLowerCase() === config.ETH_LOCK_ADDRESS.toLowerCase() && web3.utils.toBN(dbTxRecord.value).eq(web3.utils.toBN(transfer.value))) {
      return true
    }
  }
  return false
}

async function migrationAfterEthTx (dbTxRecord, receipt) {
  console.log('In migrationAfterEthTx')
  console.log('dbTxRecord: ', dbTxRecord)
  console.log('receipt: ', receipt)
  if (!validateTransferInReceipt(receipt, dbTxRecord)) {
    throw new Error('transaction succeed but no wanted Transfer event in receipt')
  }
  const { value: ercValue, cosmosAddress } = dbTxRecord
  // TODO: burn the LikeCoin (maybe in batch to save fee?)
  const cosmosValue = web3.utils.toBN(ercValue).div(web3.utils.toBN(1e9)).toNumber().toFixed(0)
  const coin = new Coin(cosmosValue, config.COSMOS_DENOM)
  const cosmosTxHash = await sendCoin(cosmosSigner, cosmosAddress, coin)
  console.log(`Send Cosmos tx: ${cosmosTxHash}`)
}
