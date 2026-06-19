/**
 * API Service - Axios configuration with JWT interceptors
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Request Interceptor ─────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor (auto-refresh JWT) ─────────────────
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => refreshSubscribers.push(cb);

const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/token/refresh`, {
          refresh: refreshToken,
        });

        const newToken = data.access;
        localStorage.setItem('access_token', newToken);
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh);

        api.defaults.headers.Authorization = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        onRefreshed(newToken);
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: (refresh) => api.post('/auth/logout', { refresh }),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// ─── Users API ────────────────────────────────────────────────
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// ─── Customers API ────────────────────────────────────────────
export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getLeads: (id) => api.get(`/customers/${id}/leads`),
};

// ─── Leads API ────────────────────────────────────────────────
export const leadsAPI = {
  getAll: (params) => api.get('/leads', { params }),
  getById: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
  getInteractions: (id) => api.get(`/leads/${id}/interactions`),
};

// ─── Interactions API ─────────────────────────────────────────
export const interactionsAPI = {
  getAll: (params) => api.get('/interactions', { params }),
  getById: (id) => api.get(`/interactions/${id}`),
  create: (data) => api.post('/interactions', data),
  update: (id, data) => api.put(`/interactions/${id}`, data),
  delete: (id) => api.delete(`/interactions/${id}`),
};

// ─── Dashboard API ────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// ─── Pipeline API ─────────────────────────────────────────────
export const pipelineAPI = {
  get: () => api.get('/pipeline'),
  updateStatus: (lead_id, status) => api.patch('/pipeline', { lead_id, status }),
};

// ─── Notifications API ───────────────────────────────────────
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: () => api.post('/notifications/mark-read'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

// ─── Export API ───────────────────────────────────────────────
export const exportAPI = {
  exportCustomers: () => api.get('/export/customers', { responseType: 'blob' }),
  exportLeads: () => api.get('/export/leads', { responseType: 'blob' }),
};

export default api;
