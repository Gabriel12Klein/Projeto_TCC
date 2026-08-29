import { z } from 'zod';

const positiveNumber = z.union([z.string(), z.number()]).transform((value, context) => {
  const parsed = Number(String(value).replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    context.addIssue({ code: 'custom', message: 'Informe uma quantidade positiva.' });
    return z.NEVER;
  }
  return parsed;
});

const date = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), 'Data inválida.');

const batchBaseSchema = z.object({
  code: z.string().trim().min(3).max(80),
  vintageId: z.string().trim().optional(),
  vintageName: z.string().trim().optional(),
  quantity: positiveNumber,
  productionDate: date,
  registrationDate: date,
  status: z.string().trim().min(1).max(40),
  blockchain: z.string().trim().optional(),
  qrCode: z.string().trim().optional(),
});

export const batchSchema = batchBaseSchema.refine((input) => input.vintageId || input.vintageName, {
  message: 'Informe a safra relacionada.', path: ['vintageId'],
}).refine((input) => new Date(input.registrationDate) >= new Date(input.productionDate), {
  message: 'A data de registro deve ser posterior ou igual à produção.', path: ['registrationDate'],
});

export const batchUpdateSchema = batchBaseSchema.partial();
