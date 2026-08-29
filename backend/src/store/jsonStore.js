import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const storePath = join(currentDir, '..', '..', 'data', 'store.json');

export async function readStore() {
  return JSON.parse(await readFile(storePath, 'utf8'));
}

export async function writeStore(store) {
  await writeFile(storePath, JSON.stringify(store, null, 2), 'utf8');
}

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
