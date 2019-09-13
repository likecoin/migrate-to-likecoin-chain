import createHash from 'create-hash'
import { createSigner } from './cosmos'
import { sleep } from './utils'
import { getTransactionReceipt } from './eth'

let migrationEthTxCallback = null

export function getCosmosAddrFromEthAddr (ethAddr) {
  // FIXME:
  // This function should query database to get the mapping
  // The implementation below is just for demonstration
  const sha256 = createHash('sha256')
  sha256.update(Buffer.from(ethAddr.toLowerCase()), 'ascii')
  const privKey = sha256.digest()
  const { cosmosAddress } = createSigner(privKey)
  return cosmosAddress
}

export function subscriptMigrationEthTxConfirm (callback) {
  // FIXME:
  // This function should subscribe the database, and call the callback when poller confirmed the transaction.
  migrationEthTxCallback = callback
}

export function addMigrationEthTx (tx) {
  // FIXME:
  // This function should push the tx into the database so the poller service will be able to poll the transaction.
  pollerList.push(tx)
}

// FIXME:
// The code below is implementing a poller service, which should be in a separate service in production.

const pollerList = []

function isStatusSuccess (status) {
  if (typeof status === 'string') {
    switch (status) {
      case '0x1':
      case '1':
      case 'true':
        return true
      default:
        return false
    }
  } else {
    return !!status
  }
}

async function pollTx (record) {
  const receipt = await getTransactionReceipt(record.ethTxHash)
  if (!receipt) {
    // pending
    console.log(`Eth tx ${record.ethTxHash} still pending or not enough confirmations`)
    pollerList.push(record)
    return
  }
  if (!isStatusSuccess(receipt.status)) {
    // failed
    // TODO: log?
    console.error(`Eth tx ${receipt.transactionHash} failed, receipt: `, receipt)
    return
  }
  // success
  console.log(`Eth tx ${record.ethTxHash} succeeded, calling migrationEthTxCallback`)
  migrationEthTxCallback(record, receipt)
}

export async function startPoller () {
  while (true) {
    const head = pollerList.shift()
    if (head) {
      await pollTx(head)
    }
    await sleep(15000)
  }
}
