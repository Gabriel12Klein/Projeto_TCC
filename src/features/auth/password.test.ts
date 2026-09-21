import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { passwordRules, passwordSchema } from '../../../shared/password';
import { registerFormSchema, loginFormSchema } from './auth.schemas';
import PasswordInput, { PasswordChecklist } from '../../ui/PasswordInput';

describe('Senhas e cadastro', () => {
  it.each(['curta', 'abcdefgh1', 'ABCDEFGH1', 'Abcdefgh', 'Aa1' + 'x'.repeat(70)])('rejeita %s de forma coerente no cliente e servidor', password => {
    expect(passwordSchema.safeParse(password).success).toBe(false);
    expect(passwordRules.some(rule => !rule.valid(password))).toBe(true);
  });
  it('aceita senha válida e mantém login de senhas legadas', () => {
    expect(passwordSchema.safeParse('Senha123').success).toBe(true);
    expect(loginFormSchema.safeParse({ email: 'pessoa@example.com', password: 'antiga' }).success).toBe(true);
  });
  it('compara e-mails sem distinguir maiúsculas e identifica a confirmação incorreta', () => {
    const form = { name: 'Cliente VINUM', email: 'Pessoa@example.com', confirmEmail: 'pessoa@example.com', password: 'Senha123', confirmPassword: 'Senha123' };
    expect(registerFormSchema.safeParse(form).success).toBe(true);
    const result = registerFormSchema.safeParse({ ...form, confirmPassword: 'outra' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(['confirmPassword']);
  });
  it('renderiza senha oculta, botão que não submete e requisitos acessíveis', () => {
    const html = renderToStaticMarkup(createElement(PasswordInput, { id: 'senha', defaultValue: 'Senha123', visibilityLabel: 'nova senha' }));
    expect(html).toContain('type="password"');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-controls="senha"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('Mostrar nova senha');
    const checklist = renderToStaticMarkup(createElement(PasswordChecklist, { value: 'Senha123' }));
    expect(checklist.match(/: atendido/g)).toHaveLength(4);
  });
});
