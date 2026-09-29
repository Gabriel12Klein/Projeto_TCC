import { expect, it } from 'vitest';
import { validResponse } from './responseShape';

it('rejeita sucesso malformado antes de renderizar listas', () => {
  for (const value of [null, {}, 'ok', [null], [{ id: 'x' }]])
    expect(validResponse('/catalog/wines', 'GET', value)).toBe(false);
  expect(validResponse('/catalog/wines', 'GET', [])).toBe(true);
  expect(validResponse('/cliente/pedidos', 'GET', [{ id: 'x', items: null }])).toBe(false);
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

it('aceita garrafas descartadas no histórico individual', () => {
  expect(
    validResponse('/cliente/estoque/garrafas', 'GET', [
      {
        id: 'bottle-a',
        status: 'DESCARTADA',
        discardedAt: '2026-09-29T12:00:00.000Z',
        discardReason: 'Quebra acidental',
      },
    ]),
  ).toBe(true);
});
