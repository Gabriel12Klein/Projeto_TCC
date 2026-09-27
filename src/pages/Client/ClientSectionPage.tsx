import QueryFeedback from '../../ui/QueryFeedback';
import FieldError from '../../ui/FieldError';
import { useFormFeedback } from '../../ui/useFormFeedback';
import { validatePurchase } from './formValidation';
import PrivateImage from './PrivateImage';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/api';
import type { CustomerOrder } from '../../types';
import BottlePhotoPicker from './BottlePhotoPicker';
import { persistOrderDraft, readOrderDraft } from './orderDraft';
import InventoryDashboard from './InventoryDashboard';

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

function Orders({ userId }: { userId: string }) {
  const [restoredDraft] = useState(() => readOrderDraft(userId));
  const feedback = useFormFeedback('purchase', { quantityBottles: 'qty', wineName: 'name' });
  const sending = useRef(false);
  const sourceField = useRef<HTMLSelectElement>(null);
  const resultMessage = useRef<HTMLParagraphElement>(null);
  const [editing, setEditing] = useState<{
    orderId: string;
    itemId: string;
    date: string;
    photo?: string | null;
  } | null>(restoredDraft?.editing ?? null);
  const [purchaseLocation, setPurchaseLocation] = useState(restoredDraft?.purchaseLocation ?? '');
  const [purchasePhoto, setPurchasePhoto] = useState<File | null>(null);
  const [photoNeedsReselect, setPhotoNeedsReselect] = useState(restoredDraft?.photoNeedsReselect ?? false);
  const [draftRecovered, setDraftRecovered] = useState(Boolean(restoredDraft));
  const qc = useQueryClient();
  const ordersQuery = useQuery({ queryKey: ['customer-orders'], queryFn: api.customer.orders });
  const winesQuery = useQuery({ queryKey: ['public-wines'], queryFn: () => api.catalog.list() });
  const [open, setOpen] = useState(restoredDraft?.open ?? false);
  const [source, setSource] = useState<'VINICULA' | 'OUTRO_LOCAL'>(restoredDraft?.source ?? 'VINICULA');
  const [wineId, setWineId] = useState(restoredDraft?.wineId ?? '');
  const [name, setName] = useState(restoredDraft?.name ?? '');
  const [qty, setQty] = useState(restoredDraft?.qty ?? '1');
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (open) window.requestAnimationFrame(() => sourceField.current?.focus());
  }, [open]);
  useEffect(() => {
    if (message && !open) window.requestAnimationFrame(() => resultMessage.current?.focus());
  }, [message, open]);
  useEffect(() => {
    persistOrderDraft(userId, {
      open,
      source,
      wineId,
      name,
      qty,
      purchaseLocation,
      editing,
      photoNeedsReselect: Boolean(purchasePhoto || photoNeedsReselect),
    });
  }, [userId, open, source, wineId, name, qty, purchaseLocation, editing, purchasePhoto, photoNeedsReselect]);
  const orders = ordersQuery.data ?? [];
  const wines = winesQuery.data ?? [];
  const save = useMutation({
    mutationFn: (payload: Parameters<typeof api.customer.createOrder>[0]) =>
      editing
        ? api.customer.updateOrderItem(editing.orderId, editing.itemId, payload)
        : api.customer.createOrder(payload),
    onSuccess: async () => {
      setMessage(editing ? 'Vinho atualizado e adega ajustada.' : 'Vinho salvo e adicionado à adega.');
      setEditing(null);
      setOpen(false);
      setPurchaseLocation('');
      setPurchasePhoto(null);
      setPhotoNeedsReselect(false);
      setDraftRecovered(false);
      setName('');
      setWineId('');
      setQty('1');
      await qc.invalidateQueries({ queryKey: ['customer-orders'] });
      await qc.invalidateQueries({ queryKey: ['customer-inventory'] });
      await qc.invalidateQueries({ queryKey: ['customer-inventory-dashboard'] });
    },
    onError: (e) => {
      feedback.fromApi(e);
      setMessage(e instanceof Error ? e.message : 'Não foi possível salvar o vinho. Tente novamente.');
    },
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending.current) return;
    const issues = {
      ...feedback.nativeErrors(e.currentTarget as HTMLFormElement),
      ...validatePurchase({
        source,
        wineId,
        name,
        qty,
        purchaseLocation,
        photo: Boolean(purchasePhoto || editing?.photo),
      }),
    };
    feedback.show(issues);
    if (Object.keys(issues).length)
      return setMessage('Confira os campos destacados. Seus dados foram mantidos.');
    if (source === 'VINICULA' && (winesQuery.isPending || winesQuery.isError))
      return setMessage('Aguarde o catálogo carregar ou tente carregá-lo novamente.');
    sending.current = true;
    setMessage('');
    try {
      await save.mutateAsync({
        source,
        purchaseDate: editing?.date ?? localTodayAtNoonUtc(),
        purchaseLocation: purchaseLocation.trim(),
        photo: purchasePhoto || undefined,
        items: [
          {
            ...(source === 'VINICULA' ? { wineId } : { wineName: name.trim() }),
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
        <h2 className="font-playfair text-3xl">Cadastre seus vinhos</h2>
        <p className="mt-2 text-white">
          Cada vinho cadastrado entra automaticamente na sua adega e no resumo de consumo.
        </p>
        <button
          className="mt-5 rounded-xl bg-[#d0a565] px-5 py-3 font-semibold text-[#4c151c]"
          disabled={save.isPending}
          onClick={() => {
            if (
              (name || wineId || purchaseLocation || purchasePhoto) &&
              !window.confirm('Descartar o preenchimento atual e cadastrar outro vinho?')
            )
              return;
            feedback.show({}, false);
            setEditing(null);
            setPurchaseLocation('');
            setPurchasePhoto(null);
            setPhotoNeedsReselect(false);
            setDraftRecovered(false);
            setWineId('');
            setName('');
            setQty('1');
            setMessage('');
            setOpen(true);
          }}
        >
          + Cadastrar vinho
        </button>
      </section>
      {draftRecovered && (
        <p className="mt-4 rounded-xl border border-[#eadfd3] bg-white p-4 text-[#5b0c1b]" role="status">
          Rascunho de vinho recuperado nesta aba. Confira os dados antes de salvar.
        </p>
      )}
      {!open && (name || wineId || purchaseLocation || purchasePhoto) && (
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
              Tipo do rótulo *
              <select
                ref={sourceField}
                className={input}
                value={source}
                onChange={(e) => setSource(e.target.value as typeof source)}
              >
                <option value="VINICULA">Catálogo da VINUM</option>
                <option value="OUTRO_LOCAL">Rótulo de outro local</option>
              </select>
            </label>
            {source === 'VINICULA' ? (
              <label className="text-sm font-semibold text-[#5b0c1b]">
                Vinho do catálogo *
                <select
                  className={input}
                  {...feedback.field('wineId')}
                  value={wineId}
                  onChange={(e) => setWineId(e.target.value)}
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
            ) : (
              <label className="text-sm font-semibold text-[#5b0c1b]">
                Nome do rótulo *
                <input
                  className={input}
                  placeholder="Nome do rótulo"
                  {...feedback.field('name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <FieldError id="purchase-name-error" message={feedback.errors.name} />
              </label>
            )}
            <label className="text-sm font-semibold text-[#5b0c1b]">
              Local da compra *
              <input
                className={input}
                {...feedback.field('purchaseLocation')}
                value={purchaseLocation}
                onChange={(e) => setPurchaseLocation(e.target.value)}
                placeholder="Ex.: Supermercado Central, loja ou vinícola"
                maxLength={200}
                required
              />
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
            {editing?.photo && !purchasePhoto && (
              <div className="md:col-span-2 flex items-center gap-3">
                <PrivateImage
                  src={editing.photo}
                  alt="Foto atual do vinho"
                  className="h-20 w-14 object-contain"
                />
                <p className="text-sm text-[#715f59]">
                  A foto atual será mantida se você não selecionar outra.
                </p>
              </div>
            )}
            <BottlePhotoPicker
              buttonId="purchase-photo"
              externalError={feedback.errors.photo}
              value={purchasePhoto}
              onChange={(file) => {
                setPurchasePhoto(file);
                setPhotoNeedsReselect(false);
                feedback.clear('photo');
              }}
              required={source === 'OUTRO_LOCAL' && !editing?.photo}
            />
            {photoNeedsReselect && !purchasePhoto && (
              <p className="text-sm text-[#7d1d2d] md:col-span-2" role="status">
                A foto escolhida antes da interrupção precisa ser selecionada novamente para ser enviada.
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
            {source === 'VINICULA' && (
              <p className="text-sm text-[#715f59] md:col-span-2">
                Se não enviar uma foto, será usada a imagem disponível no catálogo da vinícola.
              </p>
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
                onClick={() => {
                  if (
                    window.confirm(
                      'Fechar este formulário? O rascunho ficará disponível nesta sessão até você salvar ou cadastrar outro vinho.',
                    )
                  )
                    setOpen(false);
                }}
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
          <h2 className="mt-1 font-playfair text-2xl text-[#5b0c1b]">Histórico da adega</h2>
          <p className="mt-2 text-[#715f59]">Consulte os rótulos, quantidades, datas e origens.</p>
        </div>
        <QueryFeedback
          loading={ordersQuery.isPending}
          error={ordersQuery.error}
          fetching={ordersQuery.isFetching}
          empty={!orders.length}
          emptyText="Você ainda não possui vinhos cadastrados. Use Cadastrar vinho para adicionar o primeiro."
          loadingText="Carregando vinhos…"
          retry={() => void ordersQuery.refetch()}
        />
        {orders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#f8efe5] text-xs uppercase tracking-wider text-[#7d5b2b]">
                <tr>
                  <th className="px-6 py-4">Nome do rótulo</th>
                  <th className="px-6 py-4">Quantidade</th>
                  <th className="px-6 py-4">Data da compra</th>
                  <th className="px-6 py-4">Origem</th>
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
                      <td className="px-6 py-5">
                        <span className="whitespace-nowrap rounded-full bg-[#f1e4d1] px-3 py-1 text-xs font-semibold text-[#7d5b2b]">
                          {order.source === 'VINICULA' ? 'Catálogo VINUM' : 'Outro local'}
                        </span>
                        {order.purchaseLocation && (
                          <p className="mt-2 max-w-[200px] whitespace-normal break-words text-sm text-[#715f59]">
                            {order.purchaseLocation}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded-lg border border-[#9a6a2d] px-3 py-2 text-xs font-semibold text-[#7d5b2b]"
                            disabled={save.isPending}
                            onClick={() => {
                              if (
                                open &&
                                !window.confirm('Abrir outro vinho e descartar o preenchimento atual?')
                              )
                                return;
                              feedback.show({}, false);
                              setEditing({
                                orderId: order.id,
                                itemId: item.id,
                                date: order.purchaseDate,
                                photo: item.photoPath,
                              });
                              setMessage('');
                              setPurchaseLocation(order.purchaseLocation ?? '');
                              setPurchasePhoto(null);
                              setPhotoNeedsReselect(false);
                              setDraftRecovered(false);
                              setSource(order.source);
                              setWineId(item.wineId ?? '');
                              setName(item.wineName);
                              setQty(String(item.quantityBottles));
                              setOpen(true);
                            }}
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
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
