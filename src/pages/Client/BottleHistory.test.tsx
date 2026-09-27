import { describe, expect, it } from 'vitest';
import { formatDate, localDateValue, replaceBottlePreservingOrder, today } from './BottleHistory';
import type { CellarBottle } from '../../types';

describe('histórico individual da adega', () => {
  it('exibe e reutiliza a data civil sem recuo causado pelo fuso', () => {
    expect(formatDate('2026-09-27T00:00:00.000Z')).toBe('27/09/2026');
    expect(localDateValue('2026-09-27T00:00:00.000Z')).toBe('2026-09-27');
    expect(today(new Date('2026-01-01T02:30:00.000Z'))).toBe('2025-12-31');
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
});
