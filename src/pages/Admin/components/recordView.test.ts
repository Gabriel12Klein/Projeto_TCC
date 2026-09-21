import { expect, it } from 'vitest';
import { filterRecords, recordDetails } from './recordView';

it('detalhes usam nomes, unidades e texto completo sem IDs internos', () => {
  const result = recordDetails({ fields: [{ name: 'wineId', label: 'Vinho' }, { name: 'grapeIds', label: 'Uvas' }, { name: 'observations', label: 'Observações' }], columns: [['quantity', 'Quantidade'], ['productionDate', 'Produção']] }, { wineId: 'uuid-secreto', wineName: 'Reserva', grapeIds: ['uuid-uva'], grapes: 'Merlot', quantity: 50, productionDate: '2026-09-21', observations: 'Texto completo '.repeat(30) });
  expect(JSON.stringify(result)).not.toContain('uuid');
  expect(result.find(row => row.key === 'wineName')?.value).toBe('Reserva');
  expect(result.find(row => row.key === 'quantity')?.value).toBe('50 L');
  expect(result.find(row => row.key === 'productionDate')?.value).toBe('21/09/2026');
  expect(result.find(row => row.key === 'observations')?.value).toBe('Texto completo '.repeat(30));
});
it('filtra texto sem acentos, situação e ordena sem modificar a lista original', () => {
  const items = [{ name: 'Água', status: 'Ativo', id: 'interno' }, { name: 'Reserva 10', status: 'Inativo' }, { name: 'Reserva 2', status: 'Ativo' }];
  expect(filterRecords(items, ['name'], 'agua', 'Ativo', '')).toHaveLength(1);
  expect(filterRecords(items, ['name'], 'interno', '', '')).toHaveLength(0);
  expect(filterRecords(items, ['name'], 'reserva', '', 'name:asc').map(row => row.name)).toEqual(['Reserva 2', 'Reserva 10']);
  expect(items[1].name).toBe('Reserva 10');
});
