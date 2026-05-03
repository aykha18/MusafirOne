import axios from 'axios';

const baseURL = (() => {
  const raw = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
  if (!raw || raw.trim().length === 0) {
    return '/api';
  }
  const trimmed = raw.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
})();

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
