import type { AuthSession, CatalogWine, CatalogWineDetail, CustomerOrder, EntityRecord, InventoryItem, PublicBatchDetail, ResourceKey, User } from '../types';
import type { AdminSummary, WineryAccount, WineryAccountInput } from '../pages/Admin/components/adminAccount.types';
import { ApiError, networkMessage, responseMessage, type FieldIssue } from './feedback';

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
  let response: Response;
  let text: string;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
    text = await response.text();
  } catch { throw new ApiError(networkMessage, 0); }
  let data: any;
  try { data = text ? JSON.parse(text) : null; } catch {
    throw new ApiError('O serviço não respondeu como esperado. Aguarde um momento e tente novamente.', response.status);
  }
  if (!response.ok) {
    const issues: FieldIssue[] = Array.isArray(data?.issues) ? data.issues.map((issue: FieldIssue) => ({ path: Array.isArray(issue.path) ? issue.path : [], message: responseMessage(response.status, issue.message) })) : [];
    if (response.status === 401 && token && path !== '/auth/login') window.dispatchEvent(new Event('vinum:session-expired'));
    throw new ApiError(issues.map(issue => issue.message).join(' ') || responseMessage(response.status, data?.message), response.status, issues);
  }
  return data;
}

export const api = {
  admin: {
    account: () => request<WineryAccount>('/admin/cadastro'),
    updateAccount: (payload: WineryAccountInput) => request<WineryAccount>('/admin/cadastro', { method: 'PUT', body: JSON.stringify(payload) }),
    summary: () => request<AdminSummary>('/admin/resumo'),
  },
  login: (payload: { email: string; password: string }) =>
    request<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request<User>('/auth/me'),
  updateProfile: (payload: {
    name: string;
    email?: string;
    currentPassword?: string;
    age?: number | null;
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
  customer: {
    orders: () => request<CustomerOrder[]>('/cliente/pedidos'),
    createOrder: (payload: { source: 'VINICULA' | 'OUTRO_LOCAL'; purchaseDate: string; purchaseLocation?: string; photo?: File; notes?: string; items: Array<{ wineId?: string; wineName?: string; wineryName?: string; vintageYear?: number; quantityBottles: number; volumeMl?: number; unitPrice?: number }> }) => {
      const { photo, ...data } = payload;
      if (!photo) return request<CustomerOrder>('/cliente/pedidos', { method: 'POST', body: JSON.stringify(data) });
      const body = new FormData();
      body.append('payload', JSON.stringify(data));
      body.append('photo', photo);
      return request<CustomerOrder>('/cliente/pedidos', { method: 'POST', body });
    },
    removeOrder: (id: string) => request<void>(`/cliente/pedidos/${id}`, { method: 'DELETE' }),
    updateOrderItem: (orderId: string, itemId: string, payload: { source: 'VINICULA' | 'OUTRO_LOCAL'; purchaseDate: string; purchaseLocation?: string; photo?: File; items: Array<{ wineId?: string; wineName?: string; quantityBottles: number }> }) => {
      const { photo, ...data } = payload;
      const url = `/cliente/pedidos/${encodeURIComponent(orderId)}/itens/${encodeURIComponent(itemId)}`;
      if (!photo) return request<CustomerOrder>(url, { method: 'PUT', body: JSON.stringify(data) });
      const body = new FormData();
      body.append('payload', JSON.stringify(data));
      body.append('photo', photo);
      return request<CustomerOrder>(url, { method: 'PUT', body });
    },
    inventory: () => request<InventoryItem[]>('/cliente/estoque'),
    createInventoryItem: (payload: { name: string; wineryName?: string; quantityBottles: number; photo: File }) => {
      const body = new FormData();
      body.append('name', payload.name);
      body.append('quantityBottles', String(payload.quantityBottles));
      if (payload.wineryName) body.append('wineryName', payload.wineryName);
      body.append('photo', payload.photo);
      return request<InventoryItem>('/cliente/estoque', { method: 'POST', body });
    },
    movement: (itemId: string, payload: { type: 'CONSUMO' | 'ENTRADA' | 'AJUSTE'; quantityBottles: number; reason?: string }) =>
      request<InventoryItem>(`/cliente/estoque/${itemId}/movimentos`, { method: 'POST', body: JSON.stringify(payload) }),
  },
};
