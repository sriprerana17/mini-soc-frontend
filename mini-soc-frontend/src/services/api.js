// All backend communication lives in this file.
// Connected to FastAPI backend with response normalization and error handling.
import axios from 'axios';
import { getStoredToken } from './auth';
import { mockLogs } from '../data/mockLogs';
import { mockAlerts } from '../data/mockAlerts';
import { dailyStats } from '../data/mockAnalytics';
import { mockUploadHistory } from '../data/mockUploads';

const USE_MOCK = false;

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
});

client.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Pretend to be a network call so loading states can be tested when in mock mode
const fakeResponse = (data, ms = 250) => new Promise((resolve) => setTimeout(() => resolve(data), ms));

export function normalizeEventType(type) {
  if (!type) return 'Unknown';
  const lower = type.toLowerCase().trim();
  if (lower === 'failed_login' || lower === 'login_failed') return 'Failed Login';
  if (lower === 'login_success' || lower === 'successful_login' || lower === 'success') return 'Successful Login';
  if (lower === 'port_scan') return 'Port Scan';
  if (lower === 'privilege_escalation') return 'Privilege Escalation';
  if (lower === 'unusual_login' || lower === 'unusual_login_time') return 'Unusual Login Time';
  if (lower === 'firewall_block' || lower === 'firewall block') return 'Firewall Block';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeLog(l) {
  const eventType = normalizeEventType(l.event_type || l.eventType);
  const lowerType = (l.event_type || l.eventType || '').toLowerCase();
  const isFailed = lowerType.includes('fail') || lowerType.includes('block') || lowerType.includes('drop') || lowerType.includes('denied');
  const isCritical = lowerType.includes('priv') || lowerType.includes('exploit');
  const isHigh = lowerType.includes('brute') || lowerType.includes('port_scan');

  let status = l.status;
  if (!status) {
    status = isFailed ? 'Failed' : 'Success';
  } else {
    status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  let severity = l.severity;
  if (!severity) {
    severity = isCritical ? 'Critical' : isHigh ? 'High' : isFailed ? 'Medium' : 'Low';
  } else {
    severity = severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
  }

  return {
    id: String(l.id),
    timestamp: l.event_time || l.timestamp || new Date().toISOString(),
    sourceIp: l.source_ip || l.sourceIp || '0.0.0.0',
    destinationIp: l.destination_ip || l.destinationIp || '10.0.0.1',
    username: l.username || (l.details && l.details.match(/user\s+([^\s]+)/i)?.[1]) || 'admin',
    eventType,
    status,
    severity,
    description: l.details || l.description || `${eventType} from ${l.source_ip || l.sourceIp}`,
    rawLog: l.details || l.rawLog || `Event ${l.id}: ${eventType} from ${l.source_ip || l.sourceIp}`,
  };
}

export function normalizeAlertStatus(s) {
  if (!s) return 'Open';
  const lower = s.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (lower === 'false_positive') return 'False Positive';
  if (lower === 'investigating' || lower === 'acknowledged') return 'Investigating';
  if (lower === 'resolved' || lower === 'closed') return 'Resolved';
  return 'Open';
}

export function statusToBackend(s) {
  if (!s) return 'open';
  const lower = s.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (lower === 'false_positive') return 'false_positive';
  if (lower === 'investigating') return 'investigating';
  if (lower === 'resolved') return 'resolved';
  return 'open';
}

export function normalizeSeverity(s) {
  if (!s) return 'Medium';
  const lower = s.toLowerCase().trim();
  if (lower === 'critical') return 'Critical';
  if (lower === 'high') return 'High';
  if (lower === 'low') return 'Low';
  return 'Medium';
}

function calculateRiskScore(severity) {
  if (severity === 'Critical') return 92;
  if (severity === 'High') return 78;
  if (severity === 'Medium') return 55;
  return 28;
}

export function normalizeAlert(a) {
  const severity = normalizeSeverity(a.severity);
  const status = normalizeAlertStatus(a.status);
  const riskScore = a.riskScore || a.risk_score || calculateRiskScore(severity);
  const id = String(a.id);
  const name = a.name || a.detection_rule || a.description || 'Security Alert';

  return {
    id,
    name,
    sourceIp: a.source_ip || a.sourceIp || '0.0.0.0',
    severity,
    riskScore,
    status,
    rule: a.detection_rule || a.rule || 'Automated detection rule',
    explanation: a.description || a.explanation || 'Suspicious activity detected.',
    notes: Array.isArray(a.notes) ? a.notes : [],
    logIds: Array.isArray(a.log_ids) ? a.log_ids.map(String) : Array.isArray(a.logIds) ? a.logIds.map(String) : [],
    detectedAt: a.created_at || a.detectedAt || new Date().toISOString(),
  };
}

export const getAlert = async (id) => {
  if (USE_MOCK) {
    const found = mockAlerts.find((a) => String(a.id) === String(id));
    return found ? normalizeAlert(found) : null;
  }
  const res = await client.get(`/alerts/${id}`);
  return normalizeAlert(res.data);
};

export const getLog = async (id) => {
  if (USE_MOCK) {
    const found = mockLogs.find((l) => String(l.id) === String(id));
    return found ? normalizeLog(found) : null;
  }
  const res = await client.get(`/logs/${id}`);
  return normalizeLog(res.data);
};

export const getLogs = async () => {
  if (USE_MOCK) return fakeResponse(mockLogs);
  const res = await client.get('/logs');
  const list = Array.isArray(res.data) ? res.data : (res.data?.logs || []);
  return list.map(normalizeLog);
};

export const getAlerts = async () => {
  if (USE_MOCK) return fakeResponse(mockAlerts);
  const res = await client.get('/alerts');
  const list = Array.isArray(res.data) ? res.data : (res.data?.alerts || []);
  return list.map(normalizeAlert);
};

export const updateAlertStatus = async (id, status) => {
  if (USE_MOCK) return fakeResponse({ id, status }, 100);
  const backendStatus = statusToBackend(status);
  const res = await client.patch(`/alerts/${id}`, { status: backendStatus });
  const alertData = res.data?.alert || res.data;
  return normalizeAlert(alertData);
};

export const addAlertNote = async (id, note) => {
  if (USE_MOCK) return fakeResponse({ id, note }, 100);
  const res = await client.post(`/alerts/${id}/notes`, {
    text: note.text,
    author: note.author || 'SOC Analyst',
    time: note.time || new Date().toISOString(),
  });
  return res.data;
};

export const getAnalytics = async () => {
  if (USE_MOCK) return fakeResponse(dailyStats);
  const res = await client.get('/analytics/daily');
  return res.data;
};

export const getUploadHistory = async () => {
  if (USE_MOCK) return fakeResponse(mockUploadHistory);
  const res = await client.get('/uploads');
  return Array.isArray(res.data) ? res.data : (res.data?.uploads || []);
};

export const uploadLogFile = async (file) => {
  if (USE_MOCK) return fakeResponse({ fileName: file.name }, 100);
  const form = new FormData();
  form.append('file', file);
  const res = await client.post('/logs/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
