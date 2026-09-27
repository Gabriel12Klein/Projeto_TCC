import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/api';
import QueryFeedback from '../../ui/QueryFeedback';
import type { BottleStatus, CellarBottle } from '../../types';
import PrivateImage from './PrivateImage';
import wineIcon from '../../assets/admin/sidebar/vinho.png';
import ConfirmDeleteDialog from '../../ui/ConfirmDeleteDialog';
import ExternalWineDetailsDialog from './ExternalWineDetailsDialog';

export function today(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function formatDate(value: string | null) {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function localDateValue(value: string) {
  return value.slice(0, 10);
}

export function bottleVintageYear(bottle: CellarBottle) {
  if (bottle.orderItem?.externalWineId) return bottle.orderItem.externalWine?.vintageYear ?? null;
  if (bottle.orderItem?.vintageYear != null) return bottle.orderItem.vintageYear;
  const years = [...new Set(bottle.inventoryItem.wine?.vintages.map(({ year }) => year) ?? [])];
  return years.length === 1 ? years[0] : null;
}

const statusLabel: Record<BottleStatus, string> = {
  DISPONIVEL: 'Disponível',
  ABERTA: 'Aberta',
  CONSUMIDA: 'Consumida',
};

export function replaceBottlePreservingOrder(
  bottles: CellarBottle[] | undefined,
  updated: CellarBottle,
  activeStatus: string,
) {
  if (!bottles) return bottles;
  return bottles
    .map((bottle) => (bottle.id === updated.id ? { ...updated, bottleNumber: bottle.bottleNumber } : bottle))
    .filter((bottle) => !activeStatus || bottle.status === activeStatus);
}

function BottleRow({
  bottle,
  pending,
  onEvent,
  onDelete,
  onOpenExternalWine,
}: {
  bottle: CellarBottle;
  pending: boolean;
  onEvent: (id: string, action: 'open' | 'finish', date: string) => Promise<boolean>;
  onDelete: (bottle: CellarBottle) => void;
  onOpenExternalWine: (id: string) => void;
}) {
  const [action, setAction] = useState<'open' | 'finish' | null>(null);
  const [date, setDate] = useState(today());
  const dateInput = useRef<HTMLInputElement>(null);
  const image = bottle.inventoryItem.photoPath || bottle.inventoryItem.wine?.image?.path || wineIcon;
  const location = bottle.orderItem?.order.purchaseLocation;
  function start(next: 'open' | 'finish') {
    setAction(next);
    window.requestAnimationFrame(() => dateInput.current?.focus());
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!action) return;
    const saved = await onEvent(bottle.id, action, date);
    if (saved) setAction(null);
  }
  return (
    <article className="rounded-2xl border border-[#eadfd3] bg-[#fffaf5] p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <PrivateImage src={image} alt="" className="h-16 w-14 rounded-xl object-contain bg-[#f1e4d1]" />
        <div className="min-w-[180px] flex-1">
          <h3 className="font-semibold text-[#5b0c1b]">
            {bottle.inventoryItem.name} · garrafa #{bottle.bottleNumber}
          </h3>
          <p className="text-sm text-[#715f59]">
            {bottle.inventoryItem.wineryName ||
              bottle.inventoryItem.wine?.winery?.name ||
              'Vinícola não informada'}
          </p>
          <span className="mt-2 inline-block rounded-full bg-[#f1e4d1] px-3 py-1 text-xs font-bold text-[#6d1d2b]">
            {statusLabel[bottle.status]}
          </span>
        </div>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-[#715f59]">Compra</dt>
            <dd>{formatDate(bottle.purchasedAt)}</dd>
          </div>
          <div>
            <dt className="text-[#715f59]">Abertura</dt>
            <dd>{formatDate(bottle.openedAt)}</dd>
          </div>
          <div>
            <dt className="text-[#715f59]">Consumo</dt>
            <dd>{formatDate(bottle.finishedAt)}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          {bottle.status === 'DISPONIVEL' && (
            <>
              <button
                type="button"
                className="rounded-lg border border-[#7d1d2d] px-3 py-2 text-sm font-semibold text-[#7d1d2d]"
                disabled={pending}
                onClick={() => start('open')}
              >
                Abrir garrafa
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#7d1d2d] px-3 py-2 text-sm font-semibold text-white"
                disabled={pending}
                onClick={() => start('finish')}
              >
                Finalizar garrafa
              </button>
            </>
          )}
          {bottle.status === 'ABERTA' && (
            <button
              type="button"
              className="rounded-lg bg-[#7d1d2d] px-3 py-2 text-sm font-semibold text-white"
              disabled={pending}
              onClick={() => start('finish')}
            >
              Finalizar garrafa
            </button>
          )}
          <button
            type="button"
            className="self-center rounded-full border-2 border-[#9f1f32] bg-[#fff0f1] px-2.5 py-1.5 text-xs font-bold text-[#8f1f2c] shadow-sm transition hover:bg-[#f7dede]"
            disabled={pending}
            onClick={() => onDelete(bottle)}
          >
            Excluir garrafa
          </button>
        </div>
      </div>
      {action && (
        <form
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-[#eadfd3] pt-4"
          onSubmit={submit}
        >
          <label className="text-sm font-semibold text-[#5b0c1b]">
            {action === 'open' ? 'Data de abertura' : 'Data de consumo'}
            <input
              ref={dateInput}
              className="mt-1 block rounded-lg border border-[#d9cbbd] px-3 py-2"
              type="date"
              min={localDateValue(bottle.openedAt || bottle.purchasedAt)}
              max={today()}
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <button
            className="rounded-lg bg-[#7d1d2d] px-4 py-2 text-sm font-semibold text-white"
            disabled={pending}
            type="submit"
          >
            {pending ? 'Salvando…' : 'Confirmar'}
          </button>
          <button
            className="rounded-lg border border-[#d9cbbd] px-4 py-2 text-sm"
            disabled={pending}
            type="button"
            onClick={() => setAction(null)}
          >
            Cancelar
          </button>
        </form>
      )}
      <details className="mt-4 border-t border-[#eadfd3] pt-3 text-sm">
        <summary className="cursor-pointer font-semibold text-[#7d1d2d]">
          Ver detalhes da garrafa e do vinho
        </summary>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-[#715f59]">Vinícola</dt>
            <dd>
              {bottle.inventoryItem.wine?.winery?.name ||
                bottle.orderItem?.externalWine?.externalWinery.name ||
                bottle.inventoryItem.wineryName ||
                'Não informada'}
            </dd>
          </div>
          <div>
            <dt className="text-[#715f59]">Local da compra</dt>
            <dd>{location || 'Não informado'}</dd>
          </div>
          <div>
            <dt className="text-[#715f59]">Safra</dt>
            <dd>{bottleVintageYear(bottle) ?? 'Não informada'}</dd>
          </div>
          <div>
            <dt className="text-[#715f59]">Uvas</dt>
            <dd>
              {(bottle.inventoryItem.wine?.grapeLinks || bottle.orderItem?.externalWine?.grapeLinks)
                ?.map(({ grape }) => grape.name)
                .join(', ') || 'Não informadas'}
            </dd>
          </div>
        </dl>
        {(bottle.inventoryItem.wine?.description || bottle.orderItem?.externalWine?.description) && (
          <div className="mt-3">
            <p className="font-semibold text-[#715f59]">Descrição</p>
            <p className="mt-1 text-[#715f59]">
              {bottle.inventoryItem.wine?.description || bottle.orderItem?.externalWine?.description}
            </p>
          </div>
        )}
        {bottle.orderItem?.externalWineId && (
          <button
            className="mt-3 font-semibold text-[#7d1d2d] underline underline-offset-4"
            type="button"
            onClick={() => onOpenExternalWine(bottle.orderItem!.externalWineId!)}
          >
            Ver ficha do vinho →
          </button>
        )}
        {bottle.inventoryItem.wine?.slug && (
          <Link
            className="mt-3 inline-block font-semibold text-[#7d1d2d]"
            to={`/catalogo/vinhos/${encodeURIComponent(bottle.inventoryItem.wine.slug)}`}
          >
            Ver ficha do vinho →
          </Link>
        )}
      </details>
    </article>
  );
}

export default function BottleHistory() {
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState<CellarBottle | null>(null);
  const [externalWineId, setExternalWineId] = useState<string | null>(null);
  const resultMessage = useRef<HTMLParagraphElement>(null);
  const qc = useQueryClient();
  const bottles = useQuery({
    queryKey: ['customer-cellar-bottles', status],
    queryFn: () => api.customer.bottles(status || undefined),
  });
  const externalWine = useQuery({
    queryKey: ['customer-external-wine-details', externalWineId],
    queryFn: () => api.customer.externalWine(externalWineId!),
    enabled: Boolean(externalWineId),
  });
  const mutation = useMutation({
    mutationFn: ({
      id,
      action,
      occurredAt,
    }: {
      id: string;
      action: 'open' | 'finish';
      occurredAt: string;
    }) =>
      action === 'open' ? api.customer.openBottle(id, occurredAt) : api.customer.finishBottle(id, occurredAt),
    onSuccess: async (updated, variables) => {
      setMessage(
        variables.action === 'open'
          ? 'Garrafa aberta e dashboard atualizado.'
          : 'Consumo finalizado e preservado no histórico.',
      );
      qc.setQueryData<CellarBottle[]>(['customer-cellar-bottles', status], (current) =>
        replaceBottlePreservingOrder(current, updated, status),
      );
      await qc.invalidateQueries({ queryKey: ['customer-cellar-bottles'], refetchType: 'none' });
      await qc.invalidateQueries({ queryKey: ['customer-inventory-dashboard'] });
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar a garrafa.'),
  });
  const remove = useMutation({
    mutationFn: api.customer.removeBottle,
    onSuccess: async () => {
      setDeleting(null);
      setMessage('Garrafa e histórico relacionado excluídos permanentemente.');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['customer-orders'] }),
        qc.invalidateQueries({ queryKey: ['customer-inventory'] }),
        qc.invalidateQueries({ queryKey: ['customer-cellar-bottles'] }),
        qc.invalidateQueries({ queryKey: ['customer-inventory-dashboard'] }),
      ]);
    },
    onError: (error) => {
      setDeleting(null);
      setMessage(error instanceof Error ? error.message : 'Não foi possível excluir a garrafa.');
    },
  });
  useEffect(() => {
    if (message) window.requestAnimationFrame(() => resultMessage.current?.focus());
  }, [message]);

  return (
    <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6a2d]">Histórico individual</p>
          <h2 className="mt-1 font-playfair text-2xl text-[#5b0c1b]">Minhas garrafas</h2>
        </div>
        <label className="text-sm font-semibold text-[#5b0c1b]">
          Status
          <select
            className="ml-2 rounded-lg border border-[#d9cbbd] bg-white px-3 py-2"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="DISPONIVEL">Disponíveis</option>
            <option value="ABERTA">Abertas</option>
            <option value="CONSUMIDA">Consumidas</option>
          </select>
        </label>
      </div>
      <div className="mt-6 grid gap-4">
        {(bottles.data ?? []).map((bottle) => (
          <BottleRow
            key={bottle.id}
            bottle={bottle}
            pending={mutation.isPending || remove.isPending}
            onDelete={setDeleting}
            onOpenExternalWine={setExternalWineId}
            onEvent={async (id, action, occurredAt) => {
              setMessage('');
              try {
                await mutation.mutateAsync({ id, action, occurredAt });
                return true;
              } catch {
                return false;
              }
            }}
          />
        ))}
      </div>
      <QueryFeedback
        loading={bottles.isPending}
        error={bottles.error}
        fetching={bottles.isFetching}
        empty={!bottles.data?.length}
        emptyText={status ? 'Nenhuma garrafa com este status.' : 'Você ainda não possui vinhos cadastrados.'}
        loadingText="Carregando histórico da adega…"
        retry={() => void bottles.refetch()}
      />
      {message && (
        <p
          ref={resultMessage}
          tabIndex={-1}
          className="mt-4 rounded-xl border border-[#dfd0bd] p-4"
          role={mutation.isError || remove.isError ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        title="Excluir garrafa?"
        description={`Esta ação removerá permanentemente a unidade ${deleting?.bottleNumber ?? ''} de ${deleting?.inventoryItem.name ?? 'este vinho'} e seu histórico de abertura/consumo.`}
        confirmLabel="Excluir garrafa"
        pending={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
      <ExternalWineDetailsDialog
        open={Boolean(externalWineId)}
        wine={externalWine.data}
        loading={externalWine.isPending}
        error={externalWine.error}
        onClose={() => setExternalWineId(null)}
        onRetry={() => void externalWine.refetch()}
      />
    </section>
  );
}
