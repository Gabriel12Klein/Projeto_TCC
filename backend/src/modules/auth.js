import { Router } from 'express';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { readStore, writeStore, createId } from '../store/jsonStore.js';

export const sessions = new Map();
const router = Router();

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, user) {
  const candidate = Buffer.from(scryptSync(password, user.salt, 64).toString('hex'), 'hex');
  const original = Buffer.from(user.passwordHash, 'hex');
  return candidate.length === original.length && timingSafeEqual(candidate, original);
}

export async function ensureSeedAdmin() {
  const store = await readStore();
  if (store.users.some((user) => user.email === 'admin@vinum.local')) return;
  const { salt, hash } = hashPassword('Admin123!');
  store.users.push({
    id: createId('usr'),
    name: 'Administrador',
    email: 'admin@vinum.local',
    salt,
    passwordHash: hash,
    role: 'Administrador',
    createdAt: new Date().toISOString(),
  });
  await writeStore(store);
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) return res.status(400).json({ message: 'Preencha nome, e-mail e senha.' });
  const store = await readStore();
  if (store.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ message: 'Já existe uma conta com este e-mail.' });
  }
  const { salt, hash } = hashPassword(password);
  const user = { id: createId('usr'), name, email, salt, passwordHash: hash, role: 'Administrador', createdAt: new Date().toISOString() };
  store.users.push(user);
  await writeStore(store);
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  const store = await readStore();
  const user = store.users.find((item) => item.email.toLowerCase() === String(email ?? '').toLowerCase());
  if (!user || !verifyPassword(String(password ?? ''), user)) return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
  const token = randomUUID();
  sessions.set(token, user.id);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const userId = token ? sessions.get(token) : null;
  if (!userId) return res.status(401).json({ message: 'Sessão expirada.' });
  const store = await readStore();
  const user = store.users.find((item) => item.id === userId);
  if (!user) return res.status(401).json({ message: 'Usuário não encontrado.' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !sessions.has(token)) return res.status(401).json({ message: 'Sessão não autenticada.' });
  req.userId = sessions.get(token);
  next();
}

export default router;
