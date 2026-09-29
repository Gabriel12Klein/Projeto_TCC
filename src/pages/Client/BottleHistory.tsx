import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/api';
import QueryFeedback from '../../ui/QueryFeedback';
import type { BottleStatus, CellarBottle, PageLimit, Paginated } from '../../types';
import PrivateImage from './PrivateImage';
import wineIcon from '../../assets/admin/sidebar/vinho.png';
import ConfirmDeleteDialog from '../../ui/ConfirmDeleteDialog';
import ExternalWineDetailsDialog from './ExternalWineDetailsDialog';
import DiscardBottleDialog from './DiscardBottleDialog';
import Pagination, { lastValidPage } from '../../ui/Pagination';

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

export function purchaseDateRangeError(from: string, to: string) {
  return from && to && from > to ? 'A data inicial não pode ser posterior à data final.' : '';
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
  DESCARTADA: 'Descartada',
};

export function bottleActions(status: BottleStatus) {
  return {
    open: status === 'DISPONIVEL',
    finish: status === 'ABERTA',
    discard: status === 'DISPONIVEL' || status === 'ABERTA',
    remove: status === 'DISPONIVEL',
  };
}

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

export function replaceBottleInPage(
  current: Paginated<CellarBottle> | undefined,
  updated: CellarBottle,
  activeStatus: string,
) {
  if (!current) return current;
  const items = replaceBottlePreservingOrder(current.items, updated, activeStatus) ?? [];
  const removed = current.items.length - items.length;
  const total = Math.max(current.total - removed, 0);
  return { ...current, items, total, totalPages: Math.ceil(total / current.limit) };
}

function BottleRow({
  bottle,
  pending,
  onEvent,
  onDelete,
  onDiscard,
  onOpenExternalWine,
}: {
  bottle: CellarBottle;
  pending: boolean;
  onEvent: (id: string, action: 'open' | 'finish', date: string) => Promise<boolean>;
  onDelete: (bottle: CellarBottle) => void;
  onDiscard: (bottle: CellarBottle) => void;
  onOpenExternalWine: (id: string) => void;
}) {
  const [action, setAction] = useState<'open' | 'finish' | null>(null);
  const [date, setDate] = useState(today());
  const dateInput = useRef<HTMLInputElement>(null);
  const image = bottle.inventoryItem.photoPath || bottle.inventoryItem.wine?.image?.path || wineIcon;
  const location = bottle.orderItem?.order.purchaseLocation;
  const availableActions = bottleActions(bottle.status);
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
          <h3 className="font-semibold text-[#5b0c1b]">{bottle.inventoryItem.name}</h3>
          <p className="text-sm text-[#715f59]">
            {bottle.inventoryItem.wineryName ||
              bottle.inventoryItem.wine?.winery?.name ||
              'Vinícola não informada'}
          </p>
          <span className="mt-2 inline-block rounded-full bg-[#f1e4d1] px-3 py-1 text-xs font-bold text-[#6d1d2b]">
            {statusLabel[bottle.status]}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
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
          <div>
            <dt className="text-[#715f59]">Descarte</dt>
            <dd>{formatDate(bottle.discardedAt)}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          {availableActions.open && (
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
                className="rounded-lg border border-[#9a6a2d] px-3 py-2 text-sm font-semibold text-[#7d5b2b]"
                disabled={pending}
                onClick={() => onDiscard(bottle)}
              >
                Descartar
              </button>
              <button
                type="button"
                className="self-center rounded-full border-2 border-[#9f1f32] bg-[#fff0f1] px-2.5 py-1.5 text-xs font-bold text-[#8f1f2c] shadow-sm transition hover:bg-[#f7dede]"
                disabled={pending}
                onClick={() => onDelete(bottle)}
              >
                Excluir garrafa
              </button>
            </>
          )}
          {availableActions.finish && (
            <>
              <button
                type="button"
                className="rounded-lg bg-[#7d1d2d] px-3 py-2 text-sm font-semibold text-white"
                disabled={pending}
                onClick={() => start('finish')}
              >
                Finalizar garrafa
              </button>
              <button
                type="button"
                className="rounded-lg border border-[#9a6a2d] px-3 py-2 text-sm font-semibold text-[#7d5b2b]"
                disabled={pending}
                onClick={() => onDiscard(bottle)}
              >
                Descartar
              </button>
            </>
          )}
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
        {bottle.status === 'DESCARTADA' && (
          <div className="mt-3 rounded-xl border border-[#eadfd3] bg-white p-3">
            <p className="font-semibold text-[#715f59]">Motivo do descarte</p>
            <p className="mt-1 text-[#715f59]">{bottle.discardReason}</p>
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
  const [wineTypeId, setWineTypeId] = useState('');
  const [purchasedFrom, setPurchasedFrom] = useState('');
  const [purchasedTo, setPurchasedTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<PageLimit>(10);
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState<CellarBottle | null>(null);
  const [discarding, setDiscarding] = useState<CellarBottle | null>(null);
  const [externalWineId, setExternalWineId] = useState<string | null>(null);
  const resultMessage = useRef<HTMLParagraphElement>(null);
  const qc = useQueryClient();
  const rangeError = purchaseDateRangeError(purchasedFrom, purchasedTo);
  const hasFilters = Boolean(status || wineTypeId || purchasedFrom || purchasedTo);
  const bottleQueryKey = useMemo(
    () => ['customer-cellar-bottles', status, wineTypeId, purchasedFrom, purchasedTo, page, limit] as const,
    [status, wineTypeId, purchasedFrom, purchasedTo, page, limit],
  );
  const wineTypes = useQuery({
    queryKey: ['customer-cellar-wine-types'],
    queryFn: api.customer.bottleWineTypes,
  });
  const bottles = useQuery({
    queryKey: bottleQueryKey,
    queryFn: () =>
      api.customer.bottles({
        status: status ? (status as BottleStatus) : undefined,
        wineTypeId: wineTypeId || undefined,
        purchasedFrom: purchasedFrom || undefined,
        purchasedTo: purchasedTo || undefined,
        page,
        limit,
      }),
    enabled: !rangeError,
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
      qc.setQueryData<Paginated<CellarBottle>>(bottleQueryKey, (current) =>
        replaceBottleInPage(current, updated, status),
      );
      await qc.invalidateQueries({
        queryKey: ['customer-cellar-bottles'],
        refetchType: status ? 'active' : 'none',
      });
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
  const discard = useMutation({
    mutationFn: ({ id, occurredAt, reason }: { id: string; occurredAt: string; reason: string }) =>
      api.customer.discardBottle(id, occurredAt, reason),
    onSuccess: async (updated) => {
      setMessage('Garrafa descartada e preservada no histórico da compra.');
      qc.setQueryData<Paginated<CellarBottle>>(bottleQueryKey, (current) =>
        replaceBottleInPage(current, updated, status),
      );
      await qc.invalidateQueries({
        queryKey: ['customer-cellar-bottles'],
        refetchType: status ? 'active' : 'none',
      });
      await qc.invalidateQueries({ queryKey: ['customer-inventory-dashboard'] });
      await qc.invalidateQueries({ queryKey: ['customer-inventory'] });
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Não foi possível descartar a garrafa.'),
  });
  useEffect(() => {
    if (message) window.requestAnimationFrame(() => resultMessage.current?.focus());
  }, [message]);
  useEffect(() => {
    const validPage = lastValidPage(page, bottles.data?.totalPages ?? 1);
    if (page !== validPage) setPage(validPage);
  }, [bottles.data?.totalPages, page]);

  return (
    <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6a2d]">Controle por garrafa</p>
          <h2 className="mt-1 font-playfair text-2xl text-[#5b0c1b]">Adega - Controle de Estoque</h2>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <label className="text-sm font-semibold text-[#5b0c1b]">
          Status
          <select
            className="mt-1 block w-full rounded-lg border border-[#d9cbbd] bg-white px-3 py-2"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="DISPONIVEL">Disponíveis</option>
            <option value="ABERTA">Abertas</option>
            <option value="CONSUMIDA">Consumidas</option>
            <option value="DESCARTADA">Descartadas</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-[#5b0c1b]">
          Tipo de vinho
          <select
            className="mt-1 block w-full rounded-lg border border-[#d9cbbd] bg-white px-3 py-2"
            value={wineTypeId}
            onChange={(event) => {
              setWineTypeId(event.target.value);
              setPage(1);
            }}
            disabled={wineTypes.isPending}
          >
            <option value="">Todos</option>
            {(wineTypes.data ?? []).map((wineType) => (
              <option key={wineType.id} value={wineType.id}>
                {wineType.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-[#5b0c1b]">
          Data inicial
          <input
            className="mt-1 block w-full rounded-lg border border-[#d9cbbd] bg-white px-3 py-2"
            type="date"
            value={purchasedFrom}
            onChange={(event) => {
              setPurchasedFrom(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="text-sm font-semibold text-[#5b0c1b]">
          Data final
          <input
            className="mt-1 block w-full rounded-lg border border-[#d9cbbd] bg-white px-3 py-2"
            type="date"
            value={purchasedTo}
            onChange={(event) => {
              setPurchasedTo(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <button
          className="rounded-lg border border-[#7d1d2d] px-4 py-2 text-sm font-semibold text-[#7d1d2d] disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={!hasFilters}
          onClick={() => {
            setStatus('');
            setWineTypeId('');
            setPurchasedFrom('');
            setPurchasedTo('');
            setPage(1);
          }}
        >
          Limpar filtros
        </button>
      </div>
      {rangeError && (
        <p className="mt-3 text-sm font-semibold text-[#9f1f32]" role="alert">
          {rangeError}
        </p>
      )}
      {wineTypes.error && (
        <p className="mt-3 text-sm text-[#9f1f32]" role="alert">
          Não foi possível carregar os tipos de vinho.
        </p>
      )}
      <div className="mt-6 grid gap-4">
        {(bottles.data?.items ?? []).map((bottle) => (
          <BottleRow
            key={bottle.id}
            bottle={bottle}
            pending={mutation.isPending || remove.isPending || discard.isPending}
            onDelete={setDeleting}
            onDiscard={setDiscarding}
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
        loading={!rangeError && bottles.isPending}
        error={rangeError ? null : bottles.error}
        fetching={!rangeError && bottles.isFetching}
        empty={!rangeError && !bottles.data?.items.length}
        emptyText={
          hasFilters
            ? 'Nenhuma garrafa encontrada com os filtros selecionados.'
            : 'Você ainda não possui vinhos cadastrados.'
        }
        loadingText="Carregando controle da adega…"
        retry={() => void bottles.refetch()}
      />
      {!rangeError && bottles.data && (
        <Pagination
          page={bottles.data.page}
          limit={limit}
          total={bottles.data.total}
          totalPages={bottles.data.totalPages}
          label="Adega - Controle de Estoque"
          onPageChange={setPage}
          onLimitChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
        />
      )}
      {message && (
        <p
          ref={resultMessage}
          tabIndex={-1}
          className="mt-4 rounded-xl border border-[#dfd0bd] p-4"
          role={mutation.isError || remove.isError || discard.isError ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        title="Excluir garrafa?"
        description={`Esta ação removerá permanentemente a unidade ${deleting?.bottleNumber ?? ''} de ${deleting?.inventoryItem.name ?? 'este vinho'} da compra e reduzirá a quantidade registrada. Diferente do descarte, ela não permanecerá no histórico.`}
        confirmLabel="Excluir garrafa"
        pending={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
      <DiscardBottleDialog
        bottle={discarding}
        pending={discard.isPending}
        error={discard.isError ? message : undefined}
        onCancel={() => {
          setDiscarding(null);
          discard.reset();
        }}
        onConfirm={async (occurredAt, reason) => {
          if (!discarding) return false;
          setMessage('');
          try {
            await discard.mutateAsync({ id: discarding.id, occurredAt, reason });
            return true;
          } catch {
            return false;
          }
        }}
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
