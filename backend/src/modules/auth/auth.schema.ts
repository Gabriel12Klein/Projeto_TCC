import { z } from 'zod';

const email = z
  .string()
  .trim()
  .email()
  .transform((value) => value.toLowerCase());

const states = new Map([
  ['ACRE', 'AC'],
  ['ALAGOAS', 'AL'],
  ['AMAPA', 'AP'],
  ['AMAZONAS', 'AM'],
  ['BAHIA', 'BA'],
  ['CEARA', 'CE'],
  ['DISTRITO FEDERAL', 'DF'],
  ['ESPIRITO SANTO', 'ES'],
  ['GOIAS', 'GO'],
  ['MARANHAO', 'MA'],
  ['MATO GROSSO', 'MT'],
  ['MATO GROSSO DO SUL', 'MS'],
  ['MINAS GERAIS', 'MG'],
  ['PARA', 'PA'],
  ['PARAIBA', 'PB'],
  ['PARANA', 'PR'],
  ['PERNAMBUCO', 'PE'],
  ['PIAUI', 'PI'],
  ['RIO DE JANEIRO', 'RJ'],
  ['RIO GRANDE DO NORTE', 'RN'],
  ['RIO GRANDE DO SUL', 'RS'],
  ['RONDONIA', 'RO'],
  ['RORAIMA', 'RR'],
  ['SANTA CATARINA', 'SC'],
  ['SAO PAULO', 'SP'],
  ['SERGIPE', 'SE'],
  ['TOCANTINS', 'TO'],
]);

function normalizeState(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  if (normalized.length === 2 && [...states.values()].includes(normalized)) return normalized;
  return states.get(normalized) ?? null;
}

const profileState = z
  .string()
  .trim()
  .max(60)
  .nullable()
  .transform((value, context) => {
    if (!value) return null;
    const normalized = normalizeState(value);
    if (!normalized) {
      context.addIssue({ code: 'custom', message: 'Informe o estado por sigla ou nome completo válido.' });
      return z.NEVER;
    }
    return normalized;
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
});

export const registerSchema = z.object({
  name: z.string().trim().min(3).max(120),
  email,
  password: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .max(72)
    .regex(/[a-z]/, 'Inclua uma letra minúscula.')
    .regex(/[A-Z]/, 'Inclua uma letra maiúscula.')
    .regex(/\d/, 'Inclua um número.'),
});

export const profileSchema = z.object({
  name: z.string().trim().min(3).max(120),
  age: z.number().int().min(0).max(130).nullable(),
  birthDate: z.string().trim().max(10).nullable(),
  street: z.string().trim().max(160).nullable(),
  addressNumber: z
    .string()
    .trim()
    .max(20)
    .regex(/^\d+$/, 'O número da casa deve conter apenas números.')
    .nullable(),
  city: z.string().trim().max(100).nullable(),
  state: profileState,
  country: z.string().trim().max(80).nullable(),
  phone: z.string().trim().max(30).nullable(),
  newPassword: z
    .string()
    .max(72)
    .regex(/[a-z]/, 'Inclua uma letra minúscula.')
    .regex(/[A-Z]/, 'Inclua uma letra maiúscula.')
    .regex(/\d/, 'Inclua um número.')
    .optional()
    .or(z.literal('')),
});
