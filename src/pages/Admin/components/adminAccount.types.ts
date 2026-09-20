import type { User } from '../../../types';

export type WineryAccount = {
  winery: { id: string; name: string; cnpj: string; city: string; state: string; email: string | null; phone: string | null };
  account: User;
};
export type WineryAccountInput = {
  wineryId: string; name: string; cnpj: string; city: string; state: string;
  contactEmail: string; accountName: string; loginEmail: string; phone: string;
  currentPassword: string; newPassword: string; confirmPassword: string;
};
export type AdminSummary = {
  wines: number; batches: number; vintages: number; grapes: number; wineTypes: number;
  wineStatuses: { status: string; count: number }[];
  batchStatuses: { status: string; count: number }[];
  updatedAt: string;
};
