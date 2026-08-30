import { z } from 'zod';

export const referenceSchema = z.object({
  name: z.string().trim().min(2, 'Informe um nome com pelo menos 2 caracteres.').max(100),
  description: z.string().trim().max(500).optional(),
  status: z.enum(['Ativo', 'Inativo']).optional(),
});

export const referenceUpdateSchema = referenceSchema.partial();
