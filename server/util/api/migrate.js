import { toBN } from 'web3-utils';
import { txCollection as dbRef } from '../firebase';
import { prepareWeb3Payload } from '../web3';
import {
  ETH_LOCK_ADDRESS,
  ETH_MIN_LIKECOIN_AMOUNT,
} from '../../config/config';

export function verifyMigrationData({
  from, to, value, maxReward, nonce, sig,
}) {
  if (to.toLowerCase() !== ETH_LOCK_ADDRESS.toLowerCase()) {
    throw new Error('Invalid to address');
  }
  if (toBN(value).lt(toBN(ETH_MIN_LIKECOIN_AMOUNT))) {
    throw new Error(`Invalid value, should be at least ${ETH_MIN_LIKECOIN_AMOUNT} * 1e-18 LikeCoin`);
  }
  return prepareWeb3Payload({
    from, to, value, maxReward, nonce, sig,
  });
}

export async function addMigrationEthTx(payload) {
  const { txHash } = payload;
  try {
    await dbRef.doc(txHash).create({
      type: 'transferDelegated',
      status: 'pending',
      ts: Date.now(),
      ...payload,
    });
  } catch (err) {
    console.error(err);
  }
}

export async function findMigrationEthTxLog({ from }) {
  const pending = await dbRef
    .where('from', '==', from)
    .where('to', '==', ETH_LOCK_ADDRESS)
    .where('type', '==', 'transferDelegated')
    .get();
  return pending.docs.map((d) => {
    const { status, value, ts } = d;
    return { status, value, ts };
  });
}