import { z } from 'zod';

const orderItemSchema = z.object({
  wineId: z.string().trim().optional(),
  wineName: z.string().trim().min(1).optional(),
  wineryName: z.string().trim().optional(),
  vintageYear: z.coerce.number().int().positive().optional(),
  quantityBottles: z.coerce.number().int().positive(),
  volumeMl: z.coerce.number().int().positive().optional(),
  unitPrice: z.coerce.number().nonnegative().optional(),
});

export const orderSchema = z.object({
  source: z.enum(['VINICULA', 'OUTRO_LOCAL']).default('VINICULA'),
  purchaseDate: z.coerce.date(),
  purchaseLocation: z.string().trim().min(1, 'Informe o local da compra.').max(200),
  notes: z.string().trim().optional(),
  items: z.array(orderItemSchema).min(1),
}).superRefine((input, ctx) => {
  input.items.forEach((item, index) => {
    if (input.source === 'VINICULA' && !item.wineId) ctx.addIssue({ code: 'custom', path: ['items', index, 'wineId'], message: 'Selecione um vinho do catálogo da VINUM.' });
    if (input.source === 'OUTRO_LOCAL' && !item.wineId && !item.wineName) ctx.addIssue({ code: 'custom', path: ['items', index, 'wineName'], message: 'Informe o nome do rótulo externo.' });
  });
});

export const movementSchema = z.object({
  type: z.enum(['CONSUMO', 'ENTRADA', 'AJUSTE']),
  quantityBottles: z.coerce.number().int().nonnegative(),
  reason: z.string().trim().optional(),
}).refine((input) => input.type === 'AJUSTE' || input.quantityBottles > 0, {
  message: 'Entradas e consumos devem ter quantidade maior que zero.',
  path: ['quantityBottles'],
});

export const inventoryCreateSchema = z.object({
  name: z.string().trim().min(1),
  wineryName: z.string().trim().optional(),
  quantityBottles: z.coerce.number().int().positive(),
});

export type OrderInput = z.infer<typeof orderSchema>;
export type MovementInput = z.infer<typeof movementSchema>;
export type InventoryCreateInput = z.infer<typeof inventoryCreateSchema> & { photoPath?: string };
