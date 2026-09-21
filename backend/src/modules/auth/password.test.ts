import { expect, it } from 'vitest';
import { registerSchema, profileSchema } from './auth.schema.js';
import { adminSettingsSchema } from '../admin-settings/admin-settings.schema.js';

it('aplica as mesmas regras a cadastro, perfil e administrador sem obrigar troca de senha', () => {
  for (const password of ['curta', 'abcdefgh1', 'ABCDEFGH1', 'Abcdefgh', 'Aa1' + 'x'.repeat(70)]) {
    expect(registerSchema.shape.password.safeParse(password).success).toBe(false);
    expect(profileSchema.shape.newPassword.safeParse(password).success).toBe(false);
    expect(adminSettingsSchema.shape.newPassword.safeParse(password).success).toBe(false);
  }
  expect(registerSchema.shape.password.safeParse('Senha123').success).toBe(true);
  expect(profileSchema.shape.newPassword.safeParse('').success).toBe(true);
  expect(adminSettingsSchema.shape.newPassword.safeParse('').success).toBe(true);
});
