import { expect, it } from 'vitest';
import { validResponse } from './responseShape';

it('rejeita sucesso malformado antes de renderizar listas', () => {
  for (const value of [null, {}, 'ok', [null], [{ id: 'x' }]])
    expect(validResponse('/catalog/wines', 'GET', value)).toBe(false);
  expect(validResponse('/catalog/wines', 'GET', [])).toBe(true);
  expect(validResponse('/cliente/pedidos', 'GET', [{ id: 'x', items: null }])).toBe(false);
  expect(
    validResponse('/cliente/estoque', 'GET', [
      { id: 'x', name: 'Vinho', quantityBottles: '2', movements: [] },
    ]),
  ).toBe(false);
  expect(
    validResponse('/cliente/estoque/resumo?year=2026', 'GET', {
      totals: { acquiredBottles: 5, consumedBottles: 2, availableBottles: 3, labelCount: 1 },
      selectedYear: 2026,
      years: [2026],
      monthlyConsumption: Array.from({ length: 12 }, (_, month) => ({ month: month + 1, bottles: 0 })),
    }),
  ).toBe(true);
  expect(validResponse('/cliente/estoque/resumo', 'GET', { totals: {}, monthlyConsumption: [] })).toBe(false);
});
it('preserva respostas vazias de exclusão e rejeita sessão inválida', () => {
  expect(validResponse('/cliente/pedidos/123', 'DELETE', null)).toBe(true);
  expect(validResponse('/auth/login', 'POST', { token: 'x', user: null })).toBe(false);
  expect(
    validResponse('/auth/me', 'GET', { id: 'a', name: 'Cliente', email: 'a@example.test', role: 'CUSTOMER' }),
  ).toBe(true);
});
