import axios from 'axios';
import BigNumber from 'bignumber.js';

import {
  COSMOS_ENDPOINT as cosmosLCDEndpoint,
  COSMOS_DENOM,
} from '../config/config';

const api = axios.create({
  baseURL: cosmosLCDEndpoint,
  headers: {
    'Content-Type': 'application/json',
  },
});

function LIKEToNanolike(value) {
  return (new BigNumber(value)).multipliedBy(1e9).toFixed();
}

export function LIKEToAmount(value) {
  return { denom: COSMOS_DENOM, amount: LIKEToNanolike(value) };
}
export function amountToLIKE(likecoin) {
  if (likecoin.denom === 'nanolike') {
    return (new BigNumber(likecoin.amount)).dividedBy(1e9).toFixed();
  }
  console.error(`${likecoin.denom} is not supported denom`);
  return -1;
}

export async function getCosmosAccountLIKE(address) {
  const { data } = await api.get(`/auth/accounts/${address}`);
  const likecoin = data.coins.find((c) => c.denom === COSMOS_DENOM);
  return likecoin ? amountToLIKE(likecoin) : 0;
}