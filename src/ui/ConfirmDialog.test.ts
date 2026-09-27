import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('expõe semântica acessível e ações contextuais', () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: true,
        title: 'Fechar formulário?',
        description: 'O rascunho continuará disponível nesta sessão.',
        cancelLabel: 'Continuar editando',
        confirmLabel: 'Fechar formulário',
        variant: 'warning',
        onCancel: vi.fn(),
        onConfirm: vi.fn(),
      }),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toMatch(/aria-labelledby="[^"]+"/);
    expect(html).toMatch(/aria-describedby="[^"]+"/);
    expect(html).toContain('Continuar editando');
    expect(html).toContain('Fechar formulário');
  });

  it('não renderiza conteúdo quando fechado', () => {
    expect(
      renderToStaticMarkup(
        createElement(ConfirmDialog, {
          open: false,
          title: 'Confirmar?',
          description: 'Descrição',
          confirmLabel: 'Confirmar',
          onCancel: vi.fn(),
          onConfirm: vi.fn(),
        }),
      ),
    ).toBe('');
  });
});
