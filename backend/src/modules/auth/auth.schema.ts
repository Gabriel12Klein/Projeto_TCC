import { z } from 'zod';

const email = z.string().trim().email().transform((value) => value.toLowerCase());

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
});

export const registerSchema = z.object({
  name: z.string().trim().min(3).max(120),
  email,
  password: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .max(72)
    .regex(/[a-z]/, 'Inclua uma letra minúscula.')
    .regex(/[A-Z]/, 'Inclua uma letra maiúscula.')
    .regex(/\d/, 'Inclua um número.'),
});
