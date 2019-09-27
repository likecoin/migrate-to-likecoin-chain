import axios from 'axios';
import { timeout } from './misc';

const api = axios.create({
  baseURL: '/api/proxy/cosmos/txs',
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function waitForTxToBeMined(txHash) {
  let done = false;
  while (!done) {
    /* eslint-disable no-await-in-loop */
    await timeout(1000);
    try {
      const { data } = await api.get(`/${txHash}`);
      console.log(data);
      if (data && data.height) {
        done = true;
        const {
          code,
          logs: [{ success = false } = {}] = [],
        } = data;
        const isFailed = (code && code !== '0') || !success;
        if (isFailed) throw new Error(code);
      }
    } catch (err) {
      console.error(err);
    }
  }
}

export default waitForTxToBeMined;
