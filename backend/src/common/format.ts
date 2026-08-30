export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function toDate(value: string | Date) {
  if (value instanceof Date) return value;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  return new Date(`${value}T00:00:00.000Z`);
}

export function toInputDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function toPtDate(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(value);
}

export function wineStatusToDatabase(value: string) {
  if (value === 'Ativo' || value === 'PUBLISHED') return 'PUBLISHED';
  if (value === 'Inativo' || value === 'ARCHIVED') return 'ARCHIVED';
  return 'DRAFT';
}

export function wineStatusToView(value: string) {
  if (value === 'PUBLISHED') return 'Ativo';
  return 'Inativo';
}
