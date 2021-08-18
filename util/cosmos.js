/* eslint-disable import/no-extraneous-dependencies */
import { StargateClient } from '@cosmjs/stargate';
import { decodeTxRaw } from '@cosmjs/proto-signing';
import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx';

import { COSMOS_ENDPOINT } from '../server/config/config';
import { timeout } from '../common/util/misc';

export async function waitForTxToBeMined(txHash) {
  let msg;
  let notFoundOnce = false;
  const client = await StargateClient.connect(COSMOS_ENDPOINT);
  while (!msg) {
    /* eslint-disable no-await-in-loop */
    await timeout(1000);
    try {
      const data = await client.getTx(txHash);
      if (data) {
        const { code, tx } = data;
        if (code) throw new Error(code);
        const { body } = decodeTxRaw(tx);
        msg = MsgSend.decode(body.messages[0].value);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      if (notFoundOnce) throw err;
      notFoundOnce = true;
      await timeout(12000); // wait for 2 block + 2s
    }
  }
  return msg;
}

export default waitForTxToBeMined;
