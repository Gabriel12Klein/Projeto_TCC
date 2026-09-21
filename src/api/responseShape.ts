const object = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const records = (value: unknown) => Array.isArray(value) && value.every(object);
const user = (value: unknown) => object(value) && typeof value.id === 'string' && typeof value.name === 'string' && typeof value.email === 'string' && ['ADMIN', 'EDITOR', 'CUSTOMER'].includes(value.role);
const wine = (value: unknown) => object(value) && typeof value.id === 'string' && typeof value.name === 'string' && typeof value.slug === 'string';
const order = (value: unknown) => object(value) && typeof value.id === 'string' && records(value.items) && value.items.every((item: any) => typeof item.wineName === 'string' && Number.isFinite(item.quantityBottles));
const inventory = (value: unknown) => object(value) && typeof value.id === 'string' && typeof value.name === 'string' && Number.isFinite(value.quantityBottles) && Array.isArray(value.movements);

/** Check structures consumed by the UI; never treat a malformed success as empty. */
export function validResponse(path: string, method: string, value: unknown) {
  if (method === 'DELETE') return true;
  const route = path.split('?')[0];
  if (route === '/auth/login') return object(value) && typeof value.token === 'string' && Boolean(value.token) && user(value.user);
  if (route === '/auth/me') return user(value);
  if (route === '/auth/logout') return object(value) && value.ok === true;
  if (route === '/catalog/wines') return Array.isArray(value) && value.every(wine);
  if (route.startsWith('/catalog/wines/')) return wine(value) && object(value) && records(value.vintages) && value.vintages.every((vintage: any) => Array.isArray(vintage.grapes) && records(vintage.batches) && vintage.batches.every((batch: any) => Array.isArray(batch.grapes)));
  if (route.startsWith('/catalog/batches/')) return object(value) && object(value.vintage) && Array.isArray(value.vintage.grapes) && Array.isArray(value.grapes) && (!value.wine || (object(value.wine) && Array.isArray(value.wine.grapes)));
  if (route === '/cliente/pedidos' && method === 'GET') return Array.isArray(value) && value.every(order);
  if (route.startsWith('/cliente/pedidos')) return order(value);
  if (route === '/cliente/estoque' && method === 'GET') return Array.isArray(value) && value.every(inventory);
  // Mutation responses need not include loaded relations.
  if (route.startsWith('/cliente/estoque')) return object(value) && typeof value.id === 'string';
  if (route === '/admin/cadastro') return object(value) && object(value.winery) && user(value.account);
  if (route === '/admin/resumo') return object(value) && ['classifications', 'wines', 'batches', 'vintages', 'grapes', 'wineTypes'].every(key => Number.isFinite(value[key])) && records(value.wineStatuses) && records(value.batchStatuses);
  if (method === 'GET' && /^\/(vinhos|safras|lotes|uvas|tipos-vinho|classificacoes|vinicolas)$/.test(route)) return records(value);
  return object(value);
}
