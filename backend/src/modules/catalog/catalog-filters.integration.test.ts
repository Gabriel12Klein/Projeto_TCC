import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { prisma } from '../../lib/prisma.js';

const suffix = randomUUID().slice(0, 8);
const typeNames = [`Tinto filtro ${suffix}`, `Branco filtro ${suffix}`];
const classificationNames = [`Seco filtro ${suffix}`, `Suave filtro ${suffix}`];
const officialNames = [
  `Coração Monte Nobre ${suffix}`,
  `Reserva do Vale ${suffix}`,
  `Brisa Clara ${suffix}`,
  `Outro Rótulo ${suffix}`,
];
const createdWineIds: string[] = [];
let typeIds: string[] = [];
let classificationIds: string[] = [];
let customerId = '';

function names(response: request.Response) {
  return response.body.map((wine: { name: string }) => wine.name);
}

beforeAll(async () => {
  const winery = await prisma.winery.findFirstOrThrow();
  const customerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'CUSTOMER' } });
  const [firstType, secondType, firstClassification, secondClassification] = await prisma.$transaction([
    prisma.wineType.create({ data: { name: typeNames[0], description: 'Teste de filtro público' } }),
    prisma.wineType.create({ data: { name: typeNames[1], description: 'Teste de filtro público' } }),
    prisma.classification.create({
      data: { name: classificationNames[0], description: 'Teste de filtro público' },
    }),
    prisma.classification.create({
      data: { name: classificationNames[1], description: 'Teste de filtro público' },
    }),
  ]);
  typeIds = [firstType.id, secondType.id];
  classificationIds = [firstClassification.id, secondClassification.id];

  const base = {
    wineryId: winery.id,
    volumeMl: 750,
    alcoholPercentage: 12.5,
    description: 'Rótulo isolado para validar os filtros públicos.',
  };
  const wines = await Promise.all([
    prisma.wine.create({
      data: {
        ...base,
        name: officialNames[0],
        slug: `coracao-monte-nobre-${suffix}`,
        typeId: typeIds[0],
        classificationId: classificationIds[0],
        status: 'PUBLISHED',
      },
    }),
    prisma.wine.create({
      data: {
        ...base,
        name: officialNames[1],
        slug: `reserva-do-vale-${suffix}`,
        typeId: typeIds[0],
        classificationId: classificationIds[1],
        status: 'PUBLISHED',
      },
    }),
    prisma.wine.create({
      data: {
        ...base,
        name: officialNames[2],
        slug: `brisa-clara-${suffix}`,
        typeId: typeIds[1],
        classificationId: classificationIds[0],
        status: 'PUBLISHED',
      },
    }),
    prisma.wine.create({
      data: {
        ...base,
        name: officialNames[3],
        slug: `outro-rotulo-${suffix}`,
        typeId: typeIds[0],
        classificationId: classificationIds[0],
        status: 'PUBLISHED',
      },
    }),
    prisma.wine.create({
      data: {
        ...base,
        name: `Oculto ${suffix}`,
        slug: `oculto-${suffix}`,
        typeId: typeIds[0],
        classificationId: classificationIds[0],
        status: 'DRAFT',
      },
    }),
  ]);
  createdWineIds.push(...wines.map((wine) => wine.id));

  const customer = await prisma.user.create({
    data: {
      name: 'Cliente isolado dos filtros',
      email: `${suffix}@catalog-filter.test`,
      passwordHash: 'não utilizado neste teste',
      roleId: customerRole.id,
    },
  });
  customerId = customer.id;
  const externalWinery = await prisma.externalWinery.create({
    data: { userId: customer.id, name: `Vinícola privada ${suffix}` },
  });
  await prisma.externalWine.create({
    data: {
      userId: customer.id,
      externalWineryId: externalWinery.id,
      name: `Privado ${suffix}`,
    },
  });
});

afterAll(async () => {
  await prisma.wine.deleteMany({ where: { id: { in: createdWineIds } } });
  if (customerId) await prisma.user.deleteMany({ where: { id: customerId } });
  await prisma.classification.deleteMany({ where: { id: { in: classificationIds } } });
  await prisma.wineType.deleteMany({ where: { id: { in: typeIds } } });
  await prisma.$disconnect();
});

describe('filtros do catálogo público', () => {
  it('lista opções reais ativas de tipo e classificação', async () => {
    const response = await request(app).get('/api/catalog/filters').expect(200);
    expect(response.body.types.map((option: { name: string }) => option.name)).toEqual(
      expect.arrayContaining(typeNames),
    );
    expect(response.body.classifications.map((option: { name: string }) => option.name)).toEqual(
      expect.arrayContaining(classificationNames),
    );
  });

  it('mantém somente vinhos oficiais publicados no catálogo sem filtros', async () => {
    const response = await request(app).get('/api/catalog/wines').expect(200);
    expect(names(response)).toEqual(expect.arrayContaining(officialNames));
    expect(names(response)).not.toContain(`Oculto ${suffix}`);
    expect(names(response)).not.toContain(`Privado ${suffix}`);
  });

  it('combina tipo e classificação', async () => {
    const byType = await request(app).get('/api/catalog/wines').query({ type: typeNames[0] }).expect(200);
    expect(new Set(names(byType))).toEqual(new Set([officialNames[0], officialNames[3], officialNames[1]]));

    const byClassification = await request(app)
      .get('/api/catalog/wines')
      .query({ classification: classificationNames[0] })
      .expect(200);
    expect(new Set(names(byClassification))).toEqual(
      new Set([officialNames[2], officialNames[0], officialNames[3]]),
    );

    const combined = await request(app)
      .get('/api/catalog/wines')
      .query({ type: typeNames[0], classification: classificationNames[0] })
      .expect(200);
    expect(new Set(names(combined))).toEqual(new Set([officialNames[0], officialNames[3]]));
  });

  it('ignora uma ou duas letras e pesquisa trechos do nome a partir da terceira', async () => {
    for (const q of ['x', 'zz']) {
      const response = await request(app)
        .get('/api/catalog/wines')
        .query({ type: typeNames[0], classification: classificationNames[0], q })
        .expect(200);
      expect(new Set(names(response))).toEqual(new Set([officialNames[0], officialNames[3]]));
    }

    for (const q of ['MON', 'nob', 'coracao']) {
      const response = await request(app)
        .get('/api/catalog/wines')
        .query({ type: typeNames[0], classification: classificationNames[0], q })
        .expect(200);
      expect(names(response)).toEqual([officialNames[0]]);
    }
  });

  it('retorna lista vazia sem expor rascunho ou vinho externo', async () => {
    const empty = await request(app)
      .get('/api/catalog/wines')
      .query({ q: `ausente-${suffix}` })
      .expect(200);
    expect(empty.body).toEqual([]);
    const draft = await request(app)
      .get('/api/catalog/wines')
      .query({ q: `oculto ${suffix}` })
      .expect(200);
    expect(draft.body).toEqual([]);
    const external = await request(app)
      .get('/api/catalog/wines')
      .query({ q: `privado ${suffix}` })
      .expect(200);
    expect(external.body).toEqual([]);
  });
});
