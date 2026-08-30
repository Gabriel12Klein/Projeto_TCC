export type UserRole = 'ADMIN' | 'EDITOR' | 'CUSTOMER';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  age: number | null;
  address: string | null;
  phone: string | null;
  birthDate: string | null;
  street: string | null;
  addressNumber: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
};

export type AuthSession = { token: string; user: User };
export type ResourceKey = 'vinicolas' | 'vinhos' | 'tipos-vinho' | 'uvas' | 'safras' | 'lotes' | 'status-safra' | 'status-lote';
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
  characteristics: string | null;
  aromas: string | null;
  tastingNotes: string | null;
  pairing: string | null;
  additionalInfo: string | null;
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
    supplier: string | null;
    status: string;
    grapes: string[];
    batches: {
      code: string;
      quantityLiters: number;
      status: string;
      productionDate: string;
      registrationDate: string;
      grapes: string[];
      blockchainRef: string | null;
      qrCodePath: string | null;
    }[];
  }[];
};

export type PublicBatchDetail = {
  code: string;
  quantityLiters: number;
  productionDate: string;
  registrationDate: string;
  status: string;
  grapes: string[];
  blockchainRef: string | null;
  qrCodePath: string | null;
  wine: {
    id: string;
    name: string;
    type: string;
    grapes: string[];
    volumeMl: number;
    alcoholPercentage: number;
    description: string;
    characteristics: string | null;
    aromas: string | null;
    tastingNotes: string | null;
    pairing: string | null;
    additionalInfo: string | null;
    imagePath: string | null;
    winery: { name: string; city: string; state: string } | null;
    images: { path: string; altText: string | null; isPrimary: boolean }[];
  } | null;
  vintage: {
    identifier: string;
    year: number;
    observations: string | null;
    supplier: string | null;
    status: string;
    grapes: string[];
  };
};
