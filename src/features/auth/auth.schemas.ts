import { z } from 'zod';

export const loginFormSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe a senha.'),
});

export const registerFormSchema = z.object({
  name: z.string().trim().min(3, 'Informe o nome completo.'),
  email: z.string().trim().email('Informe um e-mail válido.'),
  confirmEmail: z.string().trim().email('Confirme o e-mail.'),
  password: z.string().min(8, 'Use pelo menos 8 caracteres.').regex(/[a-z]/).regex(/[A-Z]/).regex(/\d/),
  confirmPassword: z.string(),
}).refine((data) => data.email === data.confirmEmail, {
  message: 'Os e-mails informados não coincidem.', path: ['confirmEmail'],
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas informadas não coincidem.', path: ['confirmPassword'],
});

export type LoginForm = z.infer<typeof loginFormSchema>;
export type RegisterForm = z.infer<typeof registerFormSchema>;
