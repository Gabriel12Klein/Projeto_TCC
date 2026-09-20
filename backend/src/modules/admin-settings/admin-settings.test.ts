import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';

const db = vi.hoisted(() => ({
  winery: { findMany: vi.fn(), update: vi.fn() },
  user: { findUniqueOrThrow: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  session: { deleteMany: vi.fn() },
  role: { upsert: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock('../../lib/prisma.js', () => ({ prisma: db }));
import { adminSettingsService } from './admin-settings.service.js';
import { adminSettingsSchema } from './admin-settings.schema.js';
import { ensureSeedAdmin } from '../auth/auth.service.js';

const winery = { id: 'winery-test', name: 'Vinum', cnpj: '', city: '', state: '', email: null };
const account = { id: 'admin-test', name: 'Responsável', email: 'owner@example.test', passwordHash: bcrypt.hashSync('SenhaAtual1', 4), passwordSalt: null, roleRef: { name: 'ADMIN' } };
const payload = () => adminSettingsSchema.parse({ wineryId: winery.id, name: 'Vinum atualizada', cnpj: 'AB.12C.345/6D78-E9', city: 'Bento Gonçalves', state: 'RS', contactEmail: 'contato@example.test', accountName: 'Responsável', loginEmail: account.email, phone: '', currentPassword: '', newPassword: '', confirmPassword: '' });
beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(callback => callback(db));
  db.winery.findMany.mockResolvedValue([winery]);
  db.user.findUniqueOrThrow.mockResolvedValue(account);
  db.user.findFirst.mockResolvedValue(null);
  db.winery.update.mockImplementation(async ({ data }) => ({ ...winery, ...data }));
  db.user.update.mockImplementation(async ({ data }) => ({ ...account, ...data }));
});

describe('Cadastro administrativo', () => {
  it('retorna a vinícola única sem expor credenciais', async () => {
    const result = await adminSettingsService.get(account.id);
    expect(result.winery.name).toBe('Vinum');
    expect(result.account).not.toHaveProperty('passwordHash');
    expect(result.account).not.toHaveProperty('passwordSalt');
  });
  it('não escolhe uma vinícola arbitrária quando há mais de uma', async () => {
    db.winery.findMany.mockResolvedValue([winery, { ...winery, id: 'another' }]);
    await expect(adminSettingsService.update(account.id, 'session', payload())).rejects.toMatchObject({ status: 409 });
    expect(db.winery.update).not.toHaveBeenCalled();
  });
  it('salva nome, contato e CNPJ alfanumérico sem mudar a senha', async () => {
    const result = await adminSettingsService.update(account.id, 'session', payload());
    expect(result.winery).toMatchObject({ name: 'Vinum atualizada', cnpj: 'AB.12C.345/6D78-E9', email: 'contato@example.test' });
    expect(db.user.update.mock.calls[0][0].data).not.toHaveProperty('passwordHash');
    expect(db.session.deleteMany).not.toHaveBeenCalled();
  });
  it('exige senha atual correta ao mudar o e-mail e não faz gravações parciais', async () => {
    await expect(adminSettingsService.update(account.id, 'session', { ...payload(), loginEmail: 'novo@example.test', currentPassword: 'errada' })).rejects.toMatchObject({ status: 400 });
    expect(db.winery.update).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });
  it('altera credenciais com senha atual e preserva apenas a sessão corrente', async () => {
    const result = await adminSettingsService.update(account.id, 'session', { ...payload(), loginEmail: 'novo@example.test', currentPassword: 'SenhaAtual1', newPassword: 'NovaSenha2', confirmPassword: 'NovaSenha2' });
    const written = db.user.update.mock.calls[0][0].data;
    expect(await bcrypt.compare('NovaSenha2', written.passwordHash)).toBe(true);
    expect(written.passwordSalt).toBeNull();
    expect(result.account.email).toBe('novo@example.test');
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: account.id, tokenHash: { not: expect.any(String) } } });
  });
  it('recusa e-mail duplicado antes de alterar o cadastro', async () => {
    db.user.findFirst.mockResolvedValue({ id: 'another' });
    await expect(adminSettingsService.update(account.id, 'session', payload())).rejects.toMatchObject({ status: 409 });
    expect(db.winery.update).not.toHaveBeenCalled();
  });
  it('valida máscara, senha e confirmação no servidor', () => {
    expect(adminSettingsSchema.safeParse({ ...payload(), cnpj: '123' }).success).toBe(false);
    expect(adminSettingsSchema.safeParse({ ...payload(), newPassword: 'Aa1', confirmPassword: 'Aa1' }).success).toBe(false);
    expect(adminSettingsSchema.safeParse({ ...payload(), newPassword: 'NovaSenha2', confirmPassword: 'diferente' }).success).toBe(false);
    expect(adminSettingsSchema.safeParse({ ...payload(), cnpj: '' }).success).toBe(true);
  });
  it('não recria a conta padrão se já há um administrador com e-mail alterado', async () => {
    db.role.upsert.mockResolvedValue({ id: 'role-admin' });
    db.user.findFirst.mockResolvedValue({ ...account, email: 'novo@example.test' });
    await ensureSeedAdmin();
    expect(db.user.create).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });
});
