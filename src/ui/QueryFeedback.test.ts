import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import QueryFeedback from './QueryFeedback';
import { ApiError } from '../api/feedback';

it('não confunde carregamento, falha, vazio e conteúdo', () => {
  const render = (props: Partial<Parameters<typeof QueryFeedback>[0]>) =>
    renderToStaticMarkup(createElement(QueryFeedback, { retry: vi.fn(), ...props }));
  expect(render({ loading: true, empty: true })).toContain('Carregando');
  const error = render({ error: new ApiError('Serviço indisponível.', 503), empty: true });
  expect(error).toContain('role="alert"');
  expect(error).toContain('Tentar novamente');
  expect(error).not.toContain('Nenhum registro');
  expect(render({ empty: true })).toContain('Nenhum registro');
  expect(render({})).toBe('');
});
it('diferencia 404 de indisponibilidade e bloqueia repetição durante nova tentativa', () => {
  const retry = vi.fn();
  const missing = renderToStaticMarkup(
    createElement(QueryFeedback, {
      retry,
      error: new ApiError('Não encontrado', 404),
      notFoundText: 'Vinho não publicado.',
    }),
  );
  expect(missing).toContain('Vinho não publicado.');
  expect(missing).not.toContain('Tentar novamente');
  const busy = renderToStaticMarkup(
    createElement(QueryFeedback, { retry, fetching: true, error: new ApiError('Falha de conexão.', 0) }),
  );
  expect(busy).toContain('disabled');
  expect(busy).toContain('Tentando novamente');
});
