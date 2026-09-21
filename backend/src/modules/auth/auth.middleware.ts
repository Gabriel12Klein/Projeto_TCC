import type { RequestHandler } from 'express';
import { AppError, asyncRoute } from '../../common/http.js';
import { authService } from './auth.service.js';

function bearerToken(authorization?: string) {
  return authorization?.replace(/^Bearer\s+/i, '').trim() ?? '';
}

export const requireAuth: RequestHandler = asyncRoute(async (req, res, next) => {
  const token = bearerToken(req.headers.authorization);
  if (!token) throw new AppError(401, 'Entre na sua conta para continuar.');
  res.locals.user = await authService.authenticate(token);
  res.locals.token = token;
  next();
});

export function requireRoles(...roles: string[]): RequestHandler {
  return (req, res, next) => {
    if (!res.locals.user || !roles.includes(String(res.locals.user.role))) {
      next(new AppError(403, 'Você não possui permissão para acessar este recurso.'));
      return;
    }
    if (['ADMIN', 'EDITOR'].includes(String(res.locals.user.role)) && !res.locals.user.wineryId) {
      next(new AppError(403, 'O acesso administrativo exige vínculo com a vinícola VINUM.'));
      return;
    }
    next();
  };
}
