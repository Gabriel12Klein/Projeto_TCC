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

export const externalWineSchema = privateNameSchema.extend({
  externalWineryId: z.string().trim().min(1, 'Selecione uma vinícola.'),
});

export const bottleEventSchema = z.object({
  occurredAt: z.coerce
    .date()
    .refine((date) => date <= new Date(), 'A data informada não pode estar no futuro.'),
});

export type OrderInput = z.infer<typeof orderSchema>;
export type BottleEventInput = z.infer<typeof bottleEventSchema>;
export type PrivateNameInput = z.infer<typeof privateNameSchema>;
export type ExternalWineInput = z.infer<typeof externalWineSchema>;
