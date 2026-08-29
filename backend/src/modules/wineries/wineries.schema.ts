import { z } from 'zod';

export const winerySchema = z.object({
  name: z.string().trim().min(2).max(120),
  cnpj: z
    .string()
    .trim()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/),
  city: z.string().trim().min(2).max(100),
  state: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase()),
  email: z.union([z.string().trim().email(), z.literal('')]).optional(),
  wallet: z.string().trim().max(120).optional(),
  status: z.string().trim().min(1).max(30).default('Ativa'),
});

export const wineryUpdateSchema = winerySchema.partial();
