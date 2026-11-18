// Real authentication service integrated with FastAPI backend JWT endpoints.
import axios from 'axios';

const TOKEN_KEY = 'minisoc_auth_token';
const USER_KEY = 'minisoc_auth_user';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
}

export function getUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(token, user, remember = false) {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  const store = remember ? localStorage : sessionStorage;
  if (token) store.setItem(TOKEN_KEY, token);
  if (user) store.setItem(USER_KEY, JSON.stringify(user));
}

export function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export const isAuthenticated = () => {
  return Boolean(getStoredToken() && getUser());
};

export async function loginUser(email, password, remember = false) {
  const res = await axios.post(`${API_BASE}/auth/login`, {
    email: email.trim().toLowerCase(),
    password,
  });
  const { token, user } = res.data;
  setSession(token, user, remember);
  return user;
}

export async function registerUser(name, email, password, remember = false) {
  const res = await axios.post(`${API_BASE}/auth/register`, {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
  });
  const { token, user } = res.data;
  setSession(token, user, remember);
  return user;
}

export async function verifyCurrentSession() {
  const token = getStoredToken();
  if (!token) {
    logout();
    return null;
  }
  try {
    const res = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = res.data;
    const remember = Boolean(localStorage.getItem(TOKEN_KEY));
    setSession(token, user, remember);
    return user;
  } catch {
    logout();
    return null;
  }
}
