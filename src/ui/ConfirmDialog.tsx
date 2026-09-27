import { useEffect, useId, useRef, type KeyboardEvent, type MouseEvent } from 'react';

export type ConfirmDialogVariant = 'info' | 'warning' | 'destructive';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  alternativeLabel?: string;
  pending?: boolean;
  pendingLabel?: string;
  variant?: ConfirmDialogVariant;
  onCancel: () => void;
  onConfirm: () => void;
  onAlternative?: () => void;
};

const focusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function trapDialogTab(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab') return;
  const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector));
  if (!controls.length) {
    event.preventDefault();
    return;
  }
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  alternativeLabel,
  pending = false,
  pendingLabel = 'Aguarde…',
  variant = 'warning',
  onCancel,
  onConfirm,
  onAlternative,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const current = dialog.current;
    if (!open || !current) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!current.open) current.showModal();
    const frame = window.requestAnimationFrame(() => cancel.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      if (current.open) current.close();
      previousFocus.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  const tone =
    variant === 'destructive'
      ? 'border-[#d9a4a4] bg-[#fffafa]'
      : variant === 'info'
        ? 'border-[#d8c8aa] bg-[#fffdf8]'
        : 'border-[#e2c28d] bg-[#fffaf2]';
  const confirmTone =
    variant === 'destructive' ? 'bg-[#8f1f2c] hover:bg-[#741722]' : 'bg-[#6b1425] hover:bg-[#54101d]';

  function cancelDialog() {
    if (!pending) onCancel();
  }

  function backdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) cancelDialog();
  }

  return (
    <dialog
      ref={dialog}
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      role="dialog"
      className={`m-auto w-[min(92vw,30rem)] rounded-2xl border p-0 text-[#321b1c] shadow-2xl backdrop:bg-black/55 backdrop:backdrop-blur-[1px] ${tone}`}
      onCancel={(event) => {
        event.preventDefault();
        cancelDialog();
      }}
      onClick={backdropClick}
      onKeyDown={trapDialogTab}
    >
      <section className="p-5 sm:p-7" role="document" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full font-bold ${
              variant === 'destructive'
                ? 'bg-[#f7dede] text-[#8f1f2c]'
                : variant === 'info'
                  ? 'bg-[#f1e5cc] text-[#7a5523]'
                  : 'bg-[#fae8c9] text-[#8a5b16]'
            }`}
          >
            {variant === 'destructive' ? '!' : 'i'}
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="font-playfair text-2xl font-semibold text-[#5b0c1b]">
              {title}
            </h2>
            <p id={descriptionId} className="mt-2 whitespace-pre-line leading-6 text-[#715f59]">
              {description}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            ref={cancel}
            className="min-h-11 rounded-xl border border-[#8b6a6e] bg-white px-4 py-2 font-semibold text-[#6b1425] transition hover:bg-[#fff6f5] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#d0a565] disabled:opacity-50"
            disabled={pending}
            type="button"
            onClick={cancelDialog}
          >
            {cancelLabel}
          </button>
          {alternativeLabel && onAlternative && (
            <button
              className="min-h-11 rounded-xl border border-[#7d1d2d] bg-white px-4 py-2 font-semibold text-[#7d1d2d] transition hover:bg-[#fff3f3] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#d0a565] disabled:opacity-50"
              disabled={pending}
              type="button"
              onClick={onAlternative}
            >
              {alternativeLabel}
            </button>
          )}
          <button
            className={`min-h-11 rounded-xl px-4 py-2 font-semibold text-white transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#d0a565] disabled:opacity-50 ${confirmTone}`}
            disabled={pending}
            type="button"
            onClick={onConfirm}
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </section>
    </dialog>
  );
}
