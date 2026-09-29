import { useEffect, useId, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { trapDialogTab } from '../../ui/ConfirmDialog';
import type { CellarBottle } from '../../types';

function today(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
}

function localDateValue(value: string) {
  return value.slice(0, 10);
}

type Props = {
  bottle: CellarBottle | null;
  pending: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: (occurredAt: string, reason: string) => Promise<boolean>;
};

export default function DiscardBottleDialog({ bottle, pending, error, onCancel, onConfirm }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [occurredAt, setOccurredAt] = useState(today());
  const [reason, setReason] = useState('');

  useEffect(() => {
    const current = dialog.current;
    if (!bottle || !current) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOccurredAt(today());
    setReason('');
    if (!current.open) current.showModal();
    const frame = window.requestAnimationFrame(() => dateInput.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      if (current.open) current.close();
      previousFocus.current?.focus();
    };
  }, [bottle]);

  if (!bottle) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await onConfirm(occurredAt, reason.trim())) onCancel();
  }

  function backdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (!pending && event.target === event.currentTarget) onCancel();
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-modal="true"
      className="m-auto w-[min(92vw,34rem)] rounded-2xl border border-[#e2c28d] bg-[#fffaf2] p-0 text-[#321b1c] shadow-2xl backdrop:bg-black/55 backdrop:backdrop-blur-[1px]"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      onClick={backdropClick}
      onKeyDown={trapDialogTab}
    >
      <form className="p-5 sm:p-7" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <h2 id={titleId} className="font-playfair text-2xl font-semibold text-[#5b0c1b]">
          Descartar garrafa?
        </h2>
        <p className="mt-2 leading-6 text-[#715f59]">
          Esta garrafa sairá do estoque ativo, permanecerá no histórico como descartada e não será
          contabilizada como consumida.
        </p>
        <label className="mt-5 block font-semibold text-[#5b0c1b]">
          Data do descarte
          <input
            ref={dateInput}
            className="mt-1 block min-h-11 w-full rounded-xl border border-[#d9cbbd] bg-white px-3 py-2"
            type="date"
            min={localDateValue(bottle.openedAt || bottle.purchasedAt)}
            max={today()}
            required
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
          />
        </label>
        <label className="mt-4 block font-semibold text-[#5b0c1b]">
          Motivo do descarte
          <textarea
            className="mt-1 block min-h-28 w-full rounded-xl border border-[#d9cbbd] bg-white px-3 py-2"
            maxLength={500}
            minLength={3}
            placeholder="Ex.: garrafa com defeito na vedação"
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        {error && (
          <p className="mt-4 rounded-xl border border-[#d9a4a4] bg-[#fffafa] p-3 text-[#8f1f2c]" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="min-h-11 rounded-xl border border-[#8b6a6e] bg-white px-4 py-2 font-semibold text-[#6b1425]"
            disabled={pending}
            type="button"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            className="min-h-11 rounded-xl bg-[#8f1f2c] px-4 py-2 font-semibold text-white hover:bg-[#741722] disabled:opacity-50"
            disabled={pending}
            type="submit"
          >
            {pending ? 'Descartando…' : 'Descartar garrafa'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
