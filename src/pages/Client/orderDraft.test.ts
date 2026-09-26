import { afterEach, expect, it, vi } from 'vitest';
import { parseOrderDraft, persistOrderDraft, readOrderDraft, type OrderDraft } from './orderDraft';
import { clearSession } from '../../api/api';

const draft: OrderDraft = {
  open: true,
  source: 'VINICULA',
  wineId: 'vinho-teste',
  name: '',
  qty: '2',
  purchaseLocation: 'Rascunho não salvo',
  editing: null,
  photoNeedsReselect: false,
};

function useMemoryStorage() {
  const entries = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  });
  return entries;
}

afterEach(() => vi.unstubAllGlobals());

it('guarda o pedido por cliente e o recupera sem incluir arquivo', () => {
  const entries = useMemoryStorage();
  persistOrderDraft('cliente-a', draft);
  expect(readOrderDraft('cliente-a')).toEqual(draft);
  expect(readOrderDraft('cliente-b')).toBeNull();
  expect([...entries.values()][0]).not.toContain('File');
});

it('remove o rascunho quando os campos são limpos', () => {
  useMemoryStorage();
  persistOrderDraft('cliente-a', draft);
  persistOrderDraft('cliente-a', {
    ...draft, open: false, wineId: '', qty: '1', purchaseLocation: '',
  });
  expect(readOrderDraft('cliente-a')).toBeNull();
});

it('ignora conteúdo incompleto ou incompatível', () => {
  expect(parseOrderDraft({ ...draft, source: 'INVALIDA' })).toBeNull();
  expect(parseOrderDraft({ ...draft, editing: { orderId: 1 } })).toBeNull();
});

it('preserva o rascunho quando a autenticação expira e é limpa', () => {
  const entries = useMemoryStorage();
  entries.set('vinum_token', 'sessao-expirada');
  entries.set('vinum_user', JSON.stringify({ id: 'cliente-a' }));
  persistOrderDraft('cliente-a', draft);

  clearSession();

  expect(entries.has('vinum_token')).toBe(false);
  expect(entries.has('vinum_user')).toBe(false);
  expect(readOrderDraft('cliente-a')).toEqual(draft);
});
