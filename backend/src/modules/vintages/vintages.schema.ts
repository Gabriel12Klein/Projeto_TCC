import { z } from 'zod';

const year = z
  .union([z.string(), z.number()])
  .transform(Number)
  .refine((value) => Number.isInteger(value) && value >= 1900 && value <= 2100, 'Ano da safra inválido.');

const vintageBaseSchema = z.object({
  identifier: z.string().trim().min(3).max(80),
  wineId: z.string().trim().optional(),
  wineName: z.string().trim().optional(),
  grapeIds: z.array(z.string().trim().min(1)).min(1, 'Selecione pelo menos uma uva.'),
  year,
  supplier: z.string().trim().max(160).optional(),
  observations: z.string().trim().max(1000).optional(),
  status: z.string().trim().min(1).max(40),
});

export const vintageSchema = vintageBaseSchema;

export const vintageUpdateSchema = vintageBaseSchema.partial();
