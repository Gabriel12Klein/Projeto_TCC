import { useEffect, useRef } from 'react';

export default function ConfirmDeleteDialog({
  open,
  title,
  description,
  confirmLabel,
  alternativeLabel,
  pending = false,
  onCancel,
  onConfirm,
  onAlternative,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  alternativeLabel?: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onAlternative?: () => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) window.requestAnimationFrame(() => cancel.current?.focus());
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <section
        aria-labelledby="delete-dialog-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 text-[#321b1c] shadow-2xl"
        role="dialog"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !pending) onCancel();
        }}
      >
        <h2 id="delete-dialog-title" className="font-playfair text-2xl text-[#5b0c1b]">
          {title}
        </h2>
        <p className="mt-3 leading-6 text-[#715f59]">{description}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            ref={cancel}
            className="rounded-xl border border-[#7d1d2d] px-4 py-2 font-semibold text-[#7d1d2d]"
            disabled={pending}
            type="button"
            onClick={onCancel}
          >
            Cancelar
          </button>
          {alternativeLabel && onAlternative && (
            <button
              className="rounded-xl border border-[#7d1d2d] px-4 py-2 font-semibold text-[#7d1d2d]"
              disabled={pending}
              type="button"
              onClick={onAlternative}
            >
              {alternativeLabel}
            </button>
          )}
          <button
            className="rounded-xl bg-[#7d1d2d] px-4 py-2 font-semibold text-white disabled:opacity-50"
            disabled={pending}
            type="button"
            onClick={onConfirm}
          >
            {pending ? 'Excluindo…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
