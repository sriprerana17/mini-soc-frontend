// All backend communication lives in this file.
// Right now every function returns MOCK data. When the Flask/FastAPI backend
// is ready: set USE_MOCK = false and set VITE_API_URL in a .env file.
import axios from 'axios';
import { mockLogs } from '../data/mockLogs';
import { mockAlerts } from '../data/mockAlerts';
import { dailyStats } from '../data/mockAnalytics';
import { mockUploadHistory } from '../data/mockUploads';

const USE_MOCK = true;

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
});

// Pretend to be a network call so loading states can be tested.
const fakeResponse = (data, ms = 250) => new Promise((resolve) => setTimeout(() => resolve(data), ms));

export const getLogs = async () => (USE_MOCK ? fakeResponse(mockLogs) : (await client.get('/logs')).data);

export const getAlerts = async () => (USE_MOCK ? fakeResponse(mockAlerts) : (await client.get('/alerts')).data);

export const updateAlertStatus = async (id, status) =>
  USE_MOCK ? fakeResponse({ id, status }, 100) : (await client.patch(`/alerts/${id}`, { status })).data;

export const addAlertNote = async (id, note) =>
  USE_MOCK ? fakeResponse({ id, note }, 100) : (await client.post(`/alerts/${id}/notes`, note)).data;

export const getAnalytics = async () => (USE_MOCK ? fakeResponse(dailyStats) : (await client.get('/analytics/daily')).data);

export const getUploadHistory = async () =>
  USE_MOCK ? fakeResponse(mockUploadHistory) : (await client.get('/uploads')).data;

export const uploadLogFile = async (file) => {
  if (USE_MOCK) return fakeResponse({ fileName: file.name }, 100);
  const form = new FormData();
  form.append('file', file);
  return (await client.post('/uploads', form)).data;
};
