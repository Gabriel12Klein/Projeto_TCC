import { ensureSeedAdmin } from '../backend/src/modules/auth/auth.service.js';
import { prisma } from '../backend/src/lib/prisma.js';

// Inicialização mínima: nunca restaura cadastros ou dados de demonstração.
ensureSeedAdmin()
  .then(() => console.log('Inicialização concluída. Dados existentes preservados; nenhum dado de demonstração importado.'))
  .catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
