import {
  init as cosmosInit, createSigner, sendCoin, Coin,
} from '../lib/cosmos';
import { subscriptMigrationEthTxConfirm, startPoller } from '../lib/database';
import { getTransfersFromReceipt } from '../lib/eth';
import * as config from '../config';
import { COSMOS_PRIVATE_KEY } from './secret';

cosmosInit(config.COSMOS_ENDPOINT);
const cosmosSigner = createSigner(COSMOS_PRIVATE_KEY);
console.log(`cosmosSigner.address = ${cosmosSigner.cosmosAddress}`);


startPoller();


subscriptMigrationEthTxConfirm(migrationAfterEthTx);

function validateTransferInReceipt(receipt, dbTxRecord) {
  const transfers = getTransfersFromReceipt(receipt);
  for (const transfer of transfers) {
    console.log(transfer);
    console.log(`transfer.to.toLowerCase() ===             ${transfer.to.toLowerCase()}`);
    console.log(`config.ETH_LOCK_ADDRESS.toLowerCase() === ${config.ETH_LOCK_ADDRESS.toLowerCase()}`);
    console.log(`transfer.value === ${transfer.value}`);
    console.log(`web3.utils.toBN(transfer.value) ===   ${web3.utils.toBN(transfer.value).toString()}`);
    console.log(`web3.utils.toBN(dbTxRecord.value) === ${web3.utils.toBN(dbTxRecord.value).toString()}`);
    if (transfer.to.toLowerCase() === config.ETH_LOCK_ADDRESS.toLowerCase() && web3.utils.toBN(dbTxRecord.value).eq(web3.utils.toBN(transfer.value))) {
      return true;
    }
  }
  return false;
}

async function migrationAfterEthTx(dbTxRecord, receipt) {
  console.log('In migrationAfterEthTx');
  console.log('dbTxRecord: ', dbTxRecord);
  console.log('receipt: ', receipt);
  if (!validateTransferInReceipt(receipt, dbTxRecord)) {
    throw new Error('transaction succeed but no wanted Transfer event in receipt');
  }
  const { value: ercValue, cosmosAddress } = dbTxRecord;
  // TODO: burn the LikeCoin (maybe in batch to save fee?)
  const cosmosValue = web3.utils.toBN(ercValue).div(web3.utils.toBN(1e9)).toNumber().toFixed(0);
  const coin = new Coin(cosmosValue, config.COSMOS_DENOM);
  const cosmosTxHash = await sendCoin(cosmosSigner, cosmosAddress, coin);
  console.log(`Send Cosmos tx: ${cosmosTxHash}`);
}
