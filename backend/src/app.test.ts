import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from './app.js';
import { prisma } from './lib/prisma.js';
import { ensureSeedAdmin } from './modules/auth/auth.service.js';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

const adminEmail = 'api-' + randomUUID() + '@test.invalid';
const adminPassword = randomUUID() + 'Aa1!';
beforeAll(async () => {
  await ensureSeedAdmin();
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });
  const winery = await prisma.winery.findFirstOrThrow();
  await prisma.user.create({ data: { name: 'Teste API', email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 4), roleId: role.id, wineryId: winery.id } });
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: adminEmail } });
  await prisma.$disconnect();
});

describe('VINUM API', () => {
  it('expõe health e o catálogo sem autenticação', async () => {
    const health = await request(app).get('/api/health').expect(200);
    expect(health.body).toEqual({ ok: true, storage: 'prisma-postgresql' });

    const catalog = await request(app).get('/api/catalog/wines').expect(200);
    expect(Array.isArray(catalog.body)).toBe(true);
    expect(catalog.body.every((wine: { slug?: string }) => Boolean(wine.slug))).toBe(true);
    if (catalog.body[0]) {
      const detail = await request(app).get(`/api/catalog/wines/${catalog.body[0].slug}`).expect(200);
      expect(detail.body.type).toBeTruthy();
      expect(detail.body.grapes).toBeTruthy();
      expect(detail.body).not.toHaveProperty('additionalInfo');
      expect(detail.body).not.toHaveProperty('images');
    }
  });

  it('permite que um administrador consulte os módulos protegidos', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    const response = await request(app)
      .get('/api/vinhos')
      .set('Authorization', `Bearer ${login.body.token}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('impede que clientes acessem a administração', async () => {
    const email = `cliente-test-${Date.now()}@vinum.local`;
    try {
      const registered = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Cliente de Teste', email, password: 'Cliente123' })
        .expect(201);
      expect(registered.body.role).toBe('CUSTOMER');

      const login = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Cliente123' })
        .expect(200);

      const token = `Bearer ${login.body.token}`;
      await request(app).get('/api/vinhos').set('Authorization', token).expect(200);
      await request(app)
        .post('/api/vinhos')
        .set('Authorization', token)
        .send({
          name: `Vinho do Cliente ${Date.now()}`,
          type: 'Tinto',
          grapes: 'Merlot',
          volume: 750,
          alcohol: 13,
          description: 'Vinho criado no fluxo de cliente para teste.',
          status: 'Ativo',
        })
        .expect(403);
    } finally {
      await prisma.user.deleteMany({ where: { email } });
    }
  });
});
