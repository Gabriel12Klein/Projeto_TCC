import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/api';
import QueryFeedback from '../../ui/QueryFeedback';
import type { BottleStatus, CellarBottle } from '../../types';
import ConsumptionChart from './ConsumptionChart';
import PrivateImage from './PrivateImage';
import wineIcon from '../../assets/admin/sidebar/vinho.png';

function localYear() {
  return new Date().getFullYear();
}

function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('pt-BR') : '—';
}

function localDateValue(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
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
}: {
  bottle: CellarBottle;
  pending: boolean;
  onEvent: (id: string, action: 'open' | 'finish', date: string) => Promise<boolean>;
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
    const saved = await onEvent(bottle.id, action, `${date}T12:00:00.000Z`);
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
            <dt className="text-[#715f59]">Local da compra</dt>
            <dd>{location || 'Não informado'}</dd>
          </div>
          <div>
            <dt className="text-[#715f59]">Safra</dt>
            <dd>{bottle.orderItem?.vintageYear || 'Não informada'}</dd>
          </div>
          <div>
            <dt className="text-[#715f59]">Volume</dt>
            <dd>{bottle.orderItem?.volumeMl || bottle.inventoryItem.wine?.volumeMl || '—'} ml</dd>
          </div>
          <div>
            <dt className="text-[#715f59]">Origem</dt>
            <dd>
              {bottle.orderItem?.order.source === 'OUTRO_LOCAL' ? 'Rótulo externo privado' : 'Catálogo VINUM'}
            </dd>
          </div>
        </dl>
        {bottle.inventoryItem.wine?.description && (
          <p className="mt-3 text-[#715f59]">{bottle.inventoryItem.wine.description}</p>
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

export default function InventoryDashboard() {
  const [year, setYear] = useState(localYear());
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const resultMessage = useRef<HTMLParagraphElement>(null);
  const qc = useQueryClient();
  const dashboard = useQuery({
    queryKey: ['customer-inventory-dashboard', year],
    queryFn: () => api.customer.inventoryDashboard(year),
  });
  const bottles = useQuery({
    queryKey: ['customer-cellar-bottles', status],
    queryFn: () => api.customer.bottles(status || undefined),
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
  useEffect(() => {
    if (message) window.requestAnimationFrame(() => resultMessage.current?.focus());
  }, [message]);

  return (
    <main className="client-section-page mx-auto max-w-6xl px-5 py-10 lg:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#9a6a2d]">Área do cliente</p>
      <h1 className="mt-2 font-playfair text-4xl text-[#5b0c1b]">Dashboard</h1>
      <section className="mt-8 rounded-3xl bg-[#5b0c1b] p-8 text-white">
        <h2 className="font-playfair text-3xl">Resumo da minha adega</h2>
        <p className="mt-2">
          Acompanhe seus vinhos desde a entrada na adega até o consumo. Novos vinhos podem ser cadastrados em
          Meus vinhos.
        </p>
        <Link
          className="mt-5 inline-block rounded-xl bg-[#d0a565] px-5 py-3 font-semibold text-[#4c151c]"
          to="/vinhos"
        >
          Registrar um novo vinho
        </Link>
      </section>

      <QueryFeedback
        loading={dashboard.isPending}
        error={dashboard.error}
        fetching={dashboard.isFetching}
        loadingText="Carregando dashboard…"
        retry={() => void dashboard.refetch()}
      />
      {dashboard.data && (
        <>
          <section
            className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Indicadores da adega"
          >
            {[
              ['Total de garrafas adquiridas', dashboard.data.totals.acquiredBottles],
              ['Total de garrafas disponíveis', dashboard.data.totals.availableBottles],
              ['Total de garrafas abertas', dashboard.data.totals.openedBottles],
              ['Total de garrafas consumidas', dashboard.data.totals.consumedBottles],
            ].map(([label, value]) => (
              <article className="rounded-2xl bg-white p-5 shadow-sm" key={label}>
                <strong className="block text-3xl text-[#5b0c1b]">{value}</strong>
                <span className="mt-1 block text-sm text-[#715f59]">{label}</span>
              </article>
            ))}
          </section>
          <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6a2d]">Histórico real</p>
                <h2 className="mt-1 font-playfair text-2xl text-[#5b0c1b]">Consumo mensal</h2>
              </div>
              <label className="text-sm font-semibold text-[#5b0c1b]">
                Ano
                <select
                  className="ml-2 rounded-lg border border-[#d9cbbd] bg-white px-3 py-2"
                  value={dashboard.data.selectedYear}
                  onChange={(event) => setYear(Number(event.target.value))}
                >
                  {dashboard.data.years.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 overflow-x-auto">
              <ConsumptionChart data={dashboard.data.monthlyConsumption} year={dashboard.data.selectedYear} />
            </div>
          </section>
        </>
      )}

      <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6a2d]">
              Histórico individual
            </p>
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
              pending={mutation.isPending}
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
          emptyText={
            status ? 'Nenhuma garrafa com este status.' : 'Você ainda não possui vinhos cadastrados.'
          }
          loadingText="Carregando histórico da adega…"
          retry={() => void bottles.refetch()}
        />
        {message && (
          <p
            ref={resultMessage}
            tabIndex={-1}
            className="mt-4 rounded-xl border border-[#dfd0bd] p-4"
            role={mutation.isError ? 'alert' : 'status'}
          >
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
