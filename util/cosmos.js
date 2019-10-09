import axios from 'axios';
import { timeout } from './misc';

const api = axios.create({
  baseURL: '/api/proxy/cosmos/txs',
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function waitForTxToBeMined(txHash) {
  let tx;
  while (!tx) {
    /* eslint-disable no-await-in-loop */
    await timeout(1000);
    try {
      const { data } = await api.get(`/${txHash}`);
      if (data && data.height) {
        ({ tx } = data);
        const {
          code,
          logs: [{ success = false } = {}] = [],
        } = data;
        const isFailed = (code && code !== '0') || !success;
        if (isFailed) throw new Error(code);
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  return tx;
}

export default waitForTxToBeMined;
