import { Nuxt, Builder } from 'nuxt';
import express from 'express';
import helmet from 'helmet';
import consola from 'consola';
import bodyParser from 'body-parser';
import path from 'path';

// Import and Set Nuxt.js options
import * as config from '../nuxt.config';
import api from './api';
import {
  startPoller as startEthTxPoller,
  setEthTxHandler,
} from './poller/ethTx';
import { startPoller as startGasPoller } from './poller/gas';
import { handleEthMigrateCosmos } from './util/poller/ethTx';

config.dev = process.env.NODE_ENV !== 'production';

startGasPoller();
setEthTxHandler(handleEthMigrateCosmos);
startEthTxPoller();

const app = express();

async function start() {
  app.use(helmet());
  app.use(bodyParser.json());
  app.use('/api', api);
  app.get('/healthz', (req, res) => {
    res.sendStatus(200);
  });

  // Give nuxt middleware to express
  if (process.env.NODE_ENV !== 'production') {
    // Init Nuxt.js
    const nuxt = new Nuxt(config);
    // Build only in dev mode
    if (config.dev) {
      const builder = new Builder(nuxt);
      await builder.build();
    } else {
      await nuxt.ready();
    }
    app.use(nuxt.render);
  } else {
    app.use(express.static(path.resolve(__dirname, '../dist')));
    app.get('/', (req, res) => {
      res.sendFile(path.resolve(__dirname, '../dist/index.html'));
    });
  }

  // Listen the server
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || 'localhost';
  app.listen(port, host);
  consola.ready({
    message: `Server listening on http://${host}:${port}`,
    badge: true,
  });
}
start();
