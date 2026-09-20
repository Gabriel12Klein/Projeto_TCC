import { expect, it } from 'vitest';
import { selectVintage } from './selection';
it('seleciona somente uma safra válida e nunca escolhe arbitrariamente entre várias', () => {
  const a = { value: 's1', wineId: 'w1' }, b = { value: 's2', wineId: 'w1' }, c = { value: 's3', wineId: 'w2' };
  const grapes = { s1: ['g1'], s2: ['g2'], s3: ['g3'] };
  expect(selectVintage('w1', [a,c], grapes)).toEqual({ vintageId: 's1', grapeIds: ['g1'] });
  expect(selectVintage('w1', [a,b,c], grapes)).toEqual({ vintageId: '', grapeIds: [] });
  expect(selectVintage('w1', [a,b,c], grapes, 's2')).toEqual({ vintageId: 's2', grapeIds: ['g2'] });
  expect(selectVintage('w3', [a,b,c], grapes, 's3')).toEqual({ vintageId: '', grapeIds: [] });
});
