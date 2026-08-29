import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
export const uploadsRoot = join(currentDirectory, '..', '..', 'uploads');

export function ensureUploadDirectory(folder: string) {
  const target = join(uploadsRoot, folder);
  mkdirSync(target, { recursive: true });
  return target;
}

ensureUploadDirectory('wines');
ensureUploadDirectory('qrcodes');
