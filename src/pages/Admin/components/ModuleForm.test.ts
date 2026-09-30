import { describe, expect, it, vi } from 'vitest';
import { batchQrAvailability, unsavedQrMessage } from './ModuleForm';

describe('disponibilidade da geração do QR Code', () => {
  it('bloqueia a geração e orienta o usuário quando o lote ainda não tem id', () => {
    const requestQrCode = vi.fn();
    const availability = batchQrAvailability();

    if (availability.canGenerate) requestQrCode();

    expect(availability).toEqual({ canGenerate: false, message: unsavedQrMessage });
    expect(requestQrCode).not.toHaveBeenCalled();
  });

  it('libera a geração quando o lote já está persistido', () => {
    expect(batchQrAvailability('lote-123')).toEqual({ canGenerate: true, message: '' });
  });
});
