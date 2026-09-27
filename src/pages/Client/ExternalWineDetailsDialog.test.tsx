import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ExternalWineDetailsDialog from './ExternalWineDetailsDialog';
import type { ExternalWine } from '../../types';

const wine: ExternalWine = {
  id: 'wine-a',
  name: 'DV Catena',
  externalWineryId: 'winery-a',
  externalWinery: { id: 'winery-a', name: 'Catena Zapata' },
  vintageYear: 2022,
  description: 'Descrição privada',
  characteristics: 'Encorpado',
  aromas: 'Frutas vermelhas',
  tastingNotes: 'Final persistente',
  imagePath: '/uploads/inventory/wine-a.png',
  grapeLinks: [{ grape: { id: 'grape-a', name: 'Malbec' } }],
  createdAt: '2026-09-27T12:00:00.000Z',
  updatedAt: '2026-09-27T12:00:00.000Z',
};

describe('ficha do vinho externo', () => {
  it('renderiza todos os dados privados em diálogo acessível', () => {
    vi.stubGlobal('sessionStorage', { getItem: vi.fn(() => null) });
    const html = renderToStaticMarkup(
      createElement(ExternalWineDetailsDialog, {
        open: true,
        wine,
        loading: false,
        error: null,
        onClose: vi.fn(),
        onRetry: vi.fn(),
      }),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('DV Catena');
    expect(html).toContain('Catena Zapata');
    expect(html).toContain('Malbec');
    expect(html).toContain('Notas de degustação');
    vi.unstubAllGlobals();
  });

  it('mantém a causa original em uma mensagem contextual de falha', () => {
    const html = renderToStaticMarkup(
      createElement(ExternalWineDetailsDialog, {
        open: true,
        loading: false,
        error: new Error('Falha de rede.'),
        onClose: vi.fn(),
        onRetry: vi.fn(),
      }),
    );
    expect(html).toContain('Não foi possível carregar a ficha deste vinho.');
    expect(html).toContain('Falha de rede.');
  });
});
