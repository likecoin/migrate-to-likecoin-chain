import proxy from 'express-http-proxy';
import { Router } from 'express';
import { COSMOS_ENDPOINT } from '../config/config';

import migrate from './migrate';

const router = Router();

router.use('/proxy/cosmos/txs', proxy(COSMOS_ENDPOINT, {
  proxyReqPathResolver: (req) => {
    const parts = req.url.split('?');
    const queryString = parts[1];
    const updatedPath = `/txs${parts[0]}`;
    return updatedPath + (queryString ? `?${queryString}` : '');
  },
  proxyReqBodyDecorator: (bodyContent, srcReq) => {
    // google does not like GET having body
    if (srcReq.method === 'GET') return '';
    return bodyContent;
  },
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
