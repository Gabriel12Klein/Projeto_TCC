import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';

describe('modal de exclusão VINUM', () => {
  it('exibe impacto e ações sem usar confirmação nativa', () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDeleteDialog, {
        open: true,
        title: 'Excluir todas as garrafas?',
        description: 'Você excluirá permanentemente 5 garrafas.',
        confirmLabel: 'Excluir 5 garrafas',
        alternativeLabel: 'Excluir uma garrafa',
        onCancel: vi.fn(),
        onConfirm: vi.fn(),
        onAlternative: vi.fn(),
      }),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('Cancelar');
    expect(html).toContain('Excluir 5 garrafas');
    expect(html).toContain('Excluir uma garrafa');
  });

  it('não renderiza quando fechado', () => {
    expect(
      renderToStaticMarkup(
        createElement(ConfirmDeleteDialog, {
          open: false,
          title: 'Excluir?',
          description: 'Impacto',
          confirmLabel: 'Excluir',
          onCancel: vi.fn(),
          onConfirm: vi.fn(),
        }),
      ),
    ).toBe('');
  });
});
