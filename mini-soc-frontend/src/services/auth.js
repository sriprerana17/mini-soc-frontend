// Demo-only login helper. There is no real authentication yet:
// any valid email + password is accepted. Replace with a real API call later.
const KEY = 'minisoc_user';

export function login(email, remember) {
  const name = email.split('@')[0].replace(/[._]/g, ' ');
  const user = { email, name: name.replace(/\b\w/g, (c) => c.toUpperCase()), role: 'SOC Analyst' };
  const store = remember ? localStorage : sessionStorage;
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
  store.setItem(KEY, JSON.stringify(user));
  return user;
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || sessionStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export const isAuthenticated = () => getUser() !== null;

export function logout() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}
