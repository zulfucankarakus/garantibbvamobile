import api from '../config/api';

export const getTransactions = async (limit = 50) => {
  const response = await api.get(`/transactions?limit=${limit}`);
  return response.data;
};

export const createTransaction = async (transactionData) => {
  const response = await api.post('/transactions', transactionData);
  return response.data;
};
