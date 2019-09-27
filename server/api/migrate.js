import { Router } from 'express';
import { toChecksumAddress } from 'web3-utils';
import {
  verifyMigrationData,
  addMigrationEthTx,
  findMigrationEthTxLog,
  findMigrationCosmosTxLog,
} from '../util/api/migrate';
import { sendTransactionWithLoop } from '../util/web3';
import { getCosmosAccountLIKE } from '../util/cosmos';
// import { publisher } from '../util/gcloudPub';

const router = Router();

router.get('/pending/eth/:ethWallet', async (req, res, next) => {
  try {
    const { ethWallet } = req.params;
    const list = await findMigrationEthTxLog({ from: ethWallet });
    res.json({ list });
  } catch (err) {
    next(err);
  }
});

router.get('/pending/cosmos/:cosmosWallet', async (req, res, next) => {
  try {
    const { cosmosWallet } = req.params;
    const list = await findMigrationCosmosTxLog({ to: cosmosWallet });
    res.json({ list });
  } catch (err) {
    next(err);
  }
});

router.get('/cosmos/:cosmosWallet', async (req, res, next) => {
  try {
    const { cosmosWallet } = req.params;
    const value = await getCosmosAccountLIKE(cosmosWallet);
    res.json({ value });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      from, to, value, maxReward, nonce, sig, cosmosAddress,
    } = req.body;
    const {
      address,
      methodCall,
      gas,
    } = await verifyMigrationData({
      from, to, value, maxReward, nonce, sig,
    });
    const txData = methodCall.encodeABI();
    const {
      tx,
      txHash,
      pendingCount,
      // gasPrice,
      delegatorAddress,
    } = await sendTransactionWithLoop(
      address,
      txData,
      { gas: Math.floor(gas * 1.5) },
    );

    const dbTxRecord = {
      from,
      to,
      value,
      txHash,
      nonce: pendingCount,
      cosmosAddress,
      rawSignedTx: tx.rawTransaction,
      delegatorAddress: toChecksumAddress(delegatorAddress),
    };

    // publisher.publish(PUBSUB_TOPIC_MISC, req, dbTxRecord);

    await addMigrationEthTx(dbTxRecord);
    res.send({ txHash });
  } catch (err) {
    next(err);
  }
});

export default router;
