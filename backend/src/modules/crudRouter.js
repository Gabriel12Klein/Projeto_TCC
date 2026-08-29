import { Router } from 'express';
import { readStore, writeStore, createId } from '../store/jsonStore.js';

export function createCrudRouter(collection, prefix) {
  const router = Router();

  router.get('/', async (_req, res) => {
    const store = await readStore();
    res.json(store[collection] ?? []);
  });

  router.post('/', async (req, res) => {
    const store = await readStore();
    const item = { id: createId(prefix), ...req.body, createdAt: req.body?.createdAt ?? new Date().toLocaleDateString('pt-BR') };
    store[collection].unshift(item);
    await writeStore(store);
    res.status(201).json(item);
  });

  router.put('/:id', async (req, res) => {
    const store = await readStore();
    const index = store[collection].findIndex((item) => item.id === req.params.id);
    if (index < 0) return res.status(404).json({ message: 'Registro não encontrado.' });
    store[collection][index] = { ...store[collection][index], ...req.body, id: req.params.id };
    await writeStore(store);
    res.json(store[collection][index]);
  });

  router.delete('/:id', async (req, res) => {
    const store = await readStore();
    const before = store[collection].length;
    store[collection] = store[collection].filter((item) => item.id !== req.params.id);
    if (before === store[collection].length) return res.status(404).json({ message: 'Registro não encontrado.' });
    await writeStore(store);
    res.status(204).end();
  });

  return router;
}
