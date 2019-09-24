import proxy from 'express-http-proxy';
import { Router } from 'express';
import { COSMOS_ENDPOINT } from '../config/config';

import migrate from './migrate';

const router = Router();

router.use('/proxy/cosmos/', proxy(COSMOS_ENDPOINT));
router.use('/migrate', migrate);
router.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  const msg = (err.response && err.response.data) || err.message || err;
  res.set('Content-Type', 'text/plain');
  return res.status(400).send(msg);
});

export default router;
