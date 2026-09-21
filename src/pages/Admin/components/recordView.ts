const referenceLabels: Record<string, string> = { wineId: 'wineName', vintageId: 'vintageName', grapeIds: 'grapes', typeId: 'type', classificationId: 'classification' };
export function recordDetails(config: { fields: { name: string; label: string; type?: string }[]; columns: string[][] }, item: Record<string, unknown>) {
  const entries = new Map<string, { key: string; label: string; value: string }>();
  for (const [key, label] of [...config.columns, ...config.fields.filter(field => field.type !== 'file').map(field => [referenceLabels[field.name] || field.name, field.label])]) {
    if (/Ids?$/.test(key) || key === 'qrCode' || key === 'imageFile') continue;
    const raw = item[key];
    if (raw !== undefined && raw !== null && typeof raw !== 'object') {
      let value = String(raw === '' ? 'Não informado' : raw);
      if (raw !== '' && key === 'volume') value += ' ml';
      if (raw !== '' && key === 'alcohol') value += '% vol';
      if (raw !== '' && key === 'quantity') value += ' L';
      if (/Date$|At$/.test(key) && /^\d{4}-\d{2}-\d{2}/.test(value)) value = value.slice(0, 10).split('-').reverse().join('/');
      entries.set(key, { key, label, value });
    }
  }
  return [...entries.values()];
}
export function filterRecords<T extends Record<string, unknown>>(items: T[], keys: string[], query: string, status: string, sort: string) {
  const normalized = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const filtered = items.filter(item => (!status || item.status === status) && keys.some(key => normalized(item[key]).includes(normalized(query))));
  if (!sort) return filtered;
  const [key, direction] = sort.split(':');
  return filtered.sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'pt-BR', { numeric: true }) * (direction === 'desc' ? -1 : 1));
}
