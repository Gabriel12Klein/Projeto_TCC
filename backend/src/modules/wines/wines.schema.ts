import { z } from 'zod';

const decimal = z.union([z.string(), z.number()]).transform((value, context) => {
  const parsed = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    context.addIssue({ code: 'custom', message: 'Informe um número positivo.' });
    return z.NEVER;
  }
  return parsed;
});

export const wineSchema = z.object({
  wineryId: z.string().trim().optional(),
  name: z.string().trim().min(2).max(150),
  type: z.string().trim().min(2).max(40),
  grapes: z.string().trim().min(2).max(300),
  volume: decimal,
  alcohol: decimal.refine((value) => value <= 100, 'Teor alcoólico inválido.'),
  description: z.string().trim().min(10).max(2000),
  imageName: z.string().trim().optional(),
  status: z.string().trim().min(1).max(40),
});

export const wineUpdateSchema = wineSchema.partial();
