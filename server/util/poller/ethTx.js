import { toBN } from 'web3-utils';
import { db, txCollection as dbRef } from '../firebase';
import { getTransfersFromReceipt, getTransactionReceipt } from '../web3';
import { sendCoin } from '../cosmos';
import { timeout } from '../misc';
import { isSameEthAddress } from '../../common/util/web3';

import { ETH_LOCK_ADDRESS } from '../../constant';
import { COSMOS_DENOM } from '../../config/config';

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
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

function validateTransferInReceipt(receipt, { value }) {
  const transfers = getTransfersFromReceipt(receipt);
  const tx = transfers.some(
    (transfer) => (isSameEthAddress(transfer.to, ETH_LOCK_ADDRESS)
      && toBN(value).eq(toBN(transfer.value))),
  );
  return !!tx;
}

async function sendCosmosCoin(cosmosAddress, ercValue, { txHash: ethMigrationTxHash }) {
  // TODO: burn the LikeCoin (maybe in batch to save fee?)
  const cosmosValue = toBN(ercValue).div(toBN(1e9)).toString(10);
  const amount = { amount: cosmosValue, denom: COSMOS_DENOM };
  const {
    tx,
    txHash,
    pendingCount,
    delegatorAddress,
  } = await sendCoin(cosmosAddress, amount);
  await logCosmosTx({
    txHash,
    from: delegatorAddress,
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
        isMigrating,
        cosmosMigrationTxHash,
        value,
        status,
        cosmosAddress,
      } = txDoc.data();
      if (isMigrating) {
        console.log(`already handling ${txHash}`);
        return null;
      }
      if (cosmosMigrationTxHash) throw new Error(`${txHash} already sent in ${cosmosMigrationTxHash}`);
      if (status !== 'success') throw new Error(`tx ${txHash} not success`);
      docRef.update({ isMigrating: true });
      return {
        cosmosAddress,
        value,
      };
    });
    if (dbData) {
      try {
        const {
          cosmosAddress,
          value,
        } = dbData;
        const receipt = await getTransactionReceipt(txHash);
        if (!receipt) {
          // TODO: wait for receipt to appear
          console.log(`No receipt: ${txHash}`);
          await timeout(60000);
          await docRef.update({
            isMigrating: false,
          });
          return;
        }
        if (!validateTransferInReceipt(receipt, { value })) {
          throw new Error('transaction succeed but no wanted Transfer event in receipt');
        }
        const cosmosTxHash = await sendCosmosCoin(cosmosAddress, value, { txHash });
        await docRef.update({
          cosmosMigrationTxHash: cosmosTxHash,
          isMigrating: false,
        });
      } finally {
        // await docRef.update({ isMigrating: false });
        // TODO: handle error case
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

export default handleEthMigrateCosmos;
