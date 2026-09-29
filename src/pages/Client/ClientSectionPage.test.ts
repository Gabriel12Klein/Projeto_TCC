import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import ClientSectionPage, { wineSelectionAfterWineryChange } from './ClientSectionPage';

let storedDraft: string | null = null;
beforeAll(() =>
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => (key.startsWith('vinum_form_draft:purchase:') ? storedDraft : null),
  }),
);
beforeEach(() => {
  storedDraft = null;
});
afterAll(() => vi.unstubAllGlobals());

function render(title: string, loaded = false, withBottle = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
  });
  if (loaded && title === 'Meus vinhos') {
    client.setQueryData(['customer-orders', 1, 10], {
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });
    client.setQueryData(
      ['customer-external-wineries'],
      [
        { id: 'catena', name: 'Catena Zapata', createdAt: '', updatedAt: '' },
        { id: 'outra', name: 'Outra Vinícola', createdAt: '', updatedAt: '' },
      ],
    );
    client.setQueryData(
      ['customer-purchase-locations'],
      [{ id: 'mercado', name: 'Supermercado Central', createdAt: '', updatedAt: '' }],
    );
    client.setQueryData(['public-wines'], [{ id: 'oficial', name: 'Vinho oficial VINUM', slug: 'oficial' }]);
    client.setQueryData(['public-wine-detail', 'oficial'], {
      id: 'oficial',
      name: 'Vinho oficial VINUM',
      slug: 'oficial',
      vintages: [{ id: 'safra-2024', identifier: 'SF24', year: 2024, grapes: [], batches: [] }],
    });
    client.setQueryData(
      ['customer-external-wines', 'catena'],
      [
        {
          id: 'dv-catena',
          name: 'DV Catena',
          externalWineryId: 'catena',
          externalWinery: { id: 'catena', name: 'Catena Zapata' },
        },
      ],
    );
    client.setQueryData(['customer-cellar-bottles', '', '', '', '', 1, 10], {
      items: withBottle
        ? [
            {
              id: 'bottle-1',
              status: 'DISPONIVEL',
              bottleNumber: 1,
              purchasedAt: '2026-09-26T12:00:00.000Z',
              openedAt: null,
              finishedAt: null,
              discardedAt: null,
              discardReason: null,
              inventoryItem: {
                name: 'Vinho de teste',
                photoPath: null,
                wineryName: 'Vinícola de teste',
                wine: null,
              },
              orderItem: null,
            },
          ]
        : [],
      total: withBottle ? 1 : 0,
      page: 1,
      limit: 10,
      totalPages: withBottle ? 1 : 0,
    });
    client.setQueryData(['customer-cellar-wine-types'], [{ id: 'tinto', name: 'Tinto' }]);
  }
  if (loaded && title === 'Dashboard') {
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
  const empty = render('Meus vinhos', true);
  expect(empty).toContain('Você ainda não possui vinhos cadastrados.');
  expect(empty).toContain('client-empty-feedback px-6 md:px-8');
  expect(empty).toContain('Adega - Controle de Estoque');
});
it('mantém no Dashboard somente resumo, indicadores e gráfico', () => {
  const html = render('Dashboard');
  expect(html).toContain('Carregando dashboard');
  const empty = render('Dashboard', true);
  expect(empty).toContain('Total de garrafas adquiridas');
  expect(empty).toContain('Registrar um novo vinho');
  expect(empty).toContain('Consumo mensal');
  expect(empty).not.toContain('Adega - Controle de Estoque');
  expect(empty).not.toContain('Abrir garrafa');
});
it('exibe em Meus vinhos a lista individual e suas ações', () => {
  const html = render('Meus vinhos', true, true);
  expect(html).toContain('Adega - Controle de Estoque');
  expect(html).toContain('Compras');
  expect(html).toContain('Vinho de teste');
  expect(html).not.toContain('garrafa #1');
  expect(html).toContain('Tipo de vinho');
  expect(html).toContain('Tinto');
  expect(html).toContain('Data inicial');
  expect(html).toContain('Data final');
  expect(html).toContain('Limpar filtros');
  expect(html).toContain('Abrir garrafa');
  expect(html).toContain('Descartar');
  expect(html).not.toContain('Finalizar garrafa');
  expect(html).toContain('Ver detalhes da garrafa e do vinho');
});
it('limpa o vinho anterior ao trocar a vinícola', () => {
  expect(wineSelectionAfterWineryChange('catena')).toEqual({
    source: 'OUTRO_LOCAL',
    wineId: '',
    externalWineId: '',
    name: '',
  });
  expect(wineSelectionAfterWineryChange('VINUM').source).toBe('VINICULA');
});
it('mostra somente os vinhos da vinícola externa selecionada e locais cadastrados', () => {
  storedDraft = JSON.stringify({
    open: true,
    source: 'OUTRO_LOCAL',
    winerySelection: 'catena',
    wineId: '',
    externalWineId: '',
    name: '',
    qty: '1',
    purchaseLocationId: '',
    purchaseLocation: '',
    editing: null,
  });
  const html = render('Meus vinhos', true);
  expect(html).toContain('Catálogo da VINUM');
  expect(html).toContain('Catena Zapata');
  expect(html).toContain('Outra Vinícola');
  expect(html).toContain('DV Catena');
  expect(html).not.toContain('Outro vinho da segunda vinícola');
  expect(html).not.toContain('Vinho oficial VINUM</option></select>');
  expect(html).toContain('Supermercado Central');
  expect(html).not.toContain('Foto da garrafa');
});
it('mostra as safras do vinho oficial selecionado', () => {
  storedDraft = JSON.stringify({
    open: true,
    source: 'VINICULA',
    winerySelection: 'VINUM',
    wineId: 'oficial',
    vintageYear: '',
    externalWineId: '',
    name: '',
    qty: '1',
    purchaseLocationId: 'mercado',
    purchaseLocation: '',
    editing: null,
  });
  const html = render('Meus vinhos', true);
  expect(html).toContain('Safra');
  expect(html).toContain('2024 · SF24');
});
