import { Nuxt, Builder } from 'nuxt';
import express from 'express';
import consola from 'consola';
import bodyParser from 'body-parser';

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
  // Init Nuxt.js
  const nuxt = new Nuxt(config);

  const { host, port } = nuxt.options.server;

  // Build only in dev mode
  if (config.dev) {
    const builder = new Builder(nuxt);
    await builder.build();
  } else {
    await nuxt.ready();
  }

  app.use(bodyParser.json());
  app.use('/api', api);

  // Give nuxt middleware to express
  app.use(nuxt.render);

  // Listen the server
  app.listen(port, host);
  consola.ready({
    message: `Server listening on http://${host}:${port}`,
    badge: true,
  });
}
start();
