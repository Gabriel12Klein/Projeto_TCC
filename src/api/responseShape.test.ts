import { expect, it } from 'vitest';
import { validResponse } from './responseShape';

it('rejeita sucesso malformado antes de renderizar listas', () => {
  for (const value of [null, {}, 'ok', [null], [{ id: 'x' }]])
    expect(validResponse('/catalog/wines', 'GET', value)).toBe(false);
  expect(validResponse('/catalog/wines', 'GET', [])).toBe(true);
  expect(
    validResponse('/cliente/pedidos', 'GET', {
      items: [{ id: 'x', items: null }],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }),
  ).toBe(false);
  expect(validResponse('/cliente/vinicolas-externas', 'GET', [{ id: 'x', name: 'Catena' }])).toBe(true);
  expect(validResponse('/cliente/vinhos-externos?wineryId=x', 'GET', [null])).toBe(false);
  expect(
    validResponse('/cliente/estoque', 'GET', [
      { id: 'x', name: 'Vinho', quantityBottles: '2', movements: [] },
    ]),
  ).toBe(false);
  expect(
    validResponse('/cliente/estoque/resumo?year=2026', 'GET', {
      totals: {
        acquiredBottles: 5,
        consumedBottles: 2,
        availableBottles: 2,
        openedBottles: 1,
        labelCount: 1,
      },
      selectedYear: 2026,
      years: [2026],
      monthlyConsumption: Array.from({ length: 12 }, (_, month) => ({ month: month + 1, bottles: 0 })),
    }),
  ).toBe(true);
  expect(validResponse('/cliente/estoque/resumo', 'GET', { totals: {}, monthlyConsumption: [] })).toBe(false);
});
it('aceita ficha externa individual e campos opcionais nulos', () => {
  const externalWine = {
    id: 'wine-a',
    name: 'DV Catena',
    externalWinery: { id: 'winery-a', name: 'Catena Zapata' },
    vintageYear: 2022,
    grapeLinks: [{ grape: { id: 'grape-a', name: 'Malbec' } }],
    description: null,
    characteristics: null,
    aromas: null,
    tastingNotes: null,
    imagePath: null,
  };
  expect(validResponse('/cliente/vinhos-externos/wine-a', 'GET', externalWine)).toBe(true);
  expect(validResponse('/cliente/vinhos-externos', 'GET', [externalWine])).toBe(true);
  expect(
    validResponse('/cliente/vinhos-externos/wine-a', 'GET', {
      ...externalWine,
      externalWinery: 'winery-a',
    }),
  ).toBe(false);
});
it('preserva respostas vazias de exclusão e rejeita sessão inválida', () => {
  expect(validResponse('/cliente/pedidos/123', 'DELETE', null)).toBe(true);
  expect(validResponse('/auth/login', 'POST', { token: 'x', user: null })).toBe(false);
  expect(
    validResponse('/auth/me', 'GET', { id: 'a', name: 'Cliente', email: 'a@example.test', role: 'CUSTOMER' }),
  ).toBe(true);
});

it('valida a resposta persistida da geração de QR Code', () => {
  const response = {
    path: '/api/catalog/batches/L26001/qr-code',
    targetUrl: 'http://localhost:5173/consulta/lotes/L26001',
    generatedAt: '2026-09-29T21:00:00.000Z',
    created: true,
  };
  expect(validResponse('/lotes/batch-a/qr-code', 'POST', response)).toBe(true);
  expect(validResponse('/lotes/batch-a/qr-code', 'POST', { ...response, targetUrl: null })).toBe(false);
});

it('valida as opções públicas dos filtros do catálogo', () => {
  expect(
    validResponse('/catalog/filters', 'GET', {
      types: [{ id: 'tipo-tinto', name: 'Tinto' }],
      classifications: [{ id: 'classificacao-seco', name: 'Seco' }],
    }),
  ).toBe(true);
  expect(
    validResponse('/catalog/filters', 'GET', {
      types: [{ id: 'tipo-tinto' }],
      classifications: [],
    }),
  ).toBe(false);
});

it('aceita garrafas descartadas no histórico individual', () => {
  expect(
    validResponse('/cliente/estoque/garrafas', 'GET', {
      items: [
        {
          id: 'bottle-a',
          status: 'DESCARTADA',
          discardedAt: '2026-09-29T12:00:00.000Z',
          discardReason: 'Quebra acidental',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }),
  ).toBe(true);
});

it('valida as opções de tipo de vinho da adega', () => {
  expect(validResponse('/cliente/estoque/tipos-vinho', 'GET', [{ id: 'tipo-a', name: 'Tinto' }])).toBe(true);
  expect(validResponse('/cliente/estoque/tipos-vinho', 'GET', [{ id: 'tipo-a' }])).toBe(false);
});
