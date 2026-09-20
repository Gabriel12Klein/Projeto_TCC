import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';

export type ReferenceKind = 'wineType' | 'grape' | 'classification';

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

export const referenceService = {
  async list(kind: ReferenceKind, onlyActive = false) {
    if (kind === 'classification') return (await prisma.classification.findMany({ where: onlyActive ? { active: true } : undefined, orderBy: { name: 'asc' } })).map(view);
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
    if (kind === 'classification') return view(await prisma.classification.create({ data: { name: String(values.name), description: values.description ?? null, active: values.active ?? true } }));
    if (kind === 'wineType') return view(await prisma.wineType.create({ data: { name: String(values.name), description: values.description ?? null, active: values.active ?? true } }));
    return view(await prisma.grape.create({ data: { name: String(values.name), description: values.description ?? null, active: values.active ?? true } }));
  },

  async update(kind: ReferenceKind, id: string, input: ReferenceInput) {
    const values = data(input);
    if (kind === 'classification') return view(await prisma.classification.update({ where: { id }, data: values }));
    if (kind === 'wineType') return view(await prisma.wineType.update({ where: { id }, data: values as Prisma.WineTypeUpdateInput }));
    return view(await prisma.grape.update({ where: { id }, data: values as Prisma.GrapeUpdateInput }));
  },

  async remove(kind: ReferenceKind, id: string) {
    if (kind === 'classification') {
      await prisma.classification.update({ where: { id }, data: { active: false } });
      return;
    }
    if (kind === 'wineType') {
      await prisma.wineType.update({ where: { id }, data: { active: false } });
      return;
    }
    await prisma.grape.update({ where: { id }, data: { active: false } });
  },
};
