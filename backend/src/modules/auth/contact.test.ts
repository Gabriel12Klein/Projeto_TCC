import { expect, it } from 'vitest';
import { formatPhone, phoneSchema, maskCnpj, cnpjSchema } from '../../../../shared/contact.js';
import { profileSchema } from './auth.schema.js';
import { adminSettingsSchema } from '../admin-settings/admin-settings.schema.js';

it('formata fixo, celular e edição parcial sem perder dígitos excedentes', () => {
  expect(formatPhone('5533334444')).toBe('(55) 3333-4444');
  expect(formatPhone('55999354038')).toBe('(55) 99935-4038');
  expect(formatPhone('(55) 99935-4038')).toBe('(55) 99935-4038');
  expect(formatPhone('55')).toBe('(55');
  expect(formatPhone('')).toBe('');
  expect(formatPhone('559993540389')).toBe('559993540389');
  expect(phoneSchema.safeParse(formatPhone('559993540389')).success).toBe(false);
  expect(phoneSchema.safeParse('ligar 5533334444').success).toBe(false);
  expect(phoneSchema.safeParse('0033334444').success).toBe(false);
});
it('normaliza telefone na API e mantém campos opcionais', () => {
  expect(profileSchema.shape.phone.parse('(55) 3333-4444')).toBe('5533334444');
  expect(adminSettingsSchema.shape.phone.parse('(55) 99935-4038')).toBe('55999354038');
  expect(profileSchema.shape.phone.parse(null)).toBeNull();
  expect(adminSettingsSchema.shape.phone.parse('')).toBe('');
});
it('preserva CNPJ numérico e alfanumérico e não trunca entrada inválida', () => {
  expect(maskCnpj('12345678000190')).toBe('12.345.678/0001-90');
  expect(maskCnpj('ab123cd4000190')).toBe('AB.123.CD4/0001-90');
  expect(cnpjSchema.safeParse('ab123cd4000190').success).toBe(true);
  expect(cnpjSchema.safeParse('').success).toBe(true);
  expect(cnpjSchema.safeParse(maskCnpj('123456780001901')).success).toBe(false);
  expect(cnpjSchema.safeParse(maskCnpj('12#345678000190')).success).toBe(false);
});
