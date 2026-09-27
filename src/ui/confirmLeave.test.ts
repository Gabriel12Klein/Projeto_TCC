import { expect, it } from 'vitest';
import { needsLeaveConfirmation } from './confirmLeave';

it('só pede confirmação quando há alterações e o formulário não está salvando', () => {
  expect(needsLeaveConfirmation(true, true)).toBe(false);
  expect(needsLeaveConfirmation(false, false)).toBe(false);
  expect(needsLeaveConfirmation(false, true)).toBe(true);
});
