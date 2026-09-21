import { useState } from 'react';
import { ApiError } from '../api/feedback';

export function useFormFeedback(prefix: string) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  function show(next: Record<string, string>, focus = true) {
    setErrors(next);
    if (focus) {
      const first = Object.keys(next)[0];
      if (first) requestAnimationFrame(() => document.getElementById(`${prefix}-${first}`)?.focus());
    }
  }
  function fromApi(error: unknown) {
    if (error instanceof ApiError) show(Object.fromEntries(error.issues.filter(issue => typeof issue.path[0] === 'string').map(issue => [String(issue.path[0]), issue.message])));
  }
  function field(name: string) {
    return { id: `${prefix}-${name}`, name, 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `${prefix}-${name}-error` : undefined };
  }
  function nativeErrors(form: HTMLFormElement) {
    const next: Record<string, string> = {};
    for (const element of Array.from(form.elements)) {
      if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) || !element.name || element.disabled || element.validity.valid) continue;
      const validity = element.validity;
      next[element.name] = validity.valueMissing ? 'Preencha este campo obrigatório.' : validity.typeMismatch && element instanceof HTMLInputElement && element.type === 'email' ? 'Informe um e-mail válido. Ex.: nome@exemplo.com.' : validity.tooShort ? 'O texto está muito curto. Confira o tamanho mínimo indicado.' : validity.tooLong ? 'O texto ultrapassa o tamanho permitido.' : 'Confira o formato informado neste campo.';
    }
    return next;
  }
  function clear(name: string) { setErrors(current => { const next = { ...current }; delete next[name]; return next; }); }
  return { errors, show, fromApi, field, nativeErrors, clear };
}
