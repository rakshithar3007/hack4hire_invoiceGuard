import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('invoiceguard_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication APIs
export const authApi = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

// Invoice APIs
export const invoiceApi = {
  getAll: (params?: any) => api.get('/invoices', { params }),
  getById: (id: string) => api.get(`/invoices/${id}`),
  upload: (formData: FormData) => api.post('/invoices/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id: string) => api.delete(`/invoices/${id}`),
  downloadUrl: (id: string) => `${API_BASE_URL}/invoices/${id}/download`,
};

// Extraction & Independent Checker APIs
export const extractionApi = {
  get: (invoiceId: string) => api.get(`/invoices/${invoiceId}/extraction`),
  extract: (invoiceId: string) => api.post(`/invoices/${invoiceId}/extract`),
  update: (invoiceId: string, data: any) => api.put(`/invoices/${invoiceId}/extraction`, data),
  reExtract: (invoiceId: string, data: { strategy: string }) => api.post(`/invoices/${invoiceId}/re-extract`, data),
  getChecker: (invoiceId: string) => api.get(`/invoices/${invoiceId}/checker`),
};

// Business Validation APIs
export const validationApi = {
  get: (invoiceId: string) => api.get(`/invoices/${invoiceId}/validation`),
  validate: (invoiceId: string) => api.post(`/invoices/${invoiceId}/validate`),
};

// Fraud Detection APIs
export const fraudApi = {
  get: (invoiceId: string) => api.get(`/invoices/${invoiceId}/fraud-analysis`),
  check: (invoiceId: string) => api.post(`/invoices/${invoiceId}/fraud-check`),
};

// Approval Management APIs
export const approvalApi = {
  getPending: () => api.get('/approvals/pending'),
  approve: (invoiceId: string, data: { reason?: string }) => api.post(`/invoices/${invoiceId}/approve`, data),
  reject: (invoiceId: string, data: { reason: string }) => api.post(`/invoices/${invoiceId}/reject`, data),
  escalate: (invoiceId: string, data: { reason?: string }) => api.post(`/invoices/${invoiceId}/escalate`, data),
};

// Users & Roles Management APIs (Admin)
export const usersApi = {
  getAll: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  updateRole: (userId: number, role: string) => api.put(`/users/${userId}/role`, { role }),
  updateStatus: (userId: number, isActive: boolean) => api.put(`/users/${userId}/status`, { is_active: isActive }),
  updateLimit: (userId: number, approvalLimit: number) => api.put(`/users/${userId}/limit`, { approval_limit: approvalLimit }),
};

// Suppliers & Purchase Orders
export const supplierApi = {
  getAll: (params?: any) => api.get('/suppliers', { params }),
  create: (data: any) => api.post('/suppliers', data),
  update: (id: number, data: any) => api.put(`/suppliers/${id}`, data),
  delete: (id: number) => api.delete(`/suppliers/${id}`),
};

export const poApi = {
  getAll: () => api.get('/purchase-orders'),
  create: (data: any) => api.post('/purchase-orders', data),
  update: (id: number, data: any) => api.put(`/purchase-orders/${id}`, data),
};

// Dashboard & Analytics
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getAnalytics: () => api.get('/dashboard/analytics'),
  getRecent: () => api.get('/dashboard/recent-invoices'),
  getEmployee: () => api.get('/dashboard/employee'),
  getManager: () => api.get('/dashboard/manager'),
  getAdmin: () => api.get('/dashboard/admin'),
};

// Reports & Export
export const reportsApi = {
  getInvoices: (params?: any) => api.get('/reports/invoices', { params }),
  exportCsvUrl: `${API_BASE_URL}/reports/export/csv`,
  exportPdfUrl: `${API_BASE_URL}/reports/export/pdf`,
};

// Audit Logs & Snapshots
export const auditApi = {
  getAll: (params?: any) => api.get('/audit-logs', { params }),
  getByInvoice: (invoiceId: string) => api.get(`/invoices/${invoiceId}/audit`),
};

export const snapshotApi = {
  get: (invoiceId: string, version?: number) => api.get(`/invoices/${invoiceId}/snapshot`, { params: { version } }),
  downloadUrl: (invoiceId: string, version?: number) => `${API_BASE_URL}/invoices/${invoiceId}/snapshot/download${version ? `?version=${version}` : ''}`,
};

// Notifications
export const notificationApi = {
  getAll: (unreadOnly?: boolean) => api.get('/notifications', { params: { unread_only: unreadOnly } }),
  markRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// n8n Automation
export const n8nApi = {
  simulate: (invoiceId: string) => api.post(`/n8n/simulate-pipeline/${invoiceId}`),
  getFollowupQueue: () => api.get('/n8n/follow-up-queue'),
};

// Demo Management
export const demoApi = {
  getStatus: () => api.get('/demo/status'),
  seed: () => api.post('/demo/seed'),
  reset: (params?: { reset_all?: boolean }) => api.post('/demo/reset', null, { params }),
};

export default api;
