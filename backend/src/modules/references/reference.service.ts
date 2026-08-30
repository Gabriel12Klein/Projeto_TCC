import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';

export type ReferenceKind = 'wineType' | 'grape';

type ReferenceInput = {
  name?: unknown;
  description?: unknown;
  status?: unknown;
};

function view(item: { id: string; name: string; description: string | null; active: boolean }) {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? '',
    status: item.active ? 'Ativo' : 'Inativo',
  };
}

function data(input: ReferenceInput) {
  return {
    name: input.name === undefined ? undefined : String(input.name).trim(),
    description: input.description === undefined ? undefined : String(input.description).trim() || null,
    active: input.status === undefined ? undefined : input.status === 'Ativo',
  };
}

async function ensureReferenceSeeds(kind: ReferenceKind) {
  if (kind === 'wineType') {
    if (await prisma.wineType.count()) return;
    await prisma.wineType.createMany({
      data: [
        { id: 'wine-type-tinto', name: 'Tinto', description: 'Vinhos de coloração escura e perfil encorpado.' },
        { id: 'wine-type-branco', name: 'Branco', description: 'Vinhos leves, frescos e de coloração clara.' },
        { id: 'wine-type-rose', name: 'Rosé', description: 'Vinhos delicados de coloração rosada.' },
        { id: 'wine-type-espumante', name: 'Espumante', description: 'Vinhos com gás carbônico e borbulhas.' },
        { id: 'wine-type-brut', name: 'Brut', description: 'Espumantes de perfil seco.' },
      ],
    });
    return;
  }
  if (await prisma.grape.count()) return;
  await prisma.grape.createMany({
    data: [
      { id: 'grape-cabernet-sauvignon', name: 'Cabernet Sauvignon' },
      { id: 'grape-merlot', name: 'Merlot' },
      { id: 'grape-malbec', name: 'Malbec' },
      { id: 'grape-chardonnay', name: 'Chardonnay' },
      { id: 'grape-pinot-noir', name: 'Pinot Noir' },
      { id: 'grape-grenache', name: 'Grenache' },
      { id: 'grape-sauvignon-blanc', name: 'Sauvignon Blanc' },
      { id: 'grape-syrah', name: 'Syrah' },
    ],
  });
}

export const referenceService = {
  async list(kind: ReferenceKind, onlyActive = false) {
    await ensureReferenceSeeds(kind);
    if (kind === 'wineType') {
      const items = await prisma.wineType.findMany({
        where: onlyActive ? { active: true } : undefined,
        orderBy: { name: 'asc' },
      });
      return items.map(view);
    }
    const items = await prisma.grape.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: { name: 'asc' },
    });
    return items.map(view);
  },

  async create(kind: ReferenceKind, input: ReferenceInput) {
    const values = data(input);
    if (kind === 'wineType') return view(await prisma.wineType.create({ data: { name: String(values.name), description: values.description ?? null, active: values.active ?? true } }));
    return view(await prisma.grape.create({ data: { name: String(values.name), description: values.description ?? null, active: values.active ?? true } }));
  },

  async update(kind: ReferenceKind, id: string, input: ReferenceInput) {
    const values = data(input);
    if (kind === 'wineType') return view(await prisma.wineType.update({ where: { id }, data: values as Prisma.WineTypeUpdateInput }));
    return view(await prisma.grape.update({ where: { id }, data: values as Prisma.GrapeUpdateInput }));
  },

  async remove(kind: ReferenceKind, id: string) {
    if (kind === 'wineType') {
      await prisma.wineType.update({ where: { id }, data: { active: false } });
      return;
    }
    await prisma.grape.update({ where: { id }, data: { active: false } });
  },
};
