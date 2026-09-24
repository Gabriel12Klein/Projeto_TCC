import { describe, expect, it } from 'vitest';
import { formatWineryOrigin } from './formatWineryOrigin';

describe('formatWineryOrigin', () => {
  it('não exibe separador de localização quando cidade e UF estão ausentes', () => {
    expect(formatWineryOrigin({ name: 'Vinum', city: '', state: '' })).toBe('Vinum');
  });

  it('preserva cidade e UF quando informadas', () => {
    expect(formatWineryOrigin({ name: 'Vinum', city: 'Bento Gonçalves', state: 'RS' })).toBe('Vinum · Bento Gonçalves/RS');
  });

  it('usa apenas a parte disponível da localização', () => {
    expect(formatWineryOrigin({ name: 'Vinum', city: 'Bento Gonçalves', state: '' })).toBe('Vinum · Bento Gonçalves');
  });
});
