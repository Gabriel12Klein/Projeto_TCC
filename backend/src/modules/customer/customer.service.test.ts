import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), delete: vi.fn(), inventoryUpdate: vi.fn() }));
vi.mock('../../lib/prisma.js', () => ({
  prisma: { $transaction: (work: (transaction: unknown) => unknown) => work({
    customerOrder: { findFirst: mocks.findFirst, delete: mocks.delete },
    inventoryItem: { update: mocks.inventoryUpdate },
  }) },
}));
import { customerService } from './customer.service.js';

describe('Exclusão do histórico de pedidos', () => {
  beforeEach(() => vi.clearAllMocks());
  it('exclui um pedido sem consultar ou alterar o saldo do estoque', async () => {
    mocks.findFirst.mockResolvedValue({ id: 'pedido', items: [{ inventoryItemId: 'estoque', quantityBottles: 8 }] });
    await customerService.removeOrder('cliente', 'pedido');
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'pedido', userId: 'cliente' } }));
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: 'pedido' } });
    expect(mocks.inventoryUpdate).not.toHaveBeenCalled();
  });
  it('não exclui pedidos não encontrados para o usuário autenticado', async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(customerService.removeOrder('outro-cliente', 'pedido')).rejects.toThrow('Pedido não encontrado.');
    expect(mocks.delete).not.toHaveBeenCalled();
  });
});
