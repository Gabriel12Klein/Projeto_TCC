import { z } from 'zod';

const email = z
  .string()
  .trim()
  .email()
  .transform((value) => value.toLowerCase());

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
  addressNumber: z.string().trim().max(20).nullable(),
  city: z.string().trim().max(100).nullable(),
  state: z.string().trim().max(60).nullable(),
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
