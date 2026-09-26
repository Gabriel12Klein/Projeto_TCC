import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it } from 'vitest';
import ClientSectionPage from './ClientSectionPage';

function render(title: string, loaded = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } } });
  if (loaded) client.setQueryData([title === 'Meus pedidos' ? 'customer-orders' : 'customer-inventory'], []);
  const html = renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(MemoryRouter, null, createElement(ClientSectionPage, { title, userId: 'test-user' }))));
  client.clear();
  return html;
}
it('não apresenta pedidos vazios enquanto a consulta está carregando', () => {
  const html = render('Meus pedidos');
  expect(html).toContain('Carregando pedidos');
  expect(html).not.toContain('Nenhum pedido registrado.');
  expect(render('Meus pedidos', true)).toContain('Nenhum pedido registrado.');
});
it('não apresenta saldo zero ou estoque vazio enquanto a consulta está carregando', () => {
  const html = render('Meu estoque');
  expect(html).toContain('Carregando sua adega');
  expect(html).not.toContain('Seu estoque está vazio.');
  expect(html).toContain('inventory-stock-total__number">…');
  const empty = render('Meu estoque', true);
  expect(empty).toContain('Seu estoque está vazio.');
  expect(empty).toContain('inventory-stock-total__number">0');
});
