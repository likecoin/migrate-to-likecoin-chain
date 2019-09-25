import { toBN } from 'web3-utils';
import { db, txCollection as dbRef } from '../firebase';
import { getTransfersFromReceipt, getTransactionReceipt } from '../web3';
import { sendCoin } from '../cosmos';

import {
  ETH_LOCK_ADDRESS,
  COSMOS_DENOM,
} from '../../config/config';

async function logCosmosTx(payload) {
  const { txHash } = payload;
  try {
    await dbRef.doc(txHash).create({
      type: 'cosmosTransfer',
      status: 'pending',
      ts: Date.now(),
      remarks: payload.memo || '',
      ...payload,
    });
  } catch (err) {
    console.error(err);
  }
}

function validateTransferInReceipt(receipt, { value }) {
  const transfers = getTransfersFromReceipt(receipt);
  const tx = transfers.some(
    (transfer) => (transfer.to.toLowerCase() === ETH_LOCK_ADDRESS.toLowerCase()
      && toBN(value).eq(toBN(transfer.value))),
  );
  return !!tx;
}

async function sendCosmosCoin(cosmosAddress, ercValue, { txHash: ethMigrationTxHash }) {
  // TODO: burn the LikeCoin (maybe in batch to save fee?)
  const cosmosValue = toBN(ercValue).div(toBN(1e9)).toNumber().toFixed(0);
  const amount = { amount: cosmosValue, denom: COSMOS_DENOM };
  const {
    txHash,
    pendingCount,
    tx,
  } = await sendCoin(cosmosAddress, amount);
  await logCosmosTx({
    type: 'cosmosTransfer',
    status: 'pending',
    ts: Date.now(),
    txHash,
    from: ETH_LOCK_ADDRESS,
    to: cosmosAddress,
    amount,
    nonce: pendingCount,
    ethMigrationTxHash,
    rawPayload: { tx },
  });
  return txHash;
}

export async function handleEthMigrateCosmos(doc) {
  const txHash = doc.id;
  const docRef = doc.ref;
  try {
    const dbData = await db.runTransaction(async (t) => {
      const txDoc = await t.get(doc.ref);
      const {
        isMigirating,
        cosmosMigrationTxHash,
        value,
        status,
        cosmosAddress,
      } = txDoc.data();
      if (isMigirating) throw new Error(`already handling ${txHash}`);
      if (cosmosMigrationTxHash) throw new Error(`${txHash} already sent in ${cosmosMigrationTxHash}`);
      if (status !== 'success') throw new Error(`tx ${txHash} not success`);
      docRef.update({ isMigirating: true });
      return {
        cosmosAddress,
        value,
      };
    });
    try {
      const {
        cosmosAddress,
        value,
      } = dbData;
      const receipt = await getTransactionReceipt(txHash);
      if (!validateTransferInReceipt(receipt, { value })) {
        throw new Error('transaction succeed but no wanted Transfer event in receipt');
      }
      const cosmosTxHash = await sendCosmosCoin(cosmosAddress, value, { txHash });
      await docRef.update({
        cosmosMigrationTxHash: cosmosTxHash,
        isMigirating: false,
      });
    } finally {
      // await docRef.update({ isMigirating: false });
      // TODO: handle error case
    }
  } catch (err) {
    console.error(err);
  }
}

export default handleEthMigrateCosmos;
