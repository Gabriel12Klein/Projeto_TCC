import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import ClientReferencePage from './ClientReferencePage';

function render(kind: 'winery' | 'wine' | 'location') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(['customer-external-wineries'], [
    { id: 'catena', name: 'Catena Zapata', createdAt: '', updatedAt: '' },
  ]);
  client.setQueryData(['customer-external-wines'], [
    {
      id: 'dv',
      name: 'DV Catena',
      externalWineryId: 'catena',
      externalWinery: { id: 'catena', name: 'Catena Zapata' },
      createdAt: '',
      updatedAt: '',
    },
  ]);
  client.setQueryData(['customer-purchase-locations'], [
    { id: 'mercado', name: 'Supermercado Central', createdAt: '', updatedAt: '' },
  ]);
  const html = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(MemoryRouter, null, createElement(ClientReferencePage, { kind })),
    ),
  );
  client.clear();
  return html;
}

describe('cadastros privados do cliente', () => {
  it('apresenta a vinícola cadastrada com ações', () => {
    const html = render('winery');
    expect(html).toContain('Cadastrar vinícola');
    expect(html).toContain('Catena Zapata');
    expect(html).toContain('Editar');
    expect(html).toContain('Excluir');
  });

  it('relaciona o vinho à vinícola no formulário e na lista', () => {
    const html = render('wine');
    expect(html).toContain('Cadastrar vinho');
    expect(html).toContain('DV Catena');
    expect(html).toContain('Catena Zapata');
    expect(html).toContain('Selecione a vinícola');
  });

  it('apresenta o local de compra cadastrado', () => {
    const html = render('location');
    expect(html).toContain('Cadastrar local de compra');
    expect(html).toContain('Supermercado Central');
  });
});
