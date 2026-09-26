import { expect, it, vi } from 'vitest';
import { runSingleFlight } from './singleFlight';

it('ignora um segundo clique enquanto a movimentação anterior está pendente', async () => {
  const lock = { current: false };
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const action = vi.fn(() => pending);

  const first = runSingleFlight(lock, action);
  await expect(runSingleFlight(lock, action)).resolves.toBe(false);
  expect(action).toHaveBeenCalledTimes(1);

  release();
  await expect(first).resolves.toBe(true);
  expect(lock.current).toBe(false);
});
