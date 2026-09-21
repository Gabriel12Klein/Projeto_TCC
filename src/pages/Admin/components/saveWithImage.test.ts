import { expect, it, vi } from 'vitest';
import { ImageUploadError, saveWithImage } from './saveWithImage';

it('retém identidade antes de falha no upload e reutiliza no retry', async () => {
  const save = vi.fn().mockResolvedValue({ id: 'vinho-salvo' });
  const upload = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});
  let previousId: string | number | undefined;
  const remember = vi.fn((id: string | number) => { previousId = id; });
  const file = new File(['foto'], 'foto.png', { type: 'image/png' });
  const options = { save, upload, remember, payload: { name: 'Vinho' }, file };
  await expect(saveWithImage(options)).rejects.toBeInstanceOf(ImageUploadError);
  expect(remember).toHaveBeenCalledWith('vinho-salvo');
  expect(remember.mock.invocationCallOrder[0]).toBeLessThan(upload.mock.invocationCallOrder[0]);
  await expect(saveWithImage({ ...options, previousId })).resolves.toEqual({ id: 'vinho-salvo' });
  expect(save).toHaveBeenLastCalledWith({ name: 'Vinho' }, 'vinho-salvo');
});
it('não envia foto nem grava identidade quando o cadastro falha', async () => {
  const upload = vi.fn(), remember = vi.fn();
  await expect(saveWithImage({ save: vi.fn().mockRejectedValue(new Error('falha')), upload, remember, payload: {} })).rejects.toThrow('falha');
  expect(upload).not.toHaveBeenCalled();
  expect(remember).not.toHaveBeenCalled();
});
