import api from '../config/api';

export const generateQRCode = async (qrData) => {
  const response = await api.post('/qr/generate', qrData);
  return response.data;
};

export const payWithQR = async (paymentData) => {
  const response = await api.post('/qr/pay', paymentData);
  return response.data;
};

export const searchAccount = async (query) => {
  const response = await api.post('/accounts/search', { query });
  return response.data;
};
