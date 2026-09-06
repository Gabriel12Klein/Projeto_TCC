import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import multer from 'multer';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function asyncRoute(handler: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

const databaseFieldLabels: Record<string, string> = {
  name: 'Nome',
  description: 'Descrição',
  characteristics: 'Características',
  aromas: 'Aromas',
  tastingNotes: 'Notas de degustação',
  pairing: 'Harmonização',
  code: 'Código do lote',
  identifier: 'Identificador da safra',
  cnpj: 'CNPJ',
  email: 'E-mail',
  volumeMl: 'Volume',
  alcoholPercentage: 'Teor alcoólico',
  productionDate: 'Data de produção',
  bottlingTime: 'Hora do envase',
  registrationDate: 'Data de registro',
  status: 'Status',
  typeId: 'Tipo do vinho',
  grapeId: 'Uva',
  grapeIds: 'Uvas',
  vintageId: 'Safra relacionada',
  wineId: 'Vinho produzido',
  wineryId: 'Vinícola',
  userId: 'Usuário',
};

function databaseFields(error: Prisma.PrismaClientKnownRequestError) {
  const meta = error.meta as Record<string, unknown> | undefined;
  const target = meta?.target ?? meta?.column_name ?? meta?.column;
  const values = Array.isArray(target) ? target : target ? [target] : [];
  return values
    .flatMap((value) => String(value).split(/[,.\s]+/))
    .map((value) => value.replace(/^.*\./, '').replace(/["'`]/g, ''))
    .filter(Boolean)
    .map((field) => databaseFieldLabels[field] ?? field)
    .filter((field, index, all) => all.indexOf(field) === index);
}

function databaseErrorMessage(error: Prisma.PrismaClientKnownRequestError) {
  const fields = databaseFields(error);
  const field = fields.length ? ` no campo ${fields.join(' e ')}` : '';
  const metadata = String(
    (error.meta as Record<string, unknown> | undefined)?.field_name ??
      (error.meta as Record<string, unknown> | undefined)?.constraint ??
      '',
  ).toLowerCase();

  switch (error.code) {
    case 'P2000':
      return `O valor informado${field} é muito longo. Reduza o texto e tente novamente.`;
    case 'P2002':
      return fields.length
        ? `Já existe um registro com o mesmo valor em ${fields.join(' e ')}. Informe outro valor.`
        : 'Já existe um registro com esses dados. Informe valores diferentes e tente novamente.';
    case 'P2003':
      if (metadata.includes('vintage') || fields.includes('Safra relacionada')) {
        return 'Esta safra não pode ser excluída porque possui lotes vinculados. Exclua ou ajuste os lotes antes de tentar novamente.';
      }
      return fields.length
        ? `Não é possível concluir a operação porque ${fields.join(' e ')} está relacionado a outro registro.`
        : 'Não é possível concluir a operação porque este registro está relacionado a outros dados.';
    case 'P2011':
    case 'P2012':
      return fields.length
        ? `O campo ${fields.join(' e ')} é obrigatório. Preencha-o e tente novamente.`
        : 'Há um campo obrigatório sem preenchimento. Confira os dados e tente novamente.';
    case 'P2014':
      return 'Não é possível concluir a operação porque os registros relacionados estão incompletos.';
    case 'P2025':
      return 'O registro não foi encontrado. Atualize a página e tente novamente.';
    default:
      return 'Não foi possível concluir a operação no banco de dados. Confira os dados e tente novamente.';
  }
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ message: 'Dados inválidos.', issues: error.issues });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.status).json({ message: error.message, details: error.details });
    return;
  }
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'A imagem deve ter no máximo 5 MB.' });
      return;
    }
    res.status(400).json({ message: 'Não foi possível enviar a imagem selecionada.' });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const status =
      error.code === 'P2002' || error.code === 'P2003' ? 409 : error.code === 'P2025' ? 404 : 400;
    res.status(status).json({ message: databaseErrorMessage(error) });
    return;
  }
  console.error(error);
  res.status(500).json({ message: 'Erro interno do servidor.' });
};
