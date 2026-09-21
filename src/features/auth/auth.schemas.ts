import { z } from 'zod';
import { passwordSchema } from '../../../shared/password';

export const loginFormSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe a senha.'),
});

export const registerFormSchema = z
  .object({
    name: z.string().trim().min(3, 'Informe o nome completo.').max(120, 'Use até 120 caracteres no nome.'),
    email: z.string().trim().email('Informe um e-mail válido.'),
    confirmEmail: z.string().trim().email('Confirme o e-mail.'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.email.toLowerCase() === data.confirmEmail.toLowerCase(), {
    message: 'Os e-mails informados não coincidem.',
    path: ['confirmEmail'],
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas informadas não coincidem.',
    path: ['confirmPassword'],
  });

export type LoginForm = z.infer<typeof loginFormSchema>;
export type RegisterForm = z.infer<typeof registerFormSchema>;
