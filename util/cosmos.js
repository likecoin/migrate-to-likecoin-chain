import { StargateClient } from '@cosmjs/stargate';

import { COSMOS_ENDPOINT } from '../server/config/config';
import { timeout } from '../common/util/misc';

export default async function waitForTxToBeMined(txHash) {
  let tx;
  let notFoundOnce = false;
  const client = await StargateClient.connect(COSMOS_ENDPOINT);
  while (!tx) {
    /* eslint-disable no-await-in-loop */
    await timeout(1000);
    try {
      const data = await client.getTx(txHash);
      if (data) {
        ({ tx } = data);
        const { code } = data;
        if (code) throw new Error(code);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      if (notFoundOnce) throw err;
      notFoundOnce = true;
      await timeout(12000); // wait for 2 block + 2s
    }
  }
  return tx;
}
