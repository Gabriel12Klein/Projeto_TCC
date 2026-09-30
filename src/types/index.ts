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
export type ResourceKey =
  'vinicolas' | 'vinhos' | 'tipos-vinho' | 'uvas' | 'safras' | 'lotes' | 'classificacoes';
export type EntityRecord = { id: string; [key: string]: unknown };

export type CatalogWine = {
  classification: string | null;
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

export type CatalogFilterOptions = {
  types: { id: string; name: string }[];
  classifications: { id: string; name: string }[];
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
  externalWineId: string | null;
  wineName: string;
  wineryName: string | null;
  vintageYear: number | null;
  quantityBottles: number;
  volumeMl: number | null;
  unitPrice: number | null;
  wine?: { id: string; name: string; slug: string } | null;
  externalWine?: ExternalWine | null;
};

export type CustomerOrder = {
  purchaseLocation?: string | null;
  purchaseLocationId?: string | null;
  purchaseLocationRef?: { id: string; name: string } | null;
  id: string;
  source: 'VINICULA' | 'OUTRO_LOCAL';
  purchaseDate: string;
  notes: string | null;
  items: CustomerOrderItem[];
};

export type PageLimit = 10 | 20 | 50 | 100;

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: PageLimit;
  totalPages: number;
};

export type ExternalWinery = {
  id: string;
  name: string;
  street: string | null;
  neighborhood: string | null;
  city: string | null;
  stateRegion: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExternalWine = {
  id: string;
  name: string;
  externalWineryId: string;
  externalWinery: { id: string; name: string };
  vintageYear: number | null;
  description: string | null;
  characteristics: string | null;
  aromas: string | null;
  tastingNotes: string | null;
  imagePath: string | null;
  grapeLinks: { grape: { id: string; name: string } }[];
  createdAt: string;
  updatedAt: string;
};

export type PurchaseLocation = {
  id: string;
  name: string;
  street: string | null;
  neighborhood: string | null;
  city: string | null;
  stateRegion: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InventoryMovement = {
  orderId?: string | null;
  purchaseLocation?: string | null;
  id: string;
  type: 'CONSUMO' | 'ENTRADA' | 'AJUSTE' | 'ABERTURA';
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
  externalWineId?: string | null;
  wine?: { id: string; name: string; slug: string } | null;
  movements: InventoryMovement[];
};

export type InventoryDashboard = {
  totals: {
    acquiredBottles: number;
    consumedBottles: number;
    availableBottles: number;
    openedBottles: number;
    labelCount: number;
  };
  selectedYear: number;
  years: number[];
  monthlyConsumption: { month: number; bottles: number }[];
};

export type BottleStatus = 'DISPONIVEL' | 'ABERTA' | 'CONSUMIDA' | 'DESCARTADA';

export type CellarBottle = {
  id: string;
  bottleNumber: number;
  status: BottleStatus;
  purchasedAt: string;
  openedAt: string | null;
  finishedAt: string | null;
  discardedAt: string | null;
  discardReason: string | null;
  inventoryItem: {
    id: string;
    name: string;
    wineryName: string | null;
    photoPath: string | null;
    wine: {
      id: string;
      name: string;
      slug: string;
      description: string;
      volumeMl: number;
      typeId: string;
      wineType: { id: string; name: string };
      winery: { name: string } | null;
      image: { path: string } | null;
      grapeLinks: { grape: { id: string; name: string } }[];
      vintages: { year: number }[];
    } | null;
  };
  orderItem: {
    vintageYear: number | null;
    volumeMl: number | null;
    externalWineId: string | null;
    externalWine: ExternalWine | null;
    order: {
      id: string;
      purchaseDate: string;
      purchaseLocation: string | null;
      source: 'VINICULA' | 'OUTRO_LOCAL';
    };
  } | null;
  movements: InventoryMovement[];
};

export type BottleListFilters = {
  status?: BottleStatus;
  wineTypeId?: string;
  purchasedFrom?: string;
  purchasedTo?: string;
  page?: number;
  limit?: PageLimit;
};

export type WineTypeOption = { id: string; name: string };
