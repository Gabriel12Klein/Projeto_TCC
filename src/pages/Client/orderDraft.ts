export type OrderDraft = {
  open: boolean;
  source: 'VINICULA' | 'OUTRO_LOCAL';
  winerySelection: string;
  wineId: string;
  vintageYear: string;
  externalWineId: string;
  name: string;
  qty: string;
  purchaseLocationId: string;
  purchaseLocation: string;
  editing: {
    orderId: string;
    itemId: string;
    date: string;
  } | null;
};

const draftKey = (userId: string) => `vinum_form_draft:purchase:${userId}`;

export function parseOrderDraft(value: unknown): OrderDraft | null {
  if (!value || typeof value !== 'object') return null;
  const draft = value as Record<string, unknown>;
  if (
    typeof draft.open !== 'boolean' ||
    (draft.source !== 'VINICULA' && draft.source !== 'OUTRO_LOCAL') ||
    typeof draft.wineId !== 'string' ||
    typeof draft.name !== 'string' ||
    typeof draft.qty !== 'string' ||
    typeof draft.purchaseLocation !== 'string'
  )
    return null;
  let editing: OrderDraft['editing'] = null;
  if (draft.editing != null) {
    if (typeof draft.editing !== 'object') return null;
    const candidate = draft.editing as Record<string, unknown>;
    if (
      typeof candidate.orderId !== 'string' ||
      typeof candidate.itemId !== 'string' ||
      typeof candidate.date !== 'string'
    )
      return null;
    editing = {
      orderId: candidate.orderId,
      itemId: candidate.itemId,
      date: candidate.date,
    };
  }
  return {
    open: draft.open,
    source: draft.source,
    winerySelection:
      typeof draft.winerySelection === 'string'
        ? draft.winerySelection
        : draft.source === 'VINICULA'
          ? 'VINUM'
          : 'LEGACY',
    wineId: draft.wineId,
    vintageYear: typeof draft.vintageYear === 'string' ? draft.vintageYear : '',
    externalWineId: typeof draft.externalWineId === 'string' ? draft.externalWineId : '',
    name: draft.name,
    qty: draft.qty,
    purchaseLocationId: typeof draft.purchaseLocationId === 'string' ? draft.purchaseLocationId : '',
    purchaseLocation: draft.purchaseLocation,
    editing,
  };
}

export function readOrderDraft(userId: string): OrderDraft | null {
  try {
    const saved = sessionStorage.getItem(draftKey(userId));
    return saved ? parseOrderDraft(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
}

export function persistOrderDraft(userId: string, draft: OrderDraft) {
  try {
    const hasContent = Boolean(
      draft.editing ||
      draft.wineId ||
      draft.vintageYear ||
      draft.externalWineId ||
      draft.name ||
      draft.purchaseLocationId ||
      draft.purchaseLocation ||
      draft.qty !== '1',
    );
    if (hasContent) sessionStorage.setItem(draftKey(userId), JSON.stringify(draft));
    else sessionStorage.removeItem(draftKey(userId));
  } catch {
    /* A falta de armazenamento não impede o preenchimento normal. */
  }
}
