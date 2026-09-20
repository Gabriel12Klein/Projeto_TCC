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
export type ResourceKey = 'vinicolas' | 'vinhos' | 'tipos-vinho' | 'uvas' | 'safras' | 'lotes';
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
  imagePath: string | null;
};

export type CatalogWineDetail = CatalogWine & {
  winery: { name: string; city: string; state: string } | null;
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
      registrationDate: string | null;
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
  registrationDate: string | null;
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
    imagePath: string | null;
    winery: { name: string; city: string; state: string } | null;
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

export type CustomerOrderItem = {
  photoPath?: string | null;
  id: string;
  wineId: string | null;
  wineName: string;
  wineryName: string | null;
  vintageYear: number | null;
  quantityBottles: number;
  volumeMl: number | null;
  unitPrice: number | null;
  wine?: { id: string; name: string; slug: string } | null;
};

export type CustomerOrder = {
  purchaseLocation?: string | null;
  id: string;
  source: 'VINICULA' | 'OUTRO_LOCAL';
  purchaseDate: string;
  notes: string | null;
  items: CustomerOrderItem[];
};

export type InventoryMovement = {
  orderId?: string | null;
  purchaseLocation?: string | null;
  id: string;
  type: 'CONSUMO' | 'ENTRADA' | 'AJUSTE';
  quantityBottles: number;
  reason: string | null;
  occurredAt: string;
};

export type InventoryItem = {
  orderItems?: { order: { purchaseLocation: string | null } }[];
  id: string;
  name: string;
  wineryName: string | null;
  photoPath: string | null;
  quantityBottles: number;
  wineId: string | null;
  wine?: { id: string; name: string; slug: string } | null;
  movements: InventoryMovement[];
};
