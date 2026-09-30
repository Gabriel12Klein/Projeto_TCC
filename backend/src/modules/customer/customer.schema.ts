import { z } from 'zod';

const orderItemSchema = z.object({
  wineId: z.string().trim().optional(),
  externalWineId: z.string().trim().optional(),
  externalWineryId: z.string().trim().optional(),
  wineName: z.string().trim().min(1).optional(),
  wineryName: z.string().trim().optional(),
  vintageYear: z.coerce.number().int().positive().optional(),
  quantityBottles: z.coerce.number().int().positive(),
  volumeMl: z.coerce.number().int().positive().optional(),
  unitPrice: z.coerce.number().nonnegative().optional(),
});

export const orderSchema = z
  .object({
    source: z.enum(['VINICULA', 'OUTRO_LOCAL']).default('VINICULA'),
    purchaseDate: z.coerce.date(),
    purchaseLocationId: z.string().trim().optional(),
    purchaseLocation: z.string().trim().min(1, 'Informe o local da compra.').max(200).optional(),
    notes: z.string().trim().optional(),
    items: z.array(orderItemSchema).min(1),
  })
  .superRefine((input, ctx) => {
    if (!input.purchaseLocationId && !input.purchaseLocation)
      ctx.addIssue({
        code: 'custom',
        path: ['purchaseLocationId'],
        message: 'Selecione um local de compra.',
      });
    input.items.forEach((item, index) => {
      if (item.wineId && item.externalWineId)
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'wineId'],
          message: 'Selecione apenas um vinho oficial ou externo.',
        });
      if (input.source === 'VINICULA' && (!item.wineId || item.externalWineId))
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'wineId'],
          message: 'Selecione um vinho do catálogo da VINUM.',
        });
      if (input.source === 'OUTRO_LOCAL' && !item.externalWineId && !item.wineName)
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'externalWineId'],
          message: 'Selecione um vinho externo cadastrado.',
        });
      if (input.source === 'OUTRO_LOCAL' && item.wineId)
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'wineId'],
          message: 'O vinho oficial só pode ser usado com o Catálogo da VINUM.',
        });
      if (item.externalWineId && !item.externalWineryId)
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'externalWineryId'],
          message: 'Selecione a vinícola do vinho externo.',
        });
    });
  });

export const privateNameSchema = z.object({
  name: z.string().trim().min(2, 'Informe um nome com pelo menos 2 caracteres.').max(120),
});

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().nullable();

export const privateAddressSchema = privateNameSchema.extend({
  street: optionalText(160),
  neighborhood: optionalText(120),
  city: optionalText(120),
  stateRegion: optionalText(120),
  country: optionalText(120),
});

export const externalWineSchema = privateNameSchema.extend({
  externalWineryId: z.string().trim().min(1, 'Selecione uma vinícola.'),
  vintageYear: z.coerce.number().int().min(1000).max(9999).optional().nullable(),
  grapeIds: z.array(z.string().trim().min(1)).max(30).default([]),
  description: optionalText(5000),
  characteristics: optionalText(5000),
  aromas: optionalText(5000),
  tastingNotes: optionalText(5000),
});

const civilDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function civilDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function todayCivilDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
}

function normalizeCivilDate(value: unknown) {
  if (typeof value !== 'string' || !civilDatePattern.test(value)) return value;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return civilDateKey(parsed) === value ? parsed : new Date(Number.NaN);
}

export const bottleEventSchema = z.object({
  occurredAt: z
    .preprocess(normalizeCivilDate, z.coerce.date())
    .refine((date) => civilDateKey(date) <= todayCivilDate(), 'A data informada não pode estar no futuro.'),
});

export const bottleDiscardSchema = bottleEventSchema.extend({
  reason: z
    .string()
    .trim()
    .min(3, 'Informe o motivo do descarte.')
    .max(500, 'O motivo do descarte deve ter no máximo 500 caracteres.'),
});

const optionalCivilDate = z.preprocess(
  (value) => (value == null || value === '' ? undefined : normalizeCivilDate(value)),
  z.date().optional(),
);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((value) => [10, 20, 50, 100].includes(value), {
      message: 'O limite deve ser 10, 20, 50 ou 100.',
    })
    .default(10),
});

export const bottleListFiltersSchema = z
  .object({
    status: z.enum(['DISPONIVEL', 'ABERTA', 'CONSUMIDA', 'DESCARTADA']).optional(),
    wineTypeId: z.string().trim().min(1).optional(),
    purchasedFrom: optionalCivilDate,
    purchasedTo: optionalCivilDate,
    page: paginationSchema.shape.page,
    limit: paginationSchema.shape.limit,
  })
  .refine(
    ({ purchasedFrom, purchasedTo }) => !purchasedFrom || !purchasedTo || purchasedFrom <= purchasedTo,
    {
      path: ['purchasedTo'],
      message: 'A data inicial não pode ser posterior à data final.',
    },
  );

export type OrderInput = z.infer<typeof orderSchema>;
export type BottleEventInput = z.infer<typeof bottleEventSchema>;
export type BottleDiscardInput = z.infer<typeof bottleDiscardSchema>;
export type BottleListFilters = z.infer<typeof bottleListFiltersSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type PrivateAddressInput = z.infer<typeof privateAddressSchema>;
export type ExternalWineInput = z.infer<typeof externalWineSchema>;
