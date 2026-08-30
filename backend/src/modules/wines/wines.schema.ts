import { z } from 'zod';

const decimal = z.union([z.string(), z.number()]).transform((value, context) => {
  const parsed = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    context.addIssue({ code: 'custom', message: 'Informe um número positivo.' });
    return z.NEVER;
  }
  return parsed;
});

const wineFields = z.object({
  wineryId: z.string().trim().optional(),
  name: z.string().trim().min(2).max(150),
  type: z.string().trim().min(2).max(40).optional(),
  typeId: z.string().trim().min(1).optional(),
  grapes: z.string().trim().min(2).max(300).optional(),
  grapeIds: z.array(z.string().trim().min(1)).min(1).optional(),
  volume: decimal,
  alcohol: decimal.refine((value) => value <= 100, 'Teor alcoólico inválido.'),
  description: z.string().trim().min(10).max(2000),
  characteristics: z.string().trim().max(2000).optional(),
  aromas: z.string().trim().max(2000).optional(),
  tastingNotes: z.string().trim().max(2000).optional(),
  pairing: z.string().trim().max(2000).optional(),
  additionalInfo: z.string().trim().max(2000).optional(),
  imageName: z.string().trim().optional(),
  status: z.string().trim().min(1).max(40),
});

export const wineSchema = wineFields.superRefine((value, context) => {
  if (!value.type && !value.typeId) {
    context.addIssue({ code: 'custom', path: ['typeId'], message: 'Selecione o tipo do vinho.' });
  }
  if (!value.grapes && !value.grapeIds?.length) {
    context.addIssue({ code: 'custom', path: ['grapeIds'], message: 'Selecione pelo menos uma uva.' });
  }
});

export const wineUpdateSchema = wineFields.partial();
