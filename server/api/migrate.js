import { Router } from 'express';
import BigNumber from 'bignumber.js';
import {
  verifyTransferMigrationData,
  addMigrationTransferEthTx,
  findMigrationCosmosTxLog,
} from '../util/api/migrate';
import { getCosmosAccountLIKE, getCosmosDelegatorAddress } from '../util/cosmos';
import {
  PUBSUB_TOPIC_MISC,
} from '../constant';
import publisher from '../util/gcloudPub';

function isValidCosmosWallet(str) {
  return !!str.match(/^cosmos1[ac-hj-np-z02-9]{38}$/);
}

const router = Router();

router.get('/pending/cosmos/:cosmosWallet', async (req, res, next) => {
  try {
    const { cosmosWallet } = req.params;
    if (!isValidCosmosWallet(cosmosWallet)) {
      res.status(400).send('INVALID_COSMOS_WALLET');
      return;
    }
    const { eth_tx: ethMigrationTxHash } = req.query;
    if (!ethMigrationTxHash) {
      throw new Error('Missing migration hash');
    }
    const list = await findMigrationCosmosTxLog({
      to: cosmosWallet,
      ethMigrationTxHash,
    });
    res.json({ list });
  } catch (err) {
    next(err);
  }
});

router.get('/cosmos/:cosmosWallet', async (req, res, next) => {
  try {
    const { cosmosWallet } = req.params;
    if (!isValidCosmosWallet(cosmosWallet)) {
      res.status(400).send('INVALID_COSMOS_WALLET');
      return;
    }
    const value = await getCosmosAccountLIKE(cosmosWallet);
    res.json({ value });
  } catch (err) {
    next(err);
  }
});

router.post('/ledger', async (req, res, next) => {
  try {
    const {
      from,
      to,
      value,
      cosmosAddress,
      txHash,
    } = req.body;
    const address = await getCosmosDelegatorAddress();
    const migrateBalance = await getCosmosAccountLIKE(address);
    const migrationLimit = new BigNumber(migrateBalance)
      .multipliedBy(1e18)
      .toFixed();
    verifyTransferMigrationData({
      from, to, value,
    }, migrationLimit);
    const dbTxRecord = {
      from,
      to,
      value,
      txHash,
      cosmosAddress,
    };

    publisher.publish(PUBSUB_TOPIC_MISC, req, {
      ...dbTxRecord,
      logType: 'eventCosmosTokenMigrate',
      method: 'transfer',
    });
    await addMigrationTransferEthTx(dbTxRecord);
    res.send({ txHash });
  } catch (err) {
    next(err);
  }
});

export default router;
