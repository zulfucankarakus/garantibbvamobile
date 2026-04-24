import api from '../config/api';

export const getCards = async () => {
  const response = await api.get('/cards');
  return response.data;
};

export const createCard = async (cardData) => {
  const response = await api.post('/cards', cardData);
  return response.data;
};

export const createDebitCardWithAccount = async (cardData) => {
  const response = await api.post('/cards/debit-with-account', cardData);
  return response.data;
};

export const getCardTransactions = async (cardId) => {
  const response = await api.get(`/cards/${cardId}/transactions`);
  return response.data;
};

export const deleteCard = async (cardId) => {
  const response = await api.delete(`/cards/${cardId}`);
  return response.data;
};
