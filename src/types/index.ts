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

export type CatalogWine = {
  id: string;
  name: string;
  slug: string;
  type: string;
  grapes: string;
  volumeMl: number;
  alcoholPercentage: number;
  description: string;
  imagePath: string | null;
};

export type CatalogWineDetail = CatalogWine & {
  winery: { name: string; city: string; state: string } | null;
  images: { path: string; altText: string | null; isPrimary: boolean }[];
  vintages: {
    id: string;
    identifier: string;
    year: number;
    observations: string | null;
    status: string;
    batches: {
      code: string;
      status: string;
      productionDate: string;
      blockchainRef: string | null;
      qrCodePath: string | null;
    }[];
  }[];
};
