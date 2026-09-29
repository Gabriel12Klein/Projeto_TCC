import QueryFeedback from '../../ui/QueryFeedback';
import FieldError from '../../ui/FieldError';
import { useFormFeedback } from '../../ui/useFormFeedback';
import { validatePurchase } from './formValidation';
import PrivateImage from './PrivateImage';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/api';
import type { CustomerOrder, PageLimit } from '../../types';
import BottleHistory from './BottleHistory';
import { persistOrderDraft, readOrderDraft } from './orderDraft';
import InventoryDashboard from './InventoryDashboard';
import ConfirmDeleteDialog from '../../ui/ConfirmDeleteDialog';
import ConfirmDialog from '../../ui/ConfirmDialog';
import Pagination, { lastValidPage } from '../../ui/Pagination';

const input =
  'w-full rounded-xl border border-[#d9cbbd] bg-white px-4 py-3 text-[#321b1c] outline-none focus:border-[#8b2638]';
function localTodayAtNoonUtc() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  return `${localDate}T12:00:00.000Z`;
}
function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="client-section-page mx-auto max-w-6xl px-5 py-10 lg:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#9a6a2d]">Área do cliente</p>
      <h1 className="mt-2 font-playfair text-4xl text-[#5b0c1b]">{title}</h1>
      {children}
    </main>
  );
}

export function wineSelectionAfterWineryChange(selected: string) {
  return {
    source: (selected === 'VINUM' ? 'VINICULA' : 'OUTRO_LOCAL') as 'VINICULA' | 'OUTRO_LOCAL',
    wineId: '',
    externalWineId: '',
    name: '',
  };
}

function Orders({ userId }: { userId: string }) {
  const [restoredDraft] = useState(() => readOrderDraft(userId));
  const feedback = useFormFeedback('purchase', {
    quantityBottles: 'qty',
    wineName: 'name',
    externalWineId: 'wineId',
    externalWineryId: 'winerySelection',
    vintageYear: 'vintageYear',
    purchaseLocationId: 'purchaseLocation',
  });
  const sending = useRef(false);
  const sourceField = useRef<HTMLSelectElement>(null);
  const resultMessage = useRef<HTMLParagraphElement>(null);
  const [editing, setEditing] = useState<{
    orderId: string;
    itemId: string;
    date: string;
  } | null>(restoredDraft?.editing ?? null);
  const [purchaseLocationId, setPurchaseLocationId] = useState(restoredDraft?.purchaseLocationId ?? '');
  const [purchaseLocation, setPurchaseLocation] = useState(restoredDraft?.purchaseLocation ?? '');
  const [draftRecovered, setDraftRecovered] = useState(Boolean(restoredDraft));
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLimit, setOrdersLimit] = useState<PageLimit>(10);
  const qc = useQueryClient();
  const ordersQuery = useQuery({
    queryKey: ['customer-orders', ordersPage, ordersLimit],
    queryFn: () => api.customer.orders({ page: ordersPage, limit: ordersLimit }),
  });
  const winesQuery = useQuery({ queryKey: ['public-wines'], queryFn: () => api.catalog.list() });
  const wineriesQuery = useQuery({
    queryKey: ['customer-external-wineries'],
    queryFn: api.customer.externalWineries,
  });
  const locationsQuery = useQuery({
    queryKey: ['customer-purchase-locations'],
    queryFn: api.customer.purchaseLocations,
  });
  const [open, setOpen] = useState(restoredDraft?.open ?? false);
  const [source, setSource] = useState<'VINICULA' | 'OUTRO_LOCAL'>(restoredDraft?.source ?? 'VINICULA');
  const [winerySelection, setWinerySelection] = useState(restoredDraft?.winerySelection ?? 'VINUM');
  const [wineId, setWineId] = useState(restoredDraft?.wineId ?? '');
  const [vintageYear, setVintageYear] = useState(restoredDraft?.vintageYear ?? '');
  const [externalWineId, setExternalWineId] = useState(restoredDraft?.externalWineId ?? '');
  const [name, setName] = useState(restoredDraft?.name ?? '');
  const [qty, setQty] = useState(restoredDraft?.qty ?? '1');
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
    action: () => void;
  } | null>(null);
  const [deleting, setDeleting] = useState<{
    orderId: string;
    itemId: string;
    name: string;
    quantity: number;
    mode: 'one' | 'all';
  } | null>(null);

  function prepareNewWine() {
    feedback.show({}, false);
    setEditing(null);
    setPurchaseLocationId('');
    setPurchaseLocation('');
    setDraftRecovered(false);
    setWineId('');
    setVintageYear('');
    setExternalWineId('');
    setWinerySelection('VINUM');
    setSource('VINICULA');
    setName('');
    setQty('1');
    setMessage('');
    setOpen(true);
  }

  function prepareEdit(order: CustomerOrder, item: CustomerOrder['items'][number]) {
    feedback.show({}, false);
    setEditing({ orderId: order.id, itemId: item.id, date: order.purchaseDate });
    setMessage('');
    setPurchaseLocationId(order.purchaseLocationId ?? 'LEGACY');
    setPurchaseLocation(order.purchaseLocation ?? '');
    setDraftRecovered(false);
    setSource(order.source);
    setWineId(item.wineId ?? '');
    setVintageYear(item.vintageYear?.toString() ?? '');
    setExternalWineId(item.externalWineId ?? '');
    setWinerySelection(item.wineId ? 'VINUM' : (item.externalWine?.externalWinery.id ?? 'LEGACY'));
    setName(item.wineName);
    setQty(String(item.quantityBottles));
    setOpen(true);
  }
  const externalWinesQuery = useQuery({
    queryKey: ['customer-external-wines', winerySelection],
    queryFn: () => api.customer.externalWines(winerySelection),
    enabled: Boolean(winerySelection && winerySelection !== 'VINUM' && winerySelection !== 'LEGACY'),
  });
  const wines = winesQuery.data ?? [];
  const selectedOfficialWine = wines.find((wine) => wine.id === wineId);
  const officialWineQuery = useQuery({
    queryKey: ['public-wine-detail', selectedOfficialWine?.slug],
    queryFn: () => api.catalog.detail(selectedOfficialWine!.slug),
    enabled: source === 'VINICULA' && Boolean(selectedOfficialWine?.slug),
  });
  useEffect(() => {
    if (open) window.requestAnimationFrame(() => sourceField.current?.focus());
  }, [open]);
  useEffect(() => {
    if (message && !open) window.requestAnimationFrame(() => resultMessage.current?.focus());
  }, [message, open]);
  useEffect(() => {
    const vintages = officialWineQuery.data?.vintages ?? [];
    if (source === 'VINICULA' && !vintageYear && vintages.length === 1)
      setVintageYear(String(vintages[0].year));
  }, [officialWineQuery.data, source, vintageYear]);
  useEffect(() => {
    persistOrderDraft(userId, {
      open,
      source,
      winerySelection,
      wineId,
      vintageYear,
      externalWineId,
      name,
      qty,
      purchaseLocationId,
      purchaseLocation,
      editing,
    });
  }, [
    userId,
    open,
    source,
    winerySelection,
    wineId,
    vintageYear,
    externalWineId,
    name,
    qty,
    purchaseLocationId,
    purchaseLocation,
    editing,
  ]);
  const orders = ordersQuery.data?.items ?? [];
  useEffect(() => {
    const validPage = lastValidPage(ordersPage, ordersQuery.data?.totalPages ?? 1);
    if (ordersPage !== validPage) setOrdersPage(validPage);
  }, [ordersPage, ordersQuery.data?.totalPages]);
  const save = useMutation({
    mutationFn: (payload: Parameters<typeof api.customer.createOrder>[0]) =>
      editing
        ? api.customer.updateOrderItem(editing.orderId, editing.itemId, payload)
        : api.customer.createOrder(payload),
    onSuccess: async () => {
      if (!editing) setOrdersPage(1);
      setMessage(editing ? 'Vinho atualizado e adega ajustada.' : 'Vinho salvo e adicionado à adega.');
      setEditing(null);
      setOpen(false);
      setPurchaseLocationId('');
      setPurchaseLocation('');
      setDraftRecovered(false);
      setName('');
      setWineId('');
      setVintageYear('');
      setExternalWineId('');
      setWinerySelection('VINUM');
      setSource('VINICULA');
      setQty('1');
      await qc.invalidateQueries({ queryKey: ['customer-orders'] });
      await qc.invalidateQueries({ queryKey: ['customer-inventory'] });
      await qc.invalidateQueries({ queryKey: ['customer-cellar-bottles'] });
      await qc.invalidateQueries({ queryKey: ['customer-inventory-dashboard'] });
    },
    onError: (e) => {
      feedback.fromApi(e);
      setMessage(e instanceof Error ? e.message : 'Não foi possível salvar o vinho. Tente novamente.');
    },
  });
  const removeBottles = useMutation({
    mutationFn: async (target: NonNullable<typeof deleting>) =>
      target.mode === 'one'
        ? api.customer.removeOneOrderItemBottle(target.orderId, target.itemId)
        : api.customer.removeAllOrderItemBottles(target.orderId, target.itemId),
    onSuccess: async (_data, target) => {
      setDeleting(null);
      setMessage(
        target.mode === 'one'
          ? 'Uma garrafa foi excluída permanentemente.'
          : `${target.quantity} garrafas foram excluídas permanentemente.`,
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['customer-orders'] }),
        qc.invalidateQueries({ queryKey: ['customer-inventory'] }),
        qc.invalidateQueries({ queryKey: ['customer-cellar-bottles'] }),
        qc.invalidateQueries({ queryKey: ['customer-inventory-dashboard'] }),
      ]);
    },
    onError: (error) => {
      setDeleting(null);
      setMessage(error instanceof Error ? error.message : 'Não foi possível excluir as garrafas.');
    },
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending.current) return;
    const issues = {
      ...feedback.nativeErrors(e.currentTarget as HTMLFormElement),
      ...validatePurchase({
        source,
        winerySelection,
        wineId,
        vintageYear,
        vintageRequired: Boolean(officialWineQuery.data?.vintages.length),
        externalWineId,
        name,
        qty,
        purchaseLocation,
        purchaseLocationId,
      }),
    };
    feedback.show(issues);
    if (Object.keys(issues).length)
      return setMessage('Confira os campos destacados. Seus dados foram mantidos.');
    if (source === 'VINICULA' && (winesQuery.isPending || winesQuery.isError))
      return setMessage('Aguarde o catálogo carregar ou tente carregá-lo novamente.');
    if (source === 'VINICULA' && wineId && (officialWineQuery.isPending || officialWineQuery.isError))
      return setMessage('Aguarde as safras do vinho carregar ou tente novamente.');
    if (source === 'OUTRO_LOCAL' && winerySelection !== 'LEGACY' && externalWinesQuery.isPending)
      return setMessage('Aguarde os vinhos da vinícola carregar.');
    sending.current = true;
    setMessage('');
    try {
      await save.mutateAsync({
        source,
        purchaseDate: editing?.date ?? localTodayAtNoonUtc(),
        ...(purchaseLocationId === 'LEGACY'
          ? { purchaseLocation: purchaseLocation.trim() }
          : { purchaseLocationId }),
        items: [
          {
            ...(source === 'VINICULA'
              ? { wineId, ...(vintageYear ? { vintageYear: Number(vintageYear) } : {}) }
              : winerySelection === 'LEGACY'
                ? { wineName: name.trim() }
                : { externalWineId, externalWineryId: winerySelection }),
            quantityBottles: Number(qty),
          },
        ],
      });
    } catch {
      /* mutation reports the error without clearing fields */
    } finally {
      sending.current = false;
    }
  }
  return (
    <Shell title="Meus vinhos">
      <section className="mt-8 rounded-3xl bg-[#5b0c1b] p-8 text-white">
        <h2 className="font-playfair text-3xl">Registre vinhos na adega</h2>
        <p className="mt-2 text-white">
          Cada vinho cadastrado entra automaticamente na sua adega e no resumo de consumo.
        </p>
        <button
          className="mt-5 rounded-xl bg-[#d0a565] px-5 py-3 font-semibold text-[#4c151c]"
          disabled={save.isPending}
          onClick={() => {
            if (name || wineId || externalWineId || purchaseLocationId || purchaseLocation) {
              setConfirmation({
                title: 'Cadastrar outro vinho?',
                description: 'O preenchimento atual será descartado para iniciar um novo cadastro.',
                cancelLabel: 'Continuar editando',
                confirmLabel: 'Cadastrar outro vinho',
                action: prepareNewWine,
              });
            } else prepareNewWine();
          }}
        >
          + Registrar vinho na adega
        </button>
      </section>
      {draftRecovered && (
        <p className="mt-4 rounded-xl border border-[#eadfd3] bg-white p-4 text-[#5b0c1b]" role="status">
          Rascunho de vinho recuperado nesta aba. Confira os dados antes de salvar.
        </p>
      )}
      {!open && (name || wineId || externalWineId || purchaseLocationId || purchaseLocation) && (
        <button
          type="button"
          className="mt-4 rounded-xl border border-[#7d1d2d] px-5 py-3 text-[#7d1d2d]"
          onClick={() => setOpen(true)}
        >
          Continuar preenchimento
        </button>
      )}
      {open && (
        <form
          className="mt-6 grid gap-4 rounded-3xl bg-white p-6 shadow-sm md:grid-cols-2"
          onSubmit={submit}
          noValidate
          aria-busy={save.isPending}
        >
          <fieldset disabled={save.isPending} className="contents">
            <label className="text-sm font-semibold text-[#5b0c1b]">
              Vinícola *
              <select
                ref={sourceField}
                className={input}
                {...feedback.field('winerySelection')}
                value={winerySelection}
                onChange={(event) => {
                  const selected = event.target.value;
                  const cleared = wineSelectionAfterWineryChange(selected);
                  setWinerySelection(selected);
                  setSource(cleared.source);
                  setWineId(cleared.wineId);
                  setVintageYear('');
                  setExternalWineId(cleared.externalWineId);
                  setName(cleared.name);
                  feedback.clear('winerySelection');
                  feedback.clear('wineId');
                }}
              >
                <option value="VINUM">Catálogo da VINUM</option>
                {winerySelection === 'LEGACY' && <option value="LEGACY">Cadastro externo anterior</option>}
                {(wineriesQuery.data ?? []).map((winery) => (
                  <option key={winery.id} value={winery.id}>
                    {winery.name}
                  </option>
                ))}
              </select>
              <FieldError id="purchase-winerySelection-error" message={feedback.errors.winerySelection} />
            </label>
            {winerySelection === 'VINUM' ? (
              <label className="text-sm font-semibold text-[#5b0c1b]">
                Vinho *
                <select
                  className={input}
                  {...feedback.field('wineId')}
                  value={wineId}
                  onChange={(e) => {
                    setWineId(e.target.value);
                    setVintageYear('');
                    feedback.clear('wineId');
                    feedback.clear('vintageYear');
                  }}
                >
                  <option value="">Selecione o vinho</option>
                  {editing && wineId && !wines.some((wine) => wine.id === wineId) && (
                    <option value={wineId}>{name} (rótulo deste cadastro)</option>
                  )}
                  {wines.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <FieldError id="purchase-wineId-error" message={feedback.errors.wineId} />
              </label>
            ) : winerySelection === 'LEGACY' ? (
              <label className="text-sm font-semibold text-[#5b0c1b]">
                Vinho externo preservado *
                <input className={input} value={name} readOnly />
                <span className="mt-1 block text-xs font-normal text-[#715f59]">
                  Registro anterior preservado sem associação automática.
                </span>
              </label>
            ) : (
              <label className="text-sm font-semibold text-[#5b0c1b]">
                Vinho *
                <select
                  className={input}
                  {...feedback.field('wineId')}
                  value={externalWineId}
                  onChange={(event) => {
                    setExternalWineId(event.target.value);
                    feedback.clear('wineId');
                  }}
                  disabled={!winerySelection || externalWinesQuery.isPending}
                >
                  <option value="">Selecione o vinho</option>
                  {(externalWinesQuery.data ?? []).map((wine) => (
                    <option key={wine.id} value={wine.id}>
                      {wine.name}
                    </option>
                  ))}
                </select>
                <FieldError id="purchase-wineId-error" message={feedback.errors.wineId} />
              </label>
            )}
            {winerySelection === 'VINUM' && wineId && (
              <label className="text-sm font-semibold text-[#5b0c1b]">
                Safra{officialWineQuery.data?.vintages.length ? ' *' : ''}
                <select
                  className={input}
                  {...feedback.field('vintageYear')}
                  value={vintageYear}
                  onChange={(event) => {
                    setVintageYear(event.target.value);
                    feedback.clear('vintageYear');
                  }}
                  disabled={officialWineQuery.isPending || officialWineQuery.isError}
                >
                  <option value="">
                    {officialWineQuery.isPending
                      ? 'Carregando safras...'
                      : officialWineQuery.data?.vintages.length
                        ? 'Selecione a safra'
                        : 'Nenhuma safra cadastrada'}
                  </option>
                  {(officialWineQuery.data?.vintages ?? []).map((vintage) => (
                    <option key={vintage.id} value={vintage.year}>
                      {vintage.year} · {vintage.identifier}
                    </option>
                  ))}
                </select>
                <FieldError id="purchase-vintageYear-error" message={feedback.errors.vintageYear} />
              </label>
            )}
            <label className="text-sm font-semibold text-[#5b0c1b]">
              Local da compra *
              <select
                className={input}
                {...feedback.field('purchaseLocation')}
                value={purchaseLocationId}
                onChange={(event) => {
                  setPurchaseLocationId(event.target.value);
                  if (event.target.value !== 'LEGACY') setPurchaseLocation('');
                }}
                required
              >
                <option value="">Selecione o local</option>
                {purchaseLocationId === 'LEGACY' && (
                  <option value="LEGACY">{purchaseLocation} (registro anterior)</option>
                )}
                {(locationsQuery.data ?? []).map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              <FieldError id="purchase-purchaseLocation-error" message={feedback.errors.purchaseLocation} />
            </label>
            <label className="text-sm font-semibold text-[#5b0c1b]">
              Quantidade de garrafas *
              <input
                className={input}
                type="number"
                min="1"
                step="1"
                {...feedback.field('qty')}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
              />
              <FieldError id="purchase-qty-error" message={feedback.errors.qty} />
            </label>
            {(wineriesQuery.isPending || wineriesQuery.isError) && (
              <div className="md:col-span-2">
                <QueryFeedback
                  loading={wineriesQuery.isPending}
                  error={wineriesQuery.error}
                  fetching={wineriesQuery.isFetching}
                  loadingText="Carregando vinícolas…"
                  retry={() => void wineriesQuery.refetch()}
                />
              </div>
            )}
            {(locationsQuery.isPending || locationsQuery.isError) && (
              <div className="md:col-span-2">
                <QueryFeedback
                  loading={locationsQuery.isPending}
                  error={locationsQuery.error}
                  fetching={locationsQuery.isFetching}
                  loadingText="Carregando locais de compra…"
                  retry={() => void locationsQuery.refetch()}
                />
              </div>
            )}
            {winerySelection !== 'VINUM' && winerySelection !== 'LEGACY' && (
              <div className="md:col-span-2">
                <QueryFeedback
                  loading={externalWinesQuery.isPending}
                  error={externalWinesQuery.error}
                  fetching={externalWinesQuery.isFetching}
                  loadingText="Carregando vinhos da vinícola…"
                  retry={() => void externalWinesQuery.refetch()}
                />
              </div>
            )}
            {!locationsQuery.isPending && !locationsQuery.data?.length && purchaseLocationId !== 'LEGACY' && (
              <p className="rounded-xl border border-[#eadfd3] p-4 text-sm text-[#715f59] md:col-span-2">
                Nenhum local de compra cadastrado.{' '}
                <Link className="font-semibold text-[#7d1d2d]" to="/cadastros/locais-compra">
                  Cadastrar local de compra
                </Link>
              </p>
            )}
            {winerySelection !== 'VINUM' &&
              winerySelection !== 'LEGACY' &&
              !externalWinesQuery.isPending &&
              !externalWinesQuery.data?.length && (
                <p className="rounded-xl border border-[#eadfd3] p-4 text-sm text-[#715f59] md:col-span-2">
                  Nenhum vinho cadastrado para esta vinícola.{' '}
                  <Link className="font-semibold text-[#7d1d2d]" to="/cadastros/vinhos">
                    Cadastrar vinho
                  </Link>
                </p>
              )}
            {source === 'VINICULA' && (
              <QueryFeedback
                loading={winesQuery.isPending}
                error={winesQuery.error}
                fetching={winesQuery.isFetching}
                empty={!wines.length}
                emptyText="Nenhum vinho publicado no catálogo. Você pode registrar um rótulo de outro local."
                loadingText="Carregando catálogo…"
                retry={() => void winesQuery.refetch()}
              />
            )}
            {source === 'VINICULA' && wineId && officialWineQuery.isError && (
              <div className="md:col-span-2">
                <QueryFeedback
                  loading={false}
                  error={officialWineQuery.error}
                  fetching={officialWineQuery.isFetching}
                  retry={() => void officialWineQuery.refetch()}
                />
              </div>
            )}
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button
                disabled={save.isPending}
                className="rounded-xl bg-[#7d1d2d] px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                {save.isPending ? 'Salvando...' : 'Salvar vinho'}
              </button>
              <button
                type="button"
                className="rounded-xl border border-[#7d1d2d] px-5 py-3 font-semibold text-[#7d1d2d]"
                disabled={save.isPending}
                onClick={() =>
                  setConfirmation({
                    title: 'Fechar formulário?',
                    description:
                      'O rascunho ficará disponível nesta sessão até você salvar ou cadastrar outro vinho.',
                    cancelLabel: 'Continuar editando',
                    confirmLabel: 'Fechar formulário',
                    action: () => setOpen(false),
                  })
                }
              >
                Cancelar
              </button>
            </div>
            {message && <p role="status">{message}</p>}
          </fieldset>
        </form>
      )}
      {message && !open && (
        <p
          ref={resultMessage}
          tabIndex={-1}
          role={save.isError ? 'alert' : 'status'}
          className="mt-4 rounded-xl border border-[#eadfd3] bg-white p-4 text-[#5b0c1b]"
        >
          {message}
        </p>
      )}
      <section className="mt-8 overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="border-b border-[#eadfd3] p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6a2d]">Vinhos cadastrados</p>
          <h2 className="mt-1 font-playfair text-2xl text-[#5b0c1b]">Compras</h2>
          <p className="mt-2 text-[#715f59]">
            Consulte os rótulos, quantidades, vinícolas e locais de compra.
          </p>
        </div>
        <div className="client-empty-feedback px-6 md:px-8">
          <QueryFeedback
            loading={ordersQuery.isPending}
            error={ordersQuery.error}
            fetching={ordersQuery.isFetching}
            empty={!orders.length}
            emptyText="Você ainda não possui vinhos cadastrados. Use Cadastrar vinho para adicionar o primeiro."
            loadingText="Carregando vinhos…"
            retry={() => void ordersQuery.refetch()}
          />
        </div>
        {orders.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-[#f8efe5] text-xs uppercase tracking-wider text-[#7d5b2b]">
                  <tr>
                    <th className="px-6 py-4">Nome do rótulo</th>
                    <th className="px-6 py-4">Quantidade</th>
                    <th className="px-6 py-4">Data da compra</th>
                    <th className="px-6 py-4">Vinícola</th>
                    <th className="px-6 py-4">Local de compra</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.flatMap((order: CustomerOrder) =>
                    order.items.map((item) => (
                      <tr className="border-t border-[#eee3d5] hover:bg-[#fffaf5]" key={item.id}>
                        <td className="px-6 py-5 font-semibold text-[#5b0c1b]">
                          <div className="flex items-center gap-3">
                            {item.photoPath && (
                              <PrivateImage
                                src={item.photoPath}
                                alt=""
                                className="h-14 w-10 shrink-0 rounded-lg object-contain"
                              />
                            )}
                            <span>{item.wineName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-[#715f59]">{item.quantityBottles} garrafa(s)</td>
                        <td className="px-6 py-5 text-[#715f59]">
                          {new Date(order.purchaseDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-5 text-[#715f59]">
                          {item.wineryName ??
                            item.externalWine?.externalWinery.name ??
                            (item.wineId ? 'VINUM' : 'Não informada')}
                        </td>
                        <td className="px-6 py-5 text-[#715f59]">
                          {order.purchaseLocationRef?.name ?? order.purchaseLocation ?? 'Não informado'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              className="rounded-lg border border-[#9a6a2d] px-3 py-2 text-xs font-semibold text-[#7d5b2b]"
                              disabled={save.isPending}
                              onClick={() => {
                                if (open) {
                                  setConfirmation({
                                    title: 'Abrir outro vinho?',
                                    description:
                                      'O preenchimento atual será descartado antes de abrir o vinho selecionado.',
                                    cancelLabel: 'Continuar editando',
                                    confirmLabel: 'Abrir outro vinho',
                                    action: () => prepareEdit(order, item),
                                  });
                                } else prepareEdit(order, item);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              className="rounded-lg border border-[#7d1d2d] px-3 py-2 text-xs font-semibold text-[#7d1d2d]"
                              disabled={removeBottles.isPending}
                              onClick={() =>
                                setDeleting({
                                  orderId: order.id,
                                  itemId: item.id,
                                  name: item.wineName,
                                  quantity: item.quantityBottles,
                                  mode: 'one',
                                })
                              }
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={ordersQuery.data?.page ?? ordersPage}
              limit={ordersLimit}
              total={ordersQuery.data?.total ?? 0}
              totalPages={ordersQuery.data?.totalPages ?? 0}
              label="Compras"
              onPageChange={setOrdersPage}
              onLimitChange={(nextLimit) => {
                setOrdersLimit(nextLimit);
                setOrdersPage(1);
              }}
            />
          </>
        ) : null}
      </section>
      <ConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.title ?? ''}
        description={confirmation?.description ?? ''}
        cancelLabel={confirmation?.cancelLabel}
        confirmLabel={confirmation?.confirmLabel ?? 'Confirmar'}
        variant="warning"
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          confirmation?.action();
          setConfirmation(null);
        }}
      />
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        title={deleting?.mode === 'all' ? 'Excluir todas as garrafas?' : 'Excluir garrafa?'}
        description={
          deleting?.mode === 'all'
            ? `Você está prestes a excluir permanentemente ${deleting.quantity} garrafas disponíveis desta compra. Garrafas abertas, consumidas ou descartadas são preservadas no histórico.`
            : `Você está prestes a excluir permanentemente uma unidade disponível de ${deleting?.name ?? 'este registro'} e reduzir a quantidade registrada nesta compra. Para remover todo o registro, escolha a opção de excluir as ${deleting?.quantity ?? 0} garrafas.`
        }
        confirmLabel={deleting?.mode === 'all' ? `Excluir ${deleting.quantity} garrafas` : 'Excluir garrafa'}
        alternativeLabel={
          deleting?.mode === 'one' && deleting.quantity > 1
            ? `Excluir todas as ${deleting.quantity} garrafas`
            : undefined
        }
        pending={removeBottles.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && removeBottles.mutate(deleting)}
        onAlternative={() => deleting && setDeleting({ ...deleting, mode: 'all' })}
      />
      <BottleHistory />
    </Shell>
  );
}

export default function ClientSectionPage({
  title,
  userId,
}: {
  title: string;
  description?: string;
  userId: string;
}) {
  return title === 'Meus vinhos' ? <Orders userId={userId} /> : <InventoryDashboard />;
}
