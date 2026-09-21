import { z } from 'zod';
import { passwordSchema } from '../../../../shared/password.js';

export const adminSettingsSchema = z.object({
  wineryId: z.string().min(1),
  name: z.string().trim().min(2, 'Informe o nome da vinícola.').max(120),
  cnpj: z.string().trim().toUpperCase().regex(/^$|^[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-[A-Z0-9]{2}$/, 'Preencha os 14 caracteres do CNPJ.'),
  city: z.string().trim().max(100),
  state: z.string().trim().toUpperCase().regex(/^$|^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/, 'Informe uma UF válida.'),
  contactEmail: z.union([z.string().trim().email('Informe um e-mail de contato válido.').toLowerCase(), z.literal('')]),
  accountName: z.string().trim().min(3, 'Informe o nome do responsável.').max(120),
  loginEmail: z.string().trim().email('Informe um e-mail de acesso válido.').toLowerCase(),
  phone: z.string().trim().max(30),
  currentPassword: z.string().max(200).optional(),
  newPassword: z.union([z.literal(''), passwordSchema]).optional(),
  confirmPassword: z.string().max(72).optional(),
}).superRefine((data, ctx) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'A confirmação da nova senha não confere.' });
});

export type AdminSettingsInput = z.infer<typeof adminSettingsSchema>;
