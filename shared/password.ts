import { z } from 'zod';

export const passwordRules = [
  { label: 'De 8 a 72 caracteres', message: 'Use de 8 a 72 caracteres na senha.', valid: (value: string) => value.length >= 8 && value.length <= 72 },
  { label: 'Uma letra maiúscula', message: 'Inclua pelo menos uma letra maiúscula.', valid: (value: string) => /[A-Z]/.test(value) },
  { label: 'Uma letra minúscula', message: 'Inclua pelo menos uma letra minúscula.', valid: (value: string) => /[a-z]/.test(value) },
  { label: 'Um número', message: 'Inclua pelo menos um número.', valid: (value: string) => /\d/.test(value) },
] as const;
export const passwordSchema = z.string().superRefine((value, ctx) => {
  for (const rule of passwordRules) if (!rule.valid(value)) ctx.addIssue({ code: 'custom', message: rule.message });
});
