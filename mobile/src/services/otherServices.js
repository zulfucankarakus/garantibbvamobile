import api from '../config/api';

export const search = async (query) => {
  const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
  return response.data;
};

export const getStatusOverview = async () => {
  const response = await api.get('/status/overview');
  return response.data;
};

export const getApplications = async () => {
  const response = await api.get('/applications');
  return response.data;
};

export const getFinancialGoals = async (status = null) => {
  const url = status ? `/financial-goals?status=${status}` : '/financial-goals';
  const response = await api.get(url);
  return response.data;
};

export const createFinancialGoal = async (goalData) => {
  const response = await api.post('/financial-goals', goalData);
  return response.data;
};

export const getMarketData = async () => {
  const timestamp = Date.now();
  const response = await api.get(`/market-data?_t=${timestamp}`);
  return response.data;
};

export const getCreditScore = async () => {
  const response = await api.get('/credit/score');
  return response.data;
};
