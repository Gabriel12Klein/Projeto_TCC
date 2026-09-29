import { describe, expect, it } from 'vitest';
import {
  bottleVintageYear,
  bottleActions,
  formatDate,
  localDateValue,
  purchaseDateRangeError,
  replaceBottleInPage,
  replaceBottlePreservingOrder,
  today,
} from './BottleHistory';
import type { CellarBottle } from '../../types';

describe('histórico individual da adega', () => {
  it('oferece somente as ações válidas em cada estado', () => {
    expect(bottleActions('DISPONIVEL')).toEqual({ open: true, finish: false, discard: true, remove: true });
    expect(bottleActions('ABERTA')).toEqual({ open: false, finish: true, discard: true, remove: false });
    expect(bottleActions('CONSUMIDA')).toEqual({ open: false, finish: false, discard: false, remove: false });
    expect(bottleActions('DESCARTADA')).toEqual({
      open: false,
      finish: false,
      discard: false,
      remove: false,
    });
  });
  it('exibe e reutiliza a data civil sem recuo causado pelo fuso', () => {
    expect(formatDate('2026-09-27T00:00:00.000Z')).toBe('27/09/2026');
    expect(localDateValue('2026-09-27T00:00:00.000Z')).toBe('2026-09-27');
    expect(today(new Date('2026-01-01T02:30:00.000Z'))).toBe('2025-12-31');
  });

  it('valida o intervalo de compra antes de consultar o backend', () => {
    expect(purchaseDateRangeError('2026-09-27', '2026-09-27')).toBe('');
    expect(purchaseDateRangeError('2026-09-27', '')).toBe('');
    expect(purchaseDateRangeError('', '2026-09-27')).toBe('');
    expect(purchaseDateRangeError('2026-09-28', '2026-09-27')).toBe(
      'A data inicial não pode ser posterior à data final.',
    );
  });

  it('preserva a posição da garrafa ao atualizar com o filtro Todos', () => {
    const first = { id: 'a', bottleNumber: 1, status: 'DISPONIVEL' } as CellarBottle;
    const second = { id: 'b', bottleNumber: 2, status: 'DISPONIVEL' } as CellarBottle;
    const updated = { ...first, status: 'ABERTA', bottleNumber: 99 } as CellarBottle;
    expect(replaceBottlePreservingOrder([first, second], updated, '')).toEqual([
      { ...updated, bottleNumber: 1 },
      second,
    ]);
  });

  it('mantém o descarte na posição atual e o remove de filtros incompatíveis', () => {
    const first = { id: 'a', bottleNumber: 1, status: 'ABERTA' } as CellarBottle;
    const second = { id: 'b', bottleNumber: 2, status: 'DISPONIVEL' } as CellarBottle;
    const discarded = { ...first, status: 'DESCARTADA', discardReason: 'Oxidação' } as CellarBottle;
    expect(replaceBottlePreservingOrder([first, second], discarded, '')).toEqual([discarded, second]);
    expect(replaceBottlePreservingOrder([first], discarded, 'ABERTA')).toEqual([]);
  });

  it('atualiza totais da página quando a alteração deixa o filtro atual', () => {
    const bottle = { id: 'a', bottleNumber: 1, status: 'ABERTA' } as CellarBottle;
    const updated = { ...bottle, status: 'CONSUMIDA' } as CellarBottle;
    expect(
      replaceBottleInPage(
        { items: [bottle], total: 11, page: 2, limit: 10, totalPages: 2 },
        updated,
        'ABERTA',
      ),
    ).toEqual({ items: [], total: 10, page: 2, limit: 10, totalPages: 1 });
  });

  it('usa a safra do cadastro privado para vinho externo e a do item para vinho oficial', () => {
    const external = {
      orderItem: {
        externalWineId: 'external-a',
        vintageYear: null,
        externalWine: { vintageYear: 2022 },
      },
    } as CellarBottle;
    const externalWithoutVintage = {
      orderItem: {
        externalWineId: 'external-b',
        vintageYear: 1999,
        externalWine: { vintageYear: null },
      },
    } as CellarBottle;
    const official = {
      orderItem: { externalWineId: null, vintageYear: 2021, externalWine: null },
    } as CellarBottle;
    const unambiguousLegacyOfficial = {
      orderItem: { externalWineId: null, vintageYear: null, externalWine: null },
      inventoryItem: { wine: { vintages: [{ year: 2024 }] } },
    } as CellarBottle;
    const ambiguousLegacyOfficial = {
      orderItem: { externalWineId: null, vintageYear: null, externalWine: null },
      inventoryItem: { wine: { vintages: [{ year: 2024 }, { year: 2022 }] } },
    } as CellarBottle;
    expect(bottleVintageYear(external)).toBe(2022);
    expect(bottleVintageYear(externalWithoutVintage)).toBeNull();
    expect(bottleVintageYear(official)).toBe(2021);
    expect(bottleVintageYear(unambiguousLegacyOfficial)).toBe(2024);
    expect(bottleVintageYear(ambiguousLegacyOfficial)).toBeNull();
  });
});
