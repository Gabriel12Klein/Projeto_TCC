import { z } from 'zod';

const year = z
  .union([z.string(), z.number()])
  .transform(Number)
  .refine((value) => Number.isInteger(value) && value >= 1900 && value <= 2100, 'Ano da safra inválido.');

const vintageBaseSchema = z.object({
  identifier: z.string().trim().min(3).max(80),
  wineId: z.string().trim().optional(),
  wineName: z.string().trim().optional(),
  year,
  observations: z.string().trim().max(1000).optional(),
  status: z.string().trim().min(1).max(40),
});

export const vintageSchema = vintageBaseSchema.refine((input) => input.wineId || input.wineName, {
  message: 'Informe o vinho relacionado.',
  path: ['wineId'],
});

export const vintageUpdateSchema = vintageBaseSchema.partial();
