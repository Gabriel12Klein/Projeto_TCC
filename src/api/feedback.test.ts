import { afterEach, expect, it, vi } from 'vitest';
import { api } from './api';
import { ApiError, networkMessage, responseMessage } from './feedback';

afterEach(() => vi.unstubAllGlobals());
function setup(token: string | null = null) {
  vi.stubGlobal('sessionStorage', { getItem: () => token });
  const events = new EventTarget();
  vi.stubGlobal('window', events);
  return events;
}
it('converte rede indisponível e HTML em recuperação sem detalhes técnicos', async () => {
  setup();
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('ECONNREFUSED')));
  await expect(api.customer.orders()).rejects.toThrow(networkMessage);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>proxy error</html>', { status: 502 })));
  await expect(api.catalog.list()).rejects.toThrow('O serviço não respondeu como esperado');
});
it('preserva erros de campo e distingue login inválido de sessão expirada', async () => {
  const events = setup('token-de-teste');
  const listener = vi.fn(); events.addEventListener('vinum:session-expired', listener);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Confira os dados.', issues: [{ path: ['name'], message: 'Informe seu nome completo.' }] }), { status: 400 })));
  try { await api.customer.orders(); } catch (e) { expect(e).toBeInstanceOf(ApiError); expect((e as ApiError).issues[0].path).toEqual(['name']); }
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify({ message: 'Entre novamente.' }), { status: 401 })));
  await expect(api.login({ email: 'teste@example.test', password: 'invalida' })).rejects.toThrow();
  expect(listener).not.toHaveBeenCalled();
  await expect(api.customer.orders()).rejects.toThrow();
  expect(listener).toHaveBeenCalledOnce();
});
it('não expõe conteúdo técnico devolvido por uma camada intermediária', () => {
  expect(responseMessage(500, 'Prisma stack trace segredo')).not.toMatch(/Prisma|segredo/);
  expect(responseMessage(409, 'SQLSTATE constraint violada')).not.toContain('SQLSTATE');
  expect(responseMessage(400, 'Invalid input: expected string')).not.toContain('expected');
  expect(responseMessage(403, 'Forbidden')).toContain('permissão');
});
it('rejeita sucesso estruturalmente inválido e trata 401 mesmo sem JSON', async () => {
  const events = setup('token-de-teste');
  const listener = vi.fn(); events.addEventListener('vinum:session-expired', listener);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
  await expect(api.catalog.list()).rejects.toThrow('dados incompletos');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Unauthorized</html>', { status: 401 })));
  await expect(api.me()).rejects.toThrow();
  expect(listener).toHaveBeenCalledOnce();
});
