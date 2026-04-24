import api from '../config/api';

export const getAccounts = async () => {
  const response = await api.get('/accounts');
  return response.data;
};

export const createAccount = async (accountData) => {
  const response = await api.post('/accounts', accountData);
  return response.data;
};

export const addBalanceToAccount = async (accountId, amount) => {
  const response = await api.post(`/accounts/${accountId}/add-balance`, null, {
    params: { amount }
  });
  return response.data;
};

export const deleteAccount = async (accountId, targetAccountId = null) => {
  const params = targetAccountId ? { target_account_id: targetAccountId } : {};
  const response = await api.delete(`/accounts/${accountId}`, { params });
  return response.data;
};

export const getAccountTransactions = async (accountId) => {
  const response = await api.get(`/transactions/account/${accountId}`);
  return response.data;
};
