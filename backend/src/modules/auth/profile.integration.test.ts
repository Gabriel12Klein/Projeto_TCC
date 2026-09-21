import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { ageFromBirthDate } from '../../../../shared/profile.js';

const originalEmail = randomUUID() + '@profile.test';
const changedEmail = randomUUID() + '@profile.test';
const otherEmail = randomUUID() + '@profile.test';
const password = randomUUID() + 'Aa1!';
let token: string, oldToken: string, id: string;
const data = { name: 'Cliente do teste', birthDate: '2000-01-01', phone: '(51) 99999-9999', street: 'Rua Teste', addressNumber: '10', city: 'Porto Alegre', state: 'RS', country: 'Brasil' };
beforeAll(async () => {
  id = (await request(app).post('/api/auth/register').send({ name: data.name, email: originalEmail, password }).expect(201)).body.id;
  await request(app).post('/api/auth/register').send({ name: 'Outro cliente', email: otherEmail, password }).expect(201);
  oldToken = (await request(app).post('/api/auth/login').send({ email: originalEmail, password }).expect(200)).body.token;
  token = (await request(app).post('/api/auth/login').send({ email: originalEmail, password }).expect(200)).body.token;
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [originalEmail, changedEmail, otherEmail] } } });
  await prisma.$disconnect();
});
it('persiste perfil, calcula idade e não aceita sobrescrever outro usuário', async () => {
  const hash = (await prisma.user.findUniqueOrThrow({ where: { id } })).passwordHash;
  const result = await request(app).patch('/api/auth/me').set('Authorization', 'Bearer ' + token)
    .send({ ...data, email: originalEmail, age: 99, userId: 'outro', role: 'ADMIN', newPassword: '' }).expect(200);
  expect(result.body).toMatchObject({ id, role: 'CUSTOMER', age: ageFromBirthDate(data.birthDate), street: data.street });
  const saved = await prisma.user.findUniqueOrThrow({ where: { id } });
  expect(saved.age).toBeNull();
  expect(saved.passwordHash).toBe(hash);
  expect((await prisma.user.findUniqueOrThrow({ where: { email: otherEmail } })).street).toBeNull();
  await request(app).patch('/api/auth/me').set('Authorization', 'Bearer ' + token).send({ ...data, birthDate: '2026-02-31' }).expect(400);
  await request(app).patch('/api/auth/me').set('Authorization', 'Bearer ' + token).send({ ...data, birthDate: '2099-01-01' }).expect(400);
});
it('protege troca de e-mail, unicidade e invalida outras sessões', async () => {
  await request(app).patch('/api/auth/me').set('Authorization', 'Bearer ' + token).send({ ...data, email: changedEmail }).expect(400);
  await request(app).patch('/api/auth/me').set('Authorization', 'Bearer ' + token).send({ ...data, email: otherEmail, currentPassword: password }).expect(409);
  await request(app).patch('/api/auth/me').set('Authorization', 'Bearer ' + token).send({ ...data, email: changedEmail, currentPassword: password }).expect(200);
  await request(app).get('/api/auth/me').set('Authorization', 'Bearer ' + oldToken).expect(401);
  await request(app).post('/api/auth/logout').set('Authorization', 'Bearer ' + token).expect(200);
  await request(app).post('/api/auth/login').send({ email: originalEmail, password }).expect(401);
  const login = await request(app).post('/api/auth/login').send({ email: changedEmail, password }).expect(200);
  expect(login.body.user).toMatchObject({ id, street: data.street, phone: '51999999999' });
});
