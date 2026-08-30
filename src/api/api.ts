import type { AuthSession, CatalogWine, CatalogWineDetail, EntityRecord, PublicBatchDetail, ResourceKey, User } from '../types';

const TOKEN_KEY = 'vinum_token';
const USER_KEY = 'vinum_user';
const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}
export function getStoredUser(): User | null {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) ?? 'null') as User | null;
  } catch {
    return null;
  }
}
export function saveSession({ token, user }: AuthSession) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const issueMessage = Array.isArray(data?.issues)
      ? data.issues
          .map((issue: { message?: string }) => issue.message)
          .filter(Boolean)
          .join(' ')
      : '';
    throw new Error(issueMessage || data?.message || 'Erro ao comunicar com o servidor.');
  }
  return data;
}

export const api = {
  login: (payload: { email: string; password: string }) =>
    request<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request<User>('/auth/me'),
  updateProfile: (payload: {
    name: string;
    age: number | null;
    birthDate: string | null;
    street: string | null;
    addressNumber: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    phone: string | null;
    newPassword?: string;
  }) => request<User>('/auth/me', { method: 'PATCH', body: JSON.stringify(payload) }),
  register: (payload: { name: string; email: string; password: string }) =>
    request<User>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  list: (resource: ResourceKey) => request<EntityRecord[]>(`/${resource}`),
  create: (resource: ResourceKey, payload: Record<string, unknown>) =>
    request<EntityRecord>(`/${resource}`, { method: 'POST', body: JSON.stringify(payload) }),
  update: (resource: ResourceKey, id: string, payload: Record<string, unknown>) =>
    request<EntityRecord>(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (resource: ResourceKey, id: string) => request<void>(`/${resource}/${id}`, { method: 'DELETE' }),
  uploadWineImage: (wineId: string, image: File) => {
    const body = new FormData();
    body.append('image', image);
    return request<{ id: string; path: string; isPrimary: boolean }>(`/uploads/wines/${wineId}`, {
      method: 'POST',
      body,
    });
  },
  generateBatchQr: (batchId: string) =>
    request<{ path: string; targetUrl: string }>(`/lotes/${batchId}/qr-code`, { method: 'POST' }),
  catalog: {
    list: (filters: { q?: string; type?: string } = {}) => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.type) params.set('type', filters.type);
      const query = params.size ? `?${params}` : '';
      return request<CatalogWine[]>(`/catalog/wines${query}`);
    },
    detail: (slug: string) => request<CatalogWineDetail>(`/catalog/wines/${encodeURIComponent(slug)}`),
    batch: (code: string) => request<PublicBatchDetail>(`/catalog/batches/${encodeURIComponent(code)}`),
  },
};
