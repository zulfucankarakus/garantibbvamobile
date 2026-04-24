import axios from 'axios';

// Production API URL - Bu URL'i production backend'inize göre güncelleyin
// Expo için: app.json içindeki extra alanından veya Constants kullanılabilir
// EAS Build için: eas.json içinde environment variables tanımlanabilir
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://smart-interaction.preview.emergentagent.com/api';

// API URL'i export et (diğer dosyalarda kullanmak için)
export const getApiUrl = () => API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 dakika - fiyat araması uzun sürebilir
});

// Simple in-memory token storage
let tokenStorage = null;

export const setToken = (token) => {
  tokenStorage = token;
};

export const getToken = () => tokenStorage;

export const clearToken = () => {
  tokenStorage = null;
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    if (tokenStorage) {
      config.headers.Authorization = `Bearer ${tokenStorage}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStorage = null;
    }
    return Promise.reject(error);
  }
);

export default api;
