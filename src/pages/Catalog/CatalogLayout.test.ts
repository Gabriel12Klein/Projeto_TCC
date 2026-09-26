import { expect, it, vi } from 'vitest';
import { logoutFromClient } from './CatalogLayout';

it('solicita logout sem repassar o evento de clique como destino', () => {
  const logout = vi.fn();
  logoutFromClient(logout);
  expect(logout).toHaveBeenCalledOnce();
  expect(logout).toHaveBeenCalledWith();
});
