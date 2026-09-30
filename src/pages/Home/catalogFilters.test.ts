import { describe, expect, it } from 'vitest';
import { CATALOG_SEARCH_DEBOUNCE_MS, catalogSearchQuery } from './catalogFilters';

describe('filtro por nome do catálogo público', () => {
  it('só envia a busca a partir do terceiro caractere', () => {
    expect(catalogSearchQuery('V')).toBe('');
    expect(catalogSearchQuery('Vi')).toBe('');
    expect(catalogSearchQuery('Vin')).toBe('Vin');
    expect(catalogSearchQuery('  mon  ')).toBe('mon');
  });

  it('usa debounce curto sem atrasar excessivamente a pesquisa', () => {
    expect(CATALOG_SEARCH_DEBOUNCE_MS).toBeGreaterThanOrEqual(250);
    expect(CATALOG_SEARCH_DEBOUNCE_MS).toBeLessThanOrEqual(400);
  });
});
