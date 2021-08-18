import proxy from 'express-http-proxy';
import { Router } from 'express';
import { COSMOS_RPC_ENDPOINT } from '../config/config';

import migrate from './migrate';

const router = Router();

let proxyPath = '';
try {
  const urlObj = new URL(COSMOS_RPC_ENDPOINT);
  proxyPath = urlObj.pathname;
  proxyPath = proxyPath.slice(0, proxyPath.length - 1);
} catch (err) {
  console.error(err);
}

router.use('/proxy/cosmos/rpc', proxy(COSMOS_RPC_ENDPOINT, {
  proxyReqPathResolver: (req) => `${proxyPath}${req.path}`,
}));
router.use('/migrate', migrate);
router.use((err, req, res, next) => {
  const msg = (err.response && err.response.data) || err.message || err;
  console.error(msg);
  if (res.headersSent) {
    return next(err);
  }
  res.set('Content-Type', 'text/plain');
  return res.status(400).send(msg);
});

export default router;
