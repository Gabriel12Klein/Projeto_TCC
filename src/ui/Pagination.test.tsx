import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import Pagination, { lastValidPage, pageNumbers, pageRange } from './Pagination';

describe('paginação reutilizável', () => {
  it('calcula páginas e intervalos para limites diferentes', () => {
    expect(pageRange(1, 10, 35)).toEqual({ from: 1, to: 10 });
    expect(pageRange(4, 10, 35)).toEqual({ from: 31, to: 35 });
    expect(pageRange(2, 20, 35)).toEqual({ from: 21, to: 35 });
    expect(pageRange(1, 50, 35)).toEqual({ from: 1, to: 35 });
    expect(pageRange(1, 10, 0)).toEqual({ from: 0, to: 0 });
  });

  it('reduz muitos números e corrige página que deixou de existir', () => {
    expect(pageNumbers(6, 12)).toEqual([1, 'ellipsis-1', 5, 6, 7, 'ellipsis-7', 12]);
    expect(lastValidPage(4, 3)).toBe(3);
    expect(lastValidPage(1, 0)).toBe(1);
  });

  it('identifica a página atual e desabilita os limites de navegação', () => {
    const first = renderToStaticMarkup(
      createElement(Pagination, {
        page: 1,
        limit: 10,
        total: 11,
        totalPages: 2,
        label: 'Compras',
        onPageChange: vi.fn(),
        onLimitChange: vi.fn(),
      }),
    );
    expect(first).toContain('aria-current="page"');
    expect(first).toContain('Exibindo 1–10 de 11 registros');
    expect(first).toMatch(/disabled=""[^>]*>Anterior/);
    const last = renderToStaticMarkup(
      createElement(Pagination, {
        page: 2,
        limit: 10,
        total: 11,
        totalPages: 2,
        label: 'Compras',
        onPageChange: vi.fn(),
        onLimitChange: vi.fn(),
      }),
    );
    expect(last).toContain('Exibindo 11–11 de 11 registros');
    expect(last).toMatch(/disabled=""[^>]*>Próxima/);
  });

  it('não exibe controles sem registros', () => {
    expect(
      renderToStaticMarkup(
        createElement(Pagination, {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          label: 'Compras',
          onPageChange: vi.fn(),
          onLimitChange: vi.fn(),
        }),
      ),
    ).toBe('');
  });
});
