import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import ClientReferencePage, {
  addGrapeSelection,
  normalizeSearch,
  removeGrapeSelection,
} from './ClientReferencePage';

function render(kind: 'winery' | 'wine' | 'location') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(
    ['customer-external-wineries'],
    [
      {
        id: 'catena',
        name: 'Vinícola Catena Zapata',
        street: 'Rua Cobos',
        neighborhood: 'Centro',
        city: 'Mendoza',
        stateRegion: 'Mendoza',
        country: 'Argentina',
        createdAt: '',
        updatedAt: '',
      },
    ],
  );
  client.setQueryData(
    ['customer-external-wines'],
    [
      {
        id: 'dv',
        name: 'DV Catena',
        externalWineryId: 'catena',
        externalWinery: { id: 'catena', name: 'Vinícola Catena Zapata' },
        vintageYear: 2022,
        description: 'Descrição',
        characteristics: 'Características',
        aromas: 'Aromas',
        tastingNotes: 'Notas',
        grapeLinks: [{ grape: { id: 'malbec', name: 'Malbec' } }],
        createdAt: '',
        updatedAt: '',
      },
    ],
  );
  client.setQueryData(
    ['customer-purchase-locations'],
    [
      {
        id: 'mercado',
        name: 'Supermercado Central',
        street: 'Rua do Comércio',
        neighborhood: null,
        city: 'Ijuí',
        stateRegion: 'RS',
        country: 'Brasil',
        createdAt: '',
        updatedAt: '',
      },
    ],
  );
  client.setQueryData(['customer-grapes'], [
    { id: 'malbec', name: 'Malbec' },
    { id: 'merlot', name: 'Merlot' },
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
    expect(html).toContain('NOVA VINÍCOLA');
    expect(html).toContain('Nome da Vinícola');
    expect(html).toContain('Estado/Região');
    expect(html).toContain('Ex.: Centro');
    expect(html).toContain('Ex.: Rua Cobos');
    expect(html).toContain('Rua Cobos');
    expect(html).toContain('Ex.: Mendoza');
    expect(html).toContain('Ex.: Argentina');
    expect(html).toContain('Vinícola Catena Zapata');
    expect(html).toContain('Mendoza');
    expect(html).toContain('Editar');
    expect(html).toContain('Excluir');
  });

  it('relaciona o vinho à vinícola no formulário e na lista', () => {
    const html = render('wine');
    expect(html).toContain('Cadastrar vinho');
    expect(html).toContain('DV Catena');
    expect(html).toContain('Vinícola Catena Zapata');
    expect(html).toContain('2022');
    expect(html).toContain('Malbec');
    expect(html).toContain('Selecione a vinícola');
    expect(html).toContain('Ano da safra');
    expect(html).toContain('Notas de degustação');
    expect(html).toContain('Foto da garrafa');
    expect(html).toContain('Adicionar foto');
    expect(html).toContain('Selecione uma uva para adicionar');
    expect(html).toContain('Merlot');
    expect(html).toContain('Escreva uma apresentação geral do vinho.');
    expect(html).toContain('Descreva os aromas percebidos no vinho.');
  });

  it('apresenta o local de compra cadastrado', () => {
    const html = render('location');
    expect(html).toContain('Cadastrar local de compra');
    expect(html).toContain('Supermercado Central');
    expect(html).toContain('Nome do local');
    expect(html).toContain('Ijuí');
    expect(html).toContain('Ex.: RS ou Rio Grande do Sul');
    expect(html).toContain('Ex.: Rua do Comércio');
    expect(html).toContain('Rua do Comércio');
    expect(html).toContain('Ex.: Brasil');
  });

  it('normaliza busca parcial sem diferenciar caixa, acento ou espaços extras', () => {
    expect(normalizeSearch('  VINÍCOLA   Catena Zapata ')).toBe('vinicola catena zapata');
    for (const term of ['cat', 'Cat', 'CAT', 'catena', 'ZAPATA', 'catena zap', 'vinícola cat']) {
      expect(normalizeSearch('Vinícola Catena Zapata')).toContain(normalizeSearch(term));
    }
  });

  it('adiciona várias uvas sem duplicar e permite remover uma seleção', () => {
    expect(addGrapeSelection(['malbec'], 'merlot')).toEqual(['malbec', 'merlot']);
    expect(addGrapeSelection(['malbec'], 'malbec')).toEqual(['malbec']);
    expect(removeGrapeSelection(['malbec', 'merlot'], 'malbec')).toEqual(['merlot']);
  });
});
