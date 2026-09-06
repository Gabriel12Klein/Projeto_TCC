import { z } from 'zod';
import { isVintageIdentifier, normalizeVintageIdentifier } from '../../common/format.js';

const year = z
  .union([z.string(), z.number()])
  .transform(Number)
  .refine((value) => Number.isInteger(value) && value >= 1900 && value <= 2100, 'Ano da safra inválido.');

const vintageIdentifier = z
  .string()
  .trim()
  .transform(normalizeVintageIdentifier)
  .refine(isVintageIdentifier, 'Use o formato SF22-T04: ano e código do tanque com 2 dígitos.');

const vintageBaseSchema = z.object({
  identifier: vintageIdentifier,
  wineId: z.string().trim().optional(),
  wineName: z.string().trim().optional(),
  grapeIds: z.array(z.string().trim().min(1)).optional(),
  year,
  supplier: z.string().trim().max(160).optional(),
  observations: z.string().trim().max(1000).optional(),
  status: z.string().trim().min(1).max(40),
});

export const vintageSchema = vintageBaseSchema;

export const vintageUpdateSchema = vintageBaseSchema.partial();
