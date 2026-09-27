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
  if (loaded && title === 'Meus vinhos') client.setQueryData(['customer-orders'], []);
  if (loaded && title === 'Dashboard') {
    client.setQueryData(['customer-cellar-bottles', ''], []);
    client.setQueryData(['customer-inventory-dashboard', new Date().getFullYear()], {
      totals: {
        acquiredBottles: 0,
        consumedBottles: 0,
        availableBottles: 0,
        openedBottles: 0,
        labelCount: 0,
      },
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
  const html = render('Meus vinhos');
  expect(html).toContain('Carregando vinhos');
  expect(html).not.toContain('Você ainda não possui vinhos cadastrados.');
  expect(render('Meus vinhos', true)).toContain('Você ainda não possui vinhos cadastrados.');
});
it('não apresenta painel vazio enquanto as consultas estão carregando', () => {
  const html = render('Dashboard');
  expect(html).toContain('Carregando histórico da adega');
  expect(html).toContain('Carregando dashboard');
  expect(html).not.toContain('Sua adega está vazia.');
  const empty = render('Dashboard', true);
  expect(empty).toContain('Você ainda não possui vinhos cadastrados.');
  expect(empty).toContain('Total de garrafas adquiridas');
  expect(empty).toContain('Registrar um novo vinho');
});
