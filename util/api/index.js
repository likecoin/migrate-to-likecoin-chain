import axios from 'axios';
import { LIKECOIN_API_HOST } from '../../constant';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiGetLikerId = (id) => api.get(`${LIKECOIN_API_HOST}/users/id/${id}/min`);
export const apiPostMigration = (payload) => api.post('/migrate', payload);
export const apiPostTransferMigration = (payload) => api.post('/migrate/ledger', payload);

export const apiGetPendingCosmosMigration = (address) => api.get(`/migrate/pending/cosmos/${address}`);

export const apiGetCosmosBalance = (address) => api.get(`/migrate/cosmos/${address}`);
