import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiPostMigration = (payload) => api.post('/migrate', payload);

export const apiGetPendingMigration = (address) => api.get(`/migrate/pending/${address}`);

export const apiGetCosmosBalance = (address) => api.get(`/migrate/cosmos/${address}`);
