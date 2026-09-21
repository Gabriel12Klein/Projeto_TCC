import express from 'express';
import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { errorHandler } from './http.js';

function failing(error: unknown) {
  const app = express(); app.get('/', (_req, _res, next) => next(error)); app.use(errorHandler); return app;
}
it('traduz validações padrão e preserva paths sem expor valores recebidos', async () => {
  const result = z.object({ email: z.email(), name: z.string().min(3) }).safeParse({ email: 'invalido', name: '' });
  const response = await request(failing(result.error)).get('/').expect(400);
  expect(response.body.issues[0]).toMatchObject({ path: ['email'], message: 'Informe um e-mail válido, como nome@exemplo.com.' });
  expect(JSON.stringify(response.body)).not.toMatch(/Invalid|Too small|expected|received/);
});
it('oculta nomes internos em conflitos e distingue indisponibilidade', async () => {
  const error = new Prisma.PrismaClientKnownRequestError('SQL com segredo', { code: 'P2002', clientVersion: 'test', meta: { target: ['usuario_hash_secreto_key'] } });
  const conflict = await request(failing(error)).get('/').expect(409);
  expect(JSON.stringify(conflict.body)).not.toMatch(/segredo|usuario_hash|SQL/);
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const response = await request(failing(Object.assign(new Error('senha_secreta'), { code: 'ECONNREFUSED' }))).get('/').expect(503);
    expect(response.body.message).toContain('tente novamente');
    expect(JSON.stringify(log.mock.calls)).not.toContain('senha_secreta');
  } finally { log.mockRestore(); }
});
