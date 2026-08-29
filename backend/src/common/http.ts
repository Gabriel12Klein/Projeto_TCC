import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '../generated/prisma/client.js';
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
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({ message: 'Já existe um registro com esses dados.' });
      return;
    }
    if (error.code === 'P2003') {
      res
        .status(409)
        .json({ message: 'O registro está relacionado a outros dados e não pode ser removido.' });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Registro não encontrado.' });
      return;
    }
  }
  console.error(error);
  res.status(500).json({ message: 'Erro interno do servidor.' });
};
