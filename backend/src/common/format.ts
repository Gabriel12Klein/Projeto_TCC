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

export function normalizeBatchCode(value: string) {
  const raw = String(value ?? '').trim().toUpperCase();
  const digits = raw.replace(/\D/g, '').slice(0, 5);
  return digits ? `L${digits}` : '';
}

export function isBatchCode(value: string) {
  const match = /^L\d{2}(\d{3})$/.exec(String(value ?? '').trim().toUpperCase());
  if (!match) return false;
  const year = 2000 + Number(String(value).slice(1, 3));
  const dayOfYear = Number(match[1]);
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return dayOfYear >= 1 && dayOfYear <= (isLeapYear ? 366 : 365);
}

export function batchCodeToProductionDate(value: string) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!isBatchCode(normalized)) return null;
  const year = 2000 + Number(normalized.slice(1, 3));
  const dayOfYear = Number(normalized.slice(3));
  const date = new Date(Date.UTC(year, 0, 1));
  date.setUTCDate(dayOfYear);
  return date.toISOString().slice(0, 10);
}

export function normalizeVintageIdentifier(value: string) {
  const raw = String(value ?? '').trim().toUpperCase();
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits ? `SF${digits}` : '';
  return `SF${digits.slice(0, 2)}-T${digits.slice(2)}`;
}

export function isVintageIdentifier(value: string) {
  return /^SF\d{2}-T\d{2}$/.test(String(value ?? '').trim().toUpperCase());
}

export function vintageIdentifierToYear(value: string) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!isVintageIdentifier(normalized)) return null;
  return 2000 + Number(normalized.slice(2, 4));
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
