import { prisma } from '../../lib/prisma.js';

export type StatusKind = 'vintage' | 'batch';

export async function ensureSeedStatuses() {
  await Promise.all([
    prisma.vintageStatus.upsert({
      where: { name: 'Em processamento' },
      update: { active: true, description: 'Safra recebida e em processamento pela vinícola.' },
      create: { id: 'status-safra-producao', name: 'Em processamento', description: 'Safra recebida e em processamento pela vinícola.' },
    }),
    prisma.vintageStatus.upsert({
      where: { name: 'Concluída' },
      update: { active: true, description: 'Processamento da safra encerrado.' },
      create: { id: 'status-safra-finalizada', name: 'Concluída', description: 'Processamento da safra encerrado.' },
    }),
    prisma.batchStatus.upsert({
      where: { name: 'Aguardando registro' },
      update: { active: true, description: 'Lote ainda não foi registrado na blockchain.' },
      create: { id: 'status-lote-pendente', name: 'Aguardando registro', description: 'Lote ainda não foi registrado na blockchain.' },
    }),
    prisma.batchStatus.upsert({
      where: { name: 'Registrado na blockchain' },
      update: { active: true, description: 'Lote registrado na blockchain.' },
      create: { id: 'status-lote-registrado', name: 'Registrado na blockchain', description: 'Lote registrado na blockchain.' },
    }),
    prisma.batchStatus.upsert({
      where: { name: 'Publicado para consulta' },
      update: { active: true, description: 'Informações do lote disponíveis para consulta.' },
      create: { id: 'status-lote-publicado', name: 'Publicado para consulta', description: 'Informações do lote disponíveis para consulta.' },
    }),
  ]);
}

export const statusService = {
  async list(kind: StatusKind) {
    await ensureSeedStatuses();
    if (kind === 'vintage') {
      const items = await prisma.vintageStatus.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
      return items.map(({ id, name, description }) => ({ id, name, description: description ?? '' }));
    }
    const items = await prisma.batchStatus.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    return items.map(({ id, name, description }) => ({ id, name, description: description ?? '' }));
  },
};
