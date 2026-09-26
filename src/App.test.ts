import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => vi.unstubAllGlobals());

it.each(['/', '/pedidos', '/estoque'])('abre %s sem sessão sem falhar ao ler o ID do cliente', (path) => {
  vi.stubGlobal('sessionStorage', { getItem: () => null });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const html = renderToStaticMarkup(
    createElement(QueryClientProvider, { client },
      createElement(MemoryRouter, { initialEntries: [path] }, createElement(App))),
  );
  if (path === '/') expect(html).toContain('A história de cada vinho');
  client.clear();
});
