import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE + '/api',
  timeout: 10000
});

export async function fetchGroups() {
  const r = await api.get('/groups');
  return r.data;
}
export async function createGroup(payload) {
  const r = await api.post('/groups', payload);
  return r.data;
}
export async function createExpense(payload) {
  const r = await api.post('/expenses', payload);
  return r.data;
}
export async function fetchExpenses(params = {}) {
  const r = await api.get('/expenses', { params });
  return r.data;
}
export async function fetchMonthlyReport(year, month) {
  const r = await api.get('/reports/monthly', { params: { year, month }});
  return r.data;
}

export default api;
