import axios from 'axios';

// Auttenticação com backend1
export const authApi = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Comunicação com backend2
export const metricsApi = axios.create({
  baseURL: 'http://localhost:8082', // Remember we mapped 8082 -> 8080
});

// Verifica Token
metricsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});