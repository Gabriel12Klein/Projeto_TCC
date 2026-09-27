import { useEffect, useId, useRef, type MouseEvent } from 'react';
import type { ExternalWine } from '../../types';
import { trapDialogTab } from '../../ui/ConfirmDialog';
import PrivateImage from './PrivateImage';
import wineIcon from '../../assets/admin/sidebar/vinho.png';

type Props = {
  open: boolean;
  wine?: ExternalWine;
  loading: boolean;
  error: Error | null;
  onClose: () => void;
  onRetry: () => void;
};

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-[#715f59]">{label}</dt>
      <dd className="mt-1 whitespace-pre-line text-[#321b1c]">{value || 'Não informado'}</dd>
    </div>
  );
}

export default function ExternalWineDetailsDialog({ open, wine, loading, error, onClose, onRetry }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const current = dialog.current;
    if (!open || !current) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!current.open) current.showModal();
    const frame = window.requestAnimationFrame(() => closeButton.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      if (current.open) current.close();
      previousFocus.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  function backdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-modal="true"
      role="dialog"
      className="m-auto max-h-[90vh] w-[min(94vw,54rem)] overflow-y-auto rounded-3xl border border-[#d9cbbd] bg-[#fffdf9] p-0 text-[#321b1c] shadow-2xl backdrop:bg-black/55"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={backdropClick}
      onKeyDown={trapDialogTab}
    >
      <section className="p-5 sm:p-8" role="document" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-[#eadfd3] pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6a2d]">Ficha do vinho</p>
            <h2 id={titleId} className="mt-1 font-playfair text-3xl text-[#5b0c1b]">
              {wine?.name || 'Vinho externo'}
            </h2>
          </div>
          <button
            ref={closeButton}
            type="button"
            className="min-h-11 rounded-xl border border-[#8b6a6e] bg-white px-4 py-2 font-semibold text-[#6b1425] hover:bg-[#fff6f5]"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        {loading && (
          <p className="py-10 text-center" role="status">
            Carregando ficha do vinho…
          </p>
        )}
        {error && (
          <div className="my-6 rounded-xl border border-[#d9a4a4] bg-[#fffafa] p-4" role="alert">
            <p>Não foi possível carregar a ficha deste vinho. {error.message || 'Tente novamente.'}</p>
            <button className="mt-3 font-semibold text-[#7d1d2d] underline" type="button" onClick={onRetry}>
              Tentar novamente
            </button>
          </div>
        )}
        {wine && !loading && !error && (
          <div className="mt-6 grid gap-6 md:grid-cols-[12rem_1fr]">
            <PrivateImage
              src={wine.imagePath || wineIcon}
              alt={`Garrafa de ${wine.name}`}
              className="mx-auto h-64 w-48 rounded-2xl bg-[#f1e4d1] object-contain p-3"
            />
            <dl className="grid gap-5 sm:grid-cols-2">
              <Detail label="Vinícola" value={wine.externalWinery.name} />
              <Detail label="Safra" value={wine.vintageYear} />
              <Detail
                label="Uvas"
                value={wine.grapeLinks.map(({ grape }) => grape.name).join(', ') || null}
              />
              <Detail label="Descrição" value={wine.description} />
              <Detail label="Características" value={wine.characteristics} />
              <Detail label="Aromas" value={wine.aromas} />
              <div className="sm:col-span-2">
                <Detail label="Notas de degustação" value={wine.tastingNotes} />
              </div>
            </dl>
          </div>
        )}
      </section>
    </dialog>
  );
}
