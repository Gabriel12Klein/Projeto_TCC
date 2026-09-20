import { z } from 'zod';
import { isBatchCode, normalizeBatchCode } from '../../common/format.js';

const positiveNumber = z.union([z.string(), z.number()]).transform((value, context) => {
  const text = String(value).trim();
  const parsed = Number(text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    context.addIssue({ code: 'custom', message: 'Informe uma quantidade positiva.' });
    return z.NEVER;
  }
  return parsed;
});

const date = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Data inválida.');

const batchCode = z
  .string()
  .trim()
  .transform(normalizeBatchCode)
  .refine(isBatchCode, 'Use o formato L24160: ano com 2 dígitos e dia do ano com 3 dígitos.');

const batchBaseSchema = z.object({
  code: batchCode,
  wineId: z.string().trim().optional(),
  wineName: z.string().trim().optional(),
  vintageId: z.string().trim().optional(),
  vintageName: z.string().trim().optional(),
  grapeIds: z.array(z.string().trim().min(1)).min(1, 'Selecione pelo menos uma uva.').optional(),
  quantity: positiveNumber,
  productionDate: date,
  status: z.enum(['Aguardando registro', 'Registrado na blockchain', 'Publicado para consulta no banco de dados']),
  blockchain: z.string().trim().optional(),
  qrCode: z.string().trim().optional(),
});

export const batchSchema = batchBaseSchema
  .refine((input) => input.wineId || input.wineName, {
    message: 'Informe o vinho relacionado.',
    path: ['wineId'],
  })
  .refine((input) => input.vintageId || input.vintageName, {
    message: 'Informe a safra relacionada.',
    path: ['vintageId'],
  });

export const batchUpdateSchema = batchBaseSchema.partial();
