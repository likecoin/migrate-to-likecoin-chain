import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiPostMigration = (payload) => api.post('/migrate', payload);

export const apiGetPendingEthMigration = (address) => api.get(`/migrate/pending/eth/${address}`);
export const apiGetPendingCosmosMigration = (address) => api.get(`/migrate/pending/cosmos/${address}`);

export const apiGetCosmosBalance = (address) => api.get(`/migrate/cosmos/${address}`);
