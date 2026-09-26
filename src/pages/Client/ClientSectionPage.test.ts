import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it } from 'vitest';
import ClientSectionPage from './ClientSectionPage';

function render(title: string, loaded = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
  });
  if (loaded && title === 'Meus pedidos') client.setQueryData(['customer-orders'], []);
  if (loaded && title === 'Meu estoque') {
    client.setQueryData(['customer-inventory'], []);
    client.setQueryData(['customer-inventory-dashboard', new Date().getFullYear()], {
      totals: { acquiredBottles: 0, consumedBottles: 0, availableBottles: 0, labelCount: 0 },
      selectedYear: new Date().getFullYear(),
      years: [new Date().getFullYear()],
      monthlyConsumption: Array.from({ length: 12 }, (_, month) => ({ month: month + 1, bottles: 0 })),
    });
  }
  const html = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(MemoryRouter, null, createElement(ClientSectionPage, { title, userId: 'test-user' })),
    ),
  );
  client.clear();
  return html;
}
it('não apresenta pedidos vazios enquanto a consulta está carregando', () => {
  const html = render('Meus pedidos');
  expect(html).toContain('Carregando pedidos');
  expect(html).not.toContain('Nenhum pedido registrado.');
  expect(render('Meus pedidos', true)).toContain('Nenhum pedido registrado.');
});
it('não apresenta painel vazio enquanto as consultas estão carregando', () => {
  const html = render('Meu estoque');
  expect(html).toContain('Carregando sua adega');
  expect(html).toContain('Carregando resumo da adega');
  expect(html).not.toContain('Seu estoque está vazio.');
  const empty = render('Meu estoque', true);
  expect(empty).toContain('Sua adega está vazia.');
  expect(empty).toContain('Garrafas adquiridas');
  expect(empty).toContain('Registrar nova compra');
});
