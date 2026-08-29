const TOKEN_KEY = 'vinum_token';
const USER_KEY = 'vinum_user';

export function getToken() { return sessionStorage.getItem(TOKEN_KEY); }
export function getStoredUser() {
  try { return JSON.parse(sessionStorage.getItem(USER_KEY) ?? 'null'); } catch { return null; }
}
export function saveSession({ token, user }) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers ?? {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`/api${path}`, { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message ?? 'Erro ao comunicar com o servidor.');
  return data;
}

export const api = {
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  list: (resource) => request(`/${resource}`),
  create: (resource, payload) => request(`/${resource}`, { method: 'POST', body: JSON.stringify(payload) }),
  update: (resource, id, payload) => request(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (resource, id) => request(`/${resource}/${id}`, { method: 'DELETE' }),
};
