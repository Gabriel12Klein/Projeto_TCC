export type UserRole = 'ADMIN' | 'EDITOR' | 'CUSTOMER';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthSession = { token: string; user: User };
export type ResourceKey = 'vinicolas' | 'vinhos' | 'safras' | 'lotes';
export type EntityRecord = { id: string; [key: string]: unknown };
