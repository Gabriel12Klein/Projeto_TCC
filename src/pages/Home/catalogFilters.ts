export const CATALOG_SEARCH_MIN_LENGTH = 3;
export const CATALOG_SEARCH_DEBOUNCE_MS = 300;

export function catalogSearchQuery(value: string) {
  const query = value.trim();
  return query.length >= CATALOG_SEARCH_MIN_LENGTH ? query : '';
}
