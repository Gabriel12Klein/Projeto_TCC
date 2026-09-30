const object = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const records = (value: unknown) => Array.isArray(value) && value.every(object);
const paginated = (value: unknown, item: (entry: any) => boolean) =>
  object(value) &&
  Array.isArray(value.items) &&
  value.items.every(item) &&
  Number.isInteger(value.total) &&
  Number.isInteger(value.page) &&
  [10, 20, 50, 100].includes(value.limit) &&
  Number.isInteger(value.totalPages);
const user = (value: unknown) =>
  object(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.email === 'string' &&
  ['ADMIN', 'EDITOR', 'CUSTOMER'].includes(value.role);
const wine = (value: unknown) =>
  object(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.slug === 'string';
const order = (value: unknown) =>
  object(value) &&
  typeof value.id === 'string' &&
  records(value.items) &&
  value.items.every(
    (item: any) => typeof item.wineName === 'string' && Number.isFinite(item.quantityBottles),
  );
const inventory = (value: unknown) =>
  object(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  Number.isFinite(value.quantityBottles) &&
  Array.isArray(value.movements);
const inventoryDashboard = (value: unknown) =>
  object(value) &&
  object(value.totals) &&
  ['acquiredBottles', 'consumedBottles', 'availableBottles', 'openedBottles', 'labelCount'].every((key) =>
    Number.isFinite(value.totals[key]),
  ) &&
  Number.isInteger(value.selectedYear) &&
  Array.isArray(value.years) &&
  value.years.every(Number.isInteger) &&
  Array.isArray(value.monthlyConsumption) &&
  value.monthlyConsumption.length === 12 &&
  value.monthlyConsumption.every(
    (point: unknown) => object(point) && Number.isInteger(point.month) && Number.isFinite(point.bottles),
  );
const optionalText = (value: unknown) => value == null || typeof value === 'string';
const externalWine = (value: unknown) =>
  object(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  object(value.externalWinery) &&
  typeof value.externalWinery.id === 'string' &&
  typeof value.externalWinery.name === 'string' &&
  (value.vintageYear == null || Number.isInteger(value.vintageYear)) &&
  ['description', 'characteristics', 'aromas', 'tastingNotes', 'imagePath'].every((key) =>
    optionalText(value[key]),
  ) &&
  records(value.grapeLinks) &&
  value.grapeLinks.every(
    (link: any) =>
      object(link.grape) && typeof link.grape.id === 'string' && typeof link.grape.name === 'string',
  );

/** Check structures consumed by the UI; never treat a malformed success as empty. */
export function validResponse(path: string, method: string, value: unknown) {
  if (method === 'DELETE') return true;
  const route = path.split('?')[0];
  if (route === '/auth/login')
    return object(value) && typeof value.token === 'string' && Boolean(value.token) && user(value.user);
  if (route === '/auth/me') return user(value);
  if (route === '/auth/logout') return object(value) && value.ok === true;
  if (/^\/lotes\/[^/]+\/qr-code$/.test(route) && method === 'POST')
    return (
      object(value) &&
      typeof value.path === 'string' &&
      typeof value.targetUrl === 'string' &&
      typeof value.generatedAt === 'string' &&
      typeof value.created === 'boolean'
    );
  if (route === '/catalog/wines') return Array.isArray(value) && value.every(wine);
  if (route === '/catalog/filters')
    return (
      object(value) &&
      ['types', 'classifications'].every(
        (key) =>
          Array.isArray(value[key]) &&
          value[key].every(
            (option: unknown) =>
              object(option) && typeof option.id === 'string' && typeof option.name === 'string',
          ),
      )
    );
  if (route.startsWith('/catalog/wines/'))
    return (
      wine(value) &&
      object(value) &&
      records(value.vintages) &&
      value.vintages.every(
        (vintage: any) =>
          Array.isArray(vintage.grapes) &&
          records(vintage.batches) &&
          vintage.batches.every((batch: any) => Array.isArray(batch.grapes)),
      )
    );
  if (route.startsWith('/catalog/batches/'))
    return (
      object(value) &&
      object(value.vintage) &&
      Array.isArray(value.vintage.grapes) &&
      Array.isArray(value.grapes) &&
      (!value.wine || (object(value.wine) && Array.isArray(value.wine.grapes)))
    );
  if (route === '/cliente/pedidos' && method === 'GET') return paginated(value, order);
  if (route.startsWith('/cliente/pedidos')) return order(value);
  if (route === '/cliente/vinhos-externos' && method === 'GET')
    return Array.isArray(value) && value.every(externalWine);
  if (/^\/cliente\/vinhos-externos\/[^/]+$/.test(route) && method === 'GET') return externalWine(value);
  if (/^\/cliente\/(vinicolas-externas|vinhos-externos|locais-compra)(\/[^/]+)?$/.test(route)) {
    if (method === 'GET') return records(value);
    return object(value) && typeof value.id === 'string' && typeof value.name === 'string';
  }
  if (route === '/cliente/estoque' && method === 'GET') return Array.isArray(value) && value.every(inventory);
  if (route === '/cliente/estoque/resumo' && method === 'GET') return inventoryDashboard(value);
  if (route === '/cliente/estoque/tipos-vinho' && method === 'GET')
    return (
      Array.isArray(value) &&
      value.every(
        (wineType) =>
          object(wineType) && typeof wineType.id === 'string' && typeof wineType.name === 'string',
      )
    );
  if (route === '/cliente/estoque/garrafas' && method === 'GET')
    return paginated(
      value,
      (bottle) =>
        object(bottle) &&
        typeof bottle.id === 'string' &&
        ['DISPONIVEL', 'ABERTA', 'CONSUMIDA', 'DESCARTADA'].includes(bottle.status),
    );
  // Mutation responses need not include loaded relations.
  if (route.startsWith('/cliente/estoque')) return object(value) && typeof value.id === 'string';
  if (route === '/admin/cadastro') return object(value) && object(value.winery) && user(value.account);
  if (route === '/admin/resumo')
    return (
      object(value) &&
      ['classifications', 'wines', 'batches', 'vintages', 'grapes', 'wineTypes'].every((key) =>
        Number.isFinite(value[key]),
      ) &&
      records(value.wineStatuses) &&
      records(value.batchStatuses)
    );
  if (method === 'GET' && /^\/(vinhos|safras|lotes|uvas|tipos-vinho|classificacoes|vinicolas)$/.test(route))
    return records(value);
  return object(value);
}
