import { expect, it, vi } from 'vitest';
import { confirmLeave } from './confirmLeave';

it('bloqueia saída durante salvamento sem pedir descarte', () => {
  const confirm = vi.fn(() => true);
  expect(confirmLeave(true, true, confirm)).toBe(false);
  expect(confirm).not.toHaveBeenCalled();
});
it('permite sair de cadastro intacto e respeita decisão de preservar alterações', () => {
  const confirm = vi.fn(() => false);
  expect(confirmLeave(false, false, confirm)).toBe(true);
  expect(confirm).not.toHaveBeenCalled();
  expect(confirmLeave(false, true, confirm)).toBe(false);
  expect(confirmLeave(false, true, () => true)).toBe(true);
});
