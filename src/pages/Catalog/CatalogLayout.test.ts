import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import CatalogLayout, { logoutFromClient } from './CatalogLayout';

it('solicita logout sem repassar o evento de clique como destino', () => {
  const logout = vi.fn();
  logoutFromClient(logout);
  expect(logout).toHaveBeenCalledOnce();
  expect(logout).toHaveBeenCalledWith();
});

it('não exibe a seção Vinho nem o atalho Início no menu do cliente', () => {
  const html = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(CatalogLayout, {
        user: {
          id: 'cliente',
          name: 'Cliente de teste',
          email: 'cliente@example.test',
          role: 'CUSTOMER',
          age: null,
          address: null,
          phone: null,
          birthDate: null,
          street: null,
          addressNumber: null,
          city: null,
          state: null,
          country: null,
        },
        onLogout: vi.fn(),
      }),
    ),
  );

  expect(html).not.toContain('>Vinho<');
  expect(html).not.toContain('>Início<');
  expect(html).toContain('>Conta<');
  expect(html.indexOf('Cadastrar vinícola')).toBeLessThan(html.indexOf('Cadastrar vinho'));
  expect(html.indexOf('Cadastrar vinho')).toBeLessThan(html.indexOf('Cadastrar local de compra'));
});
