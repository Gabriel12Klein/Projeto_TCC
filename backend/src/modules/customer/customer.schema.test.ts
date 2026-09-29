import { describe, expect, it } from 'vitest';
import {
  bottleDiscardSchema,
  bottleEventSchema,
  bottleListFiltersSchema,
  civilDateKey,
  todayCivilDate,
  paginationSchema,
} from './customer.schema.js';

function addCivilDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return civilDateKey(date);
}

describe('datas civis da adega', () => {
  it('aceita o dia civil atual e o normaliza sem deslocamento de fuso', () => {
    const current = todayCivilDate();
    expect(bottleEventSchema.parse({ occurredAt: current }).occurredAt.toISOString()).toBe(
      `${current}T12:00:00.000Z`,
    );
  });

  it('rejeita amanhã e datas civis inexistentes', () => {
    expect(() => bottleEventSchema.parse({ occurredAt: addCivilDays(todayCivilDate(), 1) })).toThrow(
      'não pode estar no futuro',
    );
    expect(() => bottleEventSchema.parse({ occurredAt: '2026-02-31' })).toThrow();
  });

  it('calcula o dia atual explicitamente no fuso de São Paulo', () => {
    expect(todayCivilDate(new Date('2026-01-01T02:30:00.000Z'))).toBe('2025-12-31');
    expect(todayCivilDate(new Date('2026-01-01T03:30:00.000Z'))).toBe('2026-01-01');
  });

  it('exige e normaliza o motivo do descarte', () => {
    const current = todayCivilDate();
    expect(bottleDiscardSchema.parse({ occurredAt: current, reason: '  Rolha danificada  ' }).reason).toBe(
      'Rolha danificada',
    );
    expect(() => bottleDiscardSchema.parse({ occurredAt: current, reason: '  ' })).toThrow(
      'Informe o motivo do descarte',
    );
  });

  it('aceita intervalos inclusivos e filtros parciais de compra', () => {
    expect(
      bottleListFiltersSchema.parse({ purchasedFrom: '2026-09-27', purchasedTo: '2026-09-27' }),
    ).toMatchObject({
      purchasedFrom: new Date('2026-09-27T12:00:00.000Z'),
      purchasedTo: new Date('2026-09-27T12:00:00.000Z'),
    });
    expect(bottleListFiltersSchema.parse({ purchasedFrom: '2026-09-27' }).purchasedTo).toBeUndefined();
    expect(bottleListFiltersSchema.parse({ purchasedTo: '2026-09-27' }).purchasedFrom).toBeUndefined();
  });

  it('rejeita intervalo invertido e data inexistente', () => {
    expect(() =>
      bottleListFiltersSchema.parse({ purchasedFrom: '2026-09-28', purchasedTo: '2026-09-27' }),
    ).toThrow('A data inicial não pode ser posterior à data final.');
    expect(() => bottleListFiltersSchema.parse({ purchasedFrom: '2026-02-31' })).toThrow();
  });

  it('aplica paginação padrão e aceita somente limites previstos', () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 10 });
    expect(paginationSchema.parse({ page: '3', limit: '20' })).toEqual({ page: 3, limit: 20 });
    expect(() => paginationSchema.parse({ page: 0, limit: 10 })).toThrow();
    expect(() => paginationSchema.parse({ page: 1, limit: 15 })).toThrow(
      'O limite deve ser 10, 20, 50 ou 100.',
    );
  });
});
