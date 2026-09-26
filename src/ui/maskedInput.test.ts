import { afterEach, expect, it, vi } from 'vitest';
import type { ChangeEvent } from 'react';
import { formatPhone, maskCnpj } from '../../shared/contact';
import { updateMaskedInput } from './maskedInput';

afterEach(() => vi.unstubAllGlobals());

it.each([
  ['(4) 3000-0000', 1, formatPhone, '(43) 0000-000', 0],
  ['A.12C.345/6D78-E9', 1, maskCnpj, 'A1.2C3.456/D78E-9', 1],
  ['54999990000', 11, formatPhone, '(54) 99999-0000', 15],
])('mantém a posição de edição em %s', (raw, caret, format, expected, expectedCaret) => {
  const input = { value: raw, selectionStart: caret, setSelectionRange: vi.fn() };
  const pending: FrameRequestCallback[] = [];
  vi.stubGlobal('document', { activeElement: input });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => pending.push(callback));
  updateMaskedInput({ currentTarget: input } as unknown as ChangeEvent<HTMLInputElement>, format, value => { input.value = value; });
  pending.forEach(callback => callback(0));
  expect(input.value).toBe(expected);
  expect(input.setSelectionRange).toHaveBeenCalledWith(expectedCaret, expectedCaret);
});
