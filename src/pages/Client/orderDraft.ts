export type OrderDraft = {
  open: boolean;
  source: 'VINICULA' | 'OUTRO_LOCAL';
  wineId: string;
  name: string;
  qty: string;
  purchaseLocation: string;
  editing: {
    orderId: string;
    itemId: string;
    date: string;
    photo?: string | null;
  } | null;
  photoNeedsReselect: boolean;
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
    typeof draft.purchaseLocation !== 'string' ||
    typeof draft.photoNeedsReselect !== 'boolean'
  ) return null;
  let editing: OrderDraft['editing'] = null;
  if (draft.editing != null) {
    if (typeof draft.editing !== 'object') return null;
    const candidate = draft.editing as Record<string, unknown>;
    if (
      typeof candidate.orderId !== 'string' ||
      typeof candidate.itemId !== 'string' ||
      typeof candidate.date !== 'string' ||
      (candidate.photo != null && typeof candidate.photo !== 'string')
    ) return null;
    editing = {
      orderId: candidate.orderId,
      itemId: candidate.itemId,
      date: candidate.date,
      photo: candidate.photo as string | null | undefined,
    };
  }
  return {
    open: draft.open,
    source: draft.source,
    wineId: draft.wineId,
    name: draft.name,
    qty: draft.qty,
    purchaseLocation: draft.purchaseLocation,
    editing,
    photoNeedsReselect: draft.photoNeedsReselect,
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
      draft.editing || draft.wineId || draft.name || draft.purchaseLocation ||
      draft.qty !== '1' || draft.photoNeedsReselect,
    );
    if (hasContent) sessionStorage.setItem(draftKey(userId), JSON.stringify(draft));
    else sessionStorage.removeItem(draftKey(userId));
  } catch {
    /* A falta de armazenamento não impede o preenchimento normal. */
  }
}
