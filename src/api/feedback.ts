export type FieldIssue = { path: Array<string | number>; message: string };
export class ApiError extends Error {
  constructor(message: string, public status: number, public issues: FieldIssue[] = []) { super(message); this.name = 'ApiError'; }
}
export const networkMessage = 'Não foi possível conectar ao VINUM. Verifique sua conexão e tente novamente; os campos preenchidos foram mantidos.';
export function responseMessage(status: number, supplied?: unknown) {
  if (status >= 500) return 'O serviço está temporariamente indisponível. Aguarde um momento e tente novamente.';
  if (typeof supplied === 'string' && supplied && !/SQLSTATE|ECONN|Prisma|constraint|stack trace|<html|<!doctype|\b(undefined|null)\b/i.test(supplied)) return supplied;
  if (status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
  if (status === 403) return 'Você não possui permissão para realizar esta ação.';
  if (status === 404) return 'Este registro não foi encontrado. Ele pode ter sido removido ou estar indisponível.';
  if (status === 409) return 'Já existe um registro com esses dados ou a operação conflita com o estado atual. Confira os dados e tente novamente.';
  return 'Não foi possível concluir a operação. Confira os campos e tente novamente.';
}
