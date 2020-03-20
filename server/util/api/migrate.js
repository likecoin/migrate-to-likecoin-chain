import { toBN } from 'web3-utils';
import { txCollection as dbRef } from '../firebase';
import { prepareWeb3Payload } from '../web3';
import { getCosmosDelegatorAddress } from '../cosmos';
import {
  ETH_LOCK_ADDRESS,
  ETH_MIN_LIKECOIN_AMOUNT,
} from '../../constant';

export function verifyMigrationData({
  from, to, value, maxReward, nonce, sig,
}, migrationLimit) {
  if (to.toLowerCase() !== ETH_LOCK_ADDRESS.toLowerCase()) {
    throw new Error(`Invalid to address ${to}`);
  }
  if (toBN(value).lt(toBN(ETH_MIN_LIKECOIN_AMOUNT))) {
    throw new Error(`Invalid value ${value}, should be at least ${ETH_MIN_LIKECOIN_AMOUNT} * 1e-18 LikeCoin`);
  }
  if (toBN(value).gt(toBN(migrationLimit))) {
    throw new Error(`Value ${value} too large for migration`);
  }
  return prepareWeb3Payload({
    from, to, value, maxReward, nonce, sig,
  });
}

export function verifyTransferMigrationData({ to, value }, migrationLimit) {
  if (to.toLowerCase() !== ETH_LOCK_ADDRESS.toLowerCase()) {
    throw new Error(`Invalid to address ${to}`);
  }
  if (toBN(value).gt(toBN(migrationLimit))) {
    throw new Error(`Value ${value} too large for migration`);
  }
}

export async function addMigrationEthTx(payload) {
  const { txHash } = payload;
  try {
    await dbRef.doc(txHash).create({
      type: 'transferDelegated',
      status: 'pending',
      ts: Date.now(),
      cosmosMigrationTxHash: '',
      ...payload,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

export async function addMigrationTransferEthTx(payload) {
  const { txHash } = payload;
  try {
    await dbRef.doc(txHash).create({
      type: 'transfer',
      status: 'pending',
      ts: Date.now(),
      cosmosMigrationTxHash: '',
      ...payload,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

export async function findMigrationCosmosTxLog({ to, ethMigrationTxHash }) {
  const from = getCosmosDelegatorAddress();
  const pending = await dbRef
    .where('from', '==', from)
    .where('to', '==', to)
    .where('type', '==', 'cosmosTransfer')
    .where('ethMigrationTxHash', '==', ethMigrationTxHash)
    .orderBy('ts', 'desc')
    .limit(1)
    .get();
  return pending.docs.map((d) => {
    const {
      status,
      amount,
      ts,
      competeTs,
    } = d.data();
    return {
      txHash: d.id,
      status,
      amount,
      ts,
      competeTs,
    };
  });
}
