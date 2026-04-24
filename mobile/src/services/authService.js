import api, { setToken, clearToken } from '../config/api';

// Simple in-memory storage for demo
let memoryStorage = {
  token: null,
  user: null,
};

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  // Java backend uses camelCase (accessToken), Python uses snake_case (access_token)
  const token = response.data.accessToken || response.data.access_token;
  if (token) {
    memoryStorage.token = token;
    memoryStorage.user = response.data.user;
    setToken(token);
  }
  return response.data;
};

export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  // Java backend uses camelCase (accessToken), Python uses snake_case (access_token)
  const token = response.data.accessToken || response.data.access_token;
  if (token) {
    memoryStorage.token = token;
    memoryStorage.user = response.data.user;
    setToken(token);
  }
  return response.data;
};

export const logout = async () => {
  memoryStorage.token = null;
  memoryStorage.user = null;
  clearToken(); // Token'ı API config'den temizle
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const sendEmailCode = async (email) => {
  const response = await api.post(`/auth/send-email-code?email=${encodeURIComponent(email)}`);
  return response.data;
};

export const verifyEmailCode = async (email, code) => {
  const response = await api.post(`/auth/verify-email-code?email=${encodeURIComponent(email)}&code=${code}`);
  return response.data;
};

export const sendPhoneCode = async (phone) => {
  const response = await api.post(`/auth/send-phone-code?phone=${encodeURIComponent(phone)}`);
  return response.data;
};

export const verifyPhoneCode = async (phone, code) => {
  const response = await api.post(`/auth/verify-phone-code?phone=${encodeURIComponent(phone)}&code=${code}`);
  return response.data;
};

// Helper to get token for API config
export const getToken = () => memoryStorage.token;
