import { z } from 'zod';

export function formatPhone(value: string) {
  // Preserve invalid pasted content so validation can explain it, rather than
  // silently turning a different number into a valid one.
  if (/[^\d\s().-]/.test(value)) return value;
  const digits = value.replace(/\D/g, '');
  if (digits.length > 11) return value;
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  const local = digits.slice(2);
  const split = digits.length === 11 ? 5 : 4;
  return `(${digits.slice(0, 2)}) ${local.slice(0, split)}${local.length > split ? '-' + local.slice(split) : ''}`;
}

export const phoneSchema = z.string().trim().refine(value => !value || (
  !/[^\d\s().-]/.test(value) && /^[1-9]{2}\d{8,9}$/.test(value.replace(/\D/g, ''))
), 'Informe o telefone com DDD e 10 ou 11 dígitos. Ex.: (55) 99935-4038.').transform(value => value.replace(/\D/g, ''));

export function maskCnpj(value: string) {
  const normalized = value.toUpperCase();
  if (/[^A-Z0-9./\s-]/.test(normalized)) return normalized;
  const raw = normalized.replace(/[./\s-]/g, '');
  if (raw.length > 14) return normalized;
  return raw.replace(/^(.{2})(.)/, '$1.$2').replace(/^(.{2}\..{3})(.)/, '$1.$2')
    .replace(/^(.{2}\..{3}\..{3})(.)/, '$1/$2').replace(/^(.{2}\..{3}\..{3}\/.{4})(.)/, '$1-$2');
}
// Preserve the existing alphanumeric format policy; no new checksum rule.
export const cnpjSchema = z.string().trim().transform(maskCnpj).refine(value => !value || /^[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(value), 'Preencha os 14 caracteres do CNPJ. Ex.: 12.345.678/0001-90.');
