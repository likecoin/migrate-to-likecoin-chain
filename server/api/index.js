import proxy from 'express-http-proxy';
import { Router } from 'express';
import { COSMOS_ENDPOINT } from '../config/config';

import migrate from './migrate';

const router = Router();

router.use('/proxy/cosmos/', proxy(COSMOS_ENDPOINT));
router.use('/migrate', migrate);

export default router;
