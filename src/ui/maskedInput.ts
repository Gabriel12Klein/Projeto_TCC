import type { ChangeEvent } from 'react';

// Keep the caret next to the same data character when punctuation is inserted.
export function updateMaskedInput(
  event: ChangeEvent<HTMLInputElement>,
  format: (value: string) => string,
  update: (value: string) => void,
) {
  const input = event.currentTarget;
  const raw = input.value;
  const start = input.selectionStart ?? raw.length;
  const formatted = format(raw);
  const count = raw.slice(0, start).replace(/[^a-z0-9]/gi, '').length;
  let caret = start;
  if (formatted !== raw) {
    caret = 0;
    let seen = 0;
    while (caret < formatted.length && seen < count) {
      if (/[a-z0-9]/i.test(formatted[caret])) seen++;
      caret++;
    }
  }
  update(formatted);
  requestAnimationFrame(() => {
    if (document.activeElement === input && input.value === formatted) {
      input.setSelectionRange(caret, caret);
    }
  });
}
