import { beforeEach, describe, expect, it, vi } from 'vitest';

const findFirst = vi.hoisted(() => vi.fn());
vi.mock('../../lib/prisma.js', () => ({
  prisma: { customerOrder: { findFirst } },
}));
import { customerService } from './customer.service.js';

describe('Histórico de pedidos que alimenta a adega', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserva um pedido existente e orienta a correção por edição', async () => {
    findFirst.mockResolvedValue({ id: 'pedido' });
    await expect(customerService.removeOrder('cliente', 'pedido')).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('preservados como histórico'),
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'pedido', userId: 'cliente' },
      select: { id: true },
    });
  });

  it('não revela pedidos pertencentes a outro cliente', async () => {
    findFirst.mockResolvedValue(null);
    await expect(customerService.removeOrder('outro-cliente', 'pedido')).rejects.toMatchObject({
      status: 404,
    });
  });
});
