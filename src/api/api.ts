import type {
  AuthSession,
  BottleListFilters,
  CellarBottle,
  CatalogWine,
  CatalogWineDetail,
  CatalogFilterOptions,
  CustomerOrder,
  EntityRecord,
  ExternalWine,
  ExternalWinery,
  InventoryDashboard,
  InventoryItem,
  PageLimit,
  Paginated,
  PublicBatchDetail,
  PurchaseLocation,
  ResourceKey,
  User,
  WineTypeOption,
} from '../types';
import type {
  AdminSummary,
  WineryAccount,
  WineryAccountInput,
} from '../pages/Admin/components/adminAccount.types';
import { ApiError, networkMessage, responseMessage, type FieldIssue } from './feedback';
import { validResponse } from './responseShape';

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
  } catch {
    throw new ApiError(networkMessage, 0);
  }
  if (response.status === 401 && token && path !== '/auth/login')
    window.dispatchEvent(new Event('vinum:session-expired'));
  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(
      'O serviço não respondeu como esperado. Aguarde um momento e tente novamente.',
      response.status,
    );
  }
  if (!response.ok) {
    const issues: FieldIssue[] = Array.isArray(data?.issues)
      ? data.issues
          .filter((issue: unknown) => issue && typeof issue === 'object')
          .map((issue: FieldIssue) => ({
            path: Array.isArray(issue.path) ? issue.path : [],
            message: responseMessage(response.status, issue.message),
          }))
      : [];
    throw new ApiError(
      issues.map((issue) => issue.message).join(' ') || responseMessage(response.status, data?.message),
      response.status,
      issues,
    );
  }
  if (!validResponse(path, options.method ?? 'GET', data))
    throw new ApiError(
      'O serviço retornou dados incompletos. Tente novamente. Se estava salvando, confira a lista antes de repetir a operação.',
      response.status,
    );
  return data;
}

export const api = {
  admin: {
    account: () => request<WineryAccount>('/admin/cadastro'),
    updateAccount: (payload: WineryAccountInput) =>
      request<WineryAccount>('/admin/cadastro', { method: 'PUT', body: JSON.stringify(payload) }),
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
  generateBatchQr: (batchId: string) =>
    request<{ path: string; targetUrl: string; generatedAt: string; created: boolean }>(
      `/lotes/${encodeURIComponent(batchId)}/qr-code`,
      { method: 'POST' },
    ),
  catalog: {
    list: (filters: { q?: string; type?: string; classification?: string } = {}) => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.type) params.set('type', filters.type);
      if (filters.classification) params.set('classification', filters.classification);
      const query = params.size ? `?${params}` : '';
      return request<CatalogWine[]>(`/catalog/wines${query}`);
    },
    filters: () => request<CatalogFilterOptions>('/catalog/filters'),
    detail: (slug: string) => request<CatalogWineDetail>(`/catalog/wines/${encodeURIComponent(slug)}`),
    batch: (code: string) => request<PublicBatchDetail>(`/catalog/batches/${encodeURIComponent(code)}`),
  },
  customer: {
    externalWineries: () => request<ExternalWinery[]>('/cliente/vinicolas-externas'),
    createExternalWinery: (payload: Omit<ExternalWinery, 'id' | 'createdAt' | 'updatedAt'>) =>
      request<ExternalWinery>('/cliente/vinicolas-externas', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateExternalWinery: (id: string, payload: Omit<ExternalWinery, 'id' | 'createdAt' | 'updatedAt'>) =>
      request<ExternalWinery>(`/cliente/vinicolas-externas/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    removeExternalWinery: (id: string) =>
      request<void>(`/cliente/vinicolas-externas/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    externalWines: (wineryId?: string) =>
      request<ExternalWine[]>(
        `/cliente/vinhos-externos${wineryId ? `?wineryId=${encodeURIComponent(wineryId)}` : ''}`,
      ),
    externalWine: (id: string) => request<ExternalWine>(`/cliente/vinhos-externos/${encodeURIComponent(id)}`),
    createExternalWine: (
      payload: Omit<
        ExternalWine,
        'id' | 'externalWinery' | 'grapeLinks' | 'imagePath' | 'createdAt' | 'updatedAt'
      > & {
        grapeIds: string[];
        photo: File;
      },
    ) => {
      const { photo, ...data } = payload;
      const body = new FormData();
      body.append('payload', JSON.stringify(data));
      body.append('photo', photo);
      return request<ExternalWine>('/cliente/vinhos-externos', { method: 'POST', body });
    },
    updateExternalWine: (
      id: string,
      payload: Omit<
        ExternalWine,
        'id' | 'externalWinery' | 'grapeLinks' | 'imagePath' | 'createdAt' | 'updatedAt'
      > & {
        grapeIds: string[];
        photo?: File;
      },
    ) => {
      const { photo, ...data } = payload;
      if (!photo)
        return request<ExternalWine>(`/cliente/vinhos-externos/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      const body = new FormData();
      body.append('payload', JSON.stringify(data));
      body.append('photo', photo);
      return request<ExternalWine>(`/cliente/vinhos-externos/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body,
      });
    },
    removeExternalWine: (id: string) =>
      request<void>(`/cliente/vinhos-externos/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    purchaseLocations: () => request<PurchaseLocation[]>('/cliente/locais-compra'),
    createPurchaseLocation: (payload: Omit<PurchaseLocation, 'id' | 'createdAt' | 'updatedAt'>) =>
      request<PurchaseLocation>('/cliente/locais-compra', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updatePurchaseLocation: (id: string, payload: Omit<PurchaseLocation, 'id' | 'createdAt' | 'updatedAt'>) =>
      request<PurchaseLocation>(`/cliente/locais-compra/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    removePurchaseLocation: (id: string) =>
      request<void>(`/cliente/locais-compra/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    orders: ({ page = 1, limit = 10 }: { page?: number; limit?: PageLimit } = {}) =>
      request<Paginated<CustomerOrder>>(`/cliente/pedidos?page=${page}&limit=${limit}`),
    createOrder: (payload: {
      source: 'VINICULA' | 'OUTRO_LOCAL';
      purchaseDate: string;
      purchaseLocationId?: string;
      purchaseLocation?: string;
      photo?: File;
      notes?: string;
      items: Array<{
        wineId?: string;
        externalWineId?: string;
        externalWineryId?: string;
        wineName?: string;
        wineryName?: string;
        vintageYear?: number;
        quantityBottles: number;
        volumeMl?: number;
        unitPrice?: number;
      }>;
    }) => {
      const { photo, ...data } = payload;
      if (!photo)
        return request<CustomerOrder>('/cliente/pedidos', { method: 'POST', body: JSON.stringify(data) });
      const body = new FormData();
      body.append('payload', JSON.stringify(data));
      body.append('photo', photo);
      return request<CustomerOrder>('/cliente/pedidos', { method: 'POST', body });
    },
    removeOrder: (id: string) => request<void>(`/cliente/pedidos/${id}`, { method: 'DELETE' }),
    removeOneOrderItemBottle: (orderId: string, itemId: string) =>
      request<void>(
        `/cliente/pedidos/${encodeURIComponent(orderId)}/itens/${encodeURIComponent(itemId)}/garrafas/uma`,
        { method: 'DELETE' },
      ),
    removeAllOrderItemBottles: (orderId: string, itemId: string) =>
      request<void>(
        `/cliente/pedidos/${encodeURIComponent(orderId)}/itens/${encodeURIComponent(itemId)}/garrafas`,
        { method: 'DELETE' },
      ),
    updateOrderItem: (
      orderId: string,
      itemId: string,
      payload: {
        source: 'VINICULA' | 'OUTRO_LOCAL';
        purchaseDate: string;
        purchaseLocationId?: string;
        purchaseLocation?: string;
        photo?: File;
        items: Array<{
          wineId?: string;
          externalWineId?: string;
          externalWineryId?: string;
          wineName?: string;
          vintageYear?: number;
          quantityBottles: number;
        }>;
      },
    ) => {
      const { photo, ...data } = payload;
      const url = `/cliente/pedidos/${encodeURIComponent(orderId)}/itens/${encodeURIComponent(itemId)}`;
      if (!photo) return request<CustomerOrder>(url, { method: 'PUT', body: JSON.stringify(data) });
      const body = new FormData();
      body.append('payload', JSON.stringify(data));
      body.append('photo', photo);
      return request<CustomerOrder>(url, { method: 'PUT', body });
    },
    inventory: () => request<InventoryItem[]>('/cliente/estoque'),
    inventoryDashboard: (year?: number) =>
      request<InventoryDashboard>(`/cliente/estoque/resumo${year ? `?year=${year}` : ''}`),
    bottles: (filters: BottleListFilters = {}) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, String(value));
      });
      const query = params.toString();
      return request<Paginated<CellarBottle>>(`/cliente/estoque/garrafas${query ? `?${query}` : ''}`);
    },
    bottleWineTypes: () => request<WineTypeOption[]>('/cliente/estoque/tipos-vinho'),
    bottle: (bottleId: string) =>
      request<CellarBottle>(`/cliente/estoque/garrafas/${encodeURIComponent(bottleId)}`),
    removeBottle: (bottleId: string) =>
      request<void>(`/cliente/estoque/garrafas/${encodeURIComponent(bottleId)}`, { method: 'DELETE' }),
    openBottle: (bottleId: string, occurredAt: string) =>
      request<CellarBottle>(`/cliente/estoque/garrafas/${encodeURIComponent(bottleId)}/abrir`, {
        method: 'POST',
        body: JSON.stringify({ occurredAt }),
      }),
    finishBottle: (bottleId: string, occurredAt: string) =>
      request<CellarBottle>(`/cliente/estoque/garrafas/${encodeURIComponent(bottleId)}/consumir`, {
        method: 'POST',
        body: JSON.stringify({ occurredAt }),
      }),
    discardBottle: (bottleId: string, occurredAt: string, reason: string) =>
      request<CellarBottle>(`/cliente/estoque/garrafas/${encodeURIComponent(bottleId)}/descartar`, {
        method: 'POST',
        body: JSON.stringify({ occurredAt, reason }),
      }),
  },
};
