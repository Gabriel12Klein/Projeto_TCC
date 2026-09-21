export class ImageUploadError extends Error {
  constructor() { super('O vinho foi salvo, mas a foto não foi enviada. Os dados foram mantidos; tente salvar novamente para reenviar a foto, sem duplicar o vinho.'); }
}

export async function saveWithImage<T extends { id?: string | number }>(options: {
  save: (payload: Record<string, unknown>, previousId?: string | number) => Promise<T>;
  payload: Record<string, unknown>;
  previousId?: string | number;
  file?: File;
  upload: (id: string | number, file: File) => Promise<unknown>;
  remember: (id: string | number) => void;
}) {
  const saved = await options.save(options.payload, options.previousId);
  if (saved.id && options.file) {
    // Remember identity before upload: a retry updates this record, never creates another.
    options.remember(saved.id);
    try { await options.upload(saved.id, options.file); }
    catch { throw new ImageUploadError(); }
  }
  return saved;
}
