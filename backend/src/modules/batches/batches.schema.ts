import { z } from 'zod';
import { isBatchCode, normalizeBatchCode } from '../../common/format.js';

const positiveNumber = z.union([z.string(), z.number()]).transform((value, context) => {
  const parsed = Number(String(value).replace(/\./g, '').replace(',', '.'));
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

const time = z
  .string()
  .trim()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Informe um horÃ¡rio vÃ¡lido no formato HH:mm.');

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
  grapeIds: z.array(z.string().trim().min(1)).min(1, 'Selecione pelo menos uma uva.'),
  quantity: positiveNumber,
  productionDate: date,
  bottlingTime: time,
  registrationDate: date,
  status: z.string().trim().min(1).max(40),
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
  })
  .refine((input) => new Date(input.registrationDate) >= new Date(input.productionDate), {
    message: 'A data de registro deve ser posterior ou igual à produção.',
    path: ['registrationDate'],
  });

export const batchUpdateSchema = batchBaseSchema.partial();
