import { describe, expect, it } from 'vitest';
import type { CellarBottle } from '../../types';
import { replaceBottlePreservingOrder } from './BottleHistory';

function bottle(id: string, status: CellarBottle['status'], bottleNumber: number) {
  return { id, status, bottleNumber } as CellarBottle;
}

describe('ordem visual do histórico de garrafas', () => {
  it('atualiza o item sem mudar sua posição quando o filtro é Todos', () => {
    const current = [bottle('a', 'DISPONIVEL', 1), bottle('b', 'DISPONIVEL', 2), bottle('c', 'ABERTA', 3)];
    const result = replaceBottlePreservingOrder(current, bottle('b', 'ABERTA', 0), '');
    expect(result?.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    expect(result?.[1]).toMatchObject({ id: 'b', status: 'ABERTA', bottleNumber: 2 });
  });

  it('remove o item quando ele deixa de pertencer ao filtro específico', () => {
    const current = [bottle('a', 'DISPONIVEL', 1), bottle('b', 'DISPONIVEL', 2)];
    const result = replaceBottlePreservingOrder(current, bottle('b', 'ABERTA', 0), 'DISPONIVEL');
    expect(result?.map(({ id }) => id)).toEqual(['a']);
  });
});
