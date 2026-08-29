/**
 * PONTO DE EXECUÇÃO DO VINUM
 * Abra este arquivo no VS Code e execute (Run / F5 / Code Runner).
 * Ele instala as dependências na primeira execução e inicia backend + frontend.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const projectDir = dirname(fileURLToPath(import.meta.url));
const dependenciesReady =
  existsSync(join(projectDir, 'node_modules', 'vite')) &&
  existsSync(join(projectDir, 'node_modules', 'express'));
const generatedClientReady = existsSync(
  join(projectDir, 'backend', 'src', 'generated', 'prisma', 'client.ts'),
);
const databaseReady = existsSync(join(projectDir, 'dev.db'));

function runNpmScript(script) {
  const result = spawnSync('npm', ['run', script], { cwd: projectDir, shell: true, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!dependenciesReady) {
  console.log('\n[VINUM] Instalando dependências...\n');
  const install = spawnSync('npm', ['install'], { cwd: projectDir, shell: true, stdio: 'inherit' });
  if (install.status !== 0) process.exit(install.status ?? 1);
}

if (!generatedClientReady) runNpmScript('prisma:generate');
if (!databaseReady) {
  console.log('\n[VINUM] Preparando banco de dados local...\n');
  runNpmScript('prisma:deploy');
  runNpmScript('prisma:seed');
}

console.log('\n[VINUM] Iniciando backend local e frontend...\n');
const backend = spawn('npm', ['run', 'backend'], { cwd: projectDir, shell: true, stdio: 'inherit' });
const frontend = spawn('npm', ['run', 'dev', '--', '--open'], {
  cwd: projectDir,
  shell: true,
  stdio: 'inherit',
});

function stop() {
  backend.kill();
  frontend.kill();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
backend.on('close', (code) => {
  if (code) console.log(`[VINUM] Backend encerrado: ${code}`);
});
frontend.on('close', (code) => {
  if (code) console.log(`[VINUM] Frontend encerrado: ${code}`);
});
