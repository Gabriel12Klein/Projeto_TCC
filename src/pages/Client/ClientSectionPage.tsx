import QueryFeedback from '../../ui/QueryFeedback';
import FieldError from '../../ui/FieldError';
import { useFormFeedback } from '../../ui/useFormFeedback';
import { validateInventory, validatePurchase } from './formValidation';
import PrivateImage from './PrivateImage';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/api';
import type { CustomerOrder, InventoryItem } from '../../types';
import InventoryWineCard from './InventoryWineCard';
import BottlePhotoPicker from './BottlePhotoPicker';

const input =
  'w-full rounded-xl border border-[#d9cbbd] bg-white px-4 py-3 text-[#321b1c] outline-none focus:border-[#8b2638]';
function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="client-section-page mx-auto max-w-6xl px-5 py-10 lg:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#9a6a2d]">Área do cliente</p>
      <h1 className="mt-2 font-playfair text-4xl text-[#5b0c1b]">{title}</h1>
      {children}
    </main>
  );
}

function Orders() {
  const feedback = useFormFeedback('purchase', { quantityBottles: 'qty', wineName: 'name' });
  const sending = useRef(false);
  const deleting = useRef(false);
  const [editing, setEditing] = useState<{
    orderId: string;
    itemId: string;
    date: string;
    photo?: string | null;
  } | null>(null);
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [purchasePhoto, setPurchasePhoto] = useState<File | null>(null);
  const qc = useQueryClient();
  const ordersQuery = useQuery({ queryKey: ['customer-orders'], queryFn: api.customer.orders });
  const winesQuery = useQuery({ queryKey: ['public-wines'], queryFn: () => api.catalog.list() });
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<'VINICULA' | 'OUTRO_LOCAL'>('VINICULA');
  const [wineId, setWineId] = useState('');
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [message, setMessage] = useState('');
  const orders = ordersQuery.data ?? [];
  const wines = winesQuery.data ?? [];
  const save = useMutation({
    mutationFn: (payload: Parameters<typeof api.customer.createOrder>[0]) =>
      editing
        ? api.customer.updateOrderItem(editing.orderId, editing.itemId, payload)
        : api.customer.createOrder(payload),
    onSuccess: async () => {
      setMessage(editing ? 'Pedido atualizado e estoque ajustado.' : 'Pedido salvo e adicionado ao estoque.');
      setEditing(null);
      setOpen(false);
      setPurchaseLocation('');
      setPurchasePhoto(null);
      setName('');
      setWineId('');
      setQty('1');
      await qc.invalidateQueries({ queryKey: ['customer-orders'] });
      await qc.invalidateQueries({ queryKey: ['customer-inventory'] });
    },
    onError: (e) => {
      feedback.fromApi(e);
      setMessage(e instanceof Error ? e.message : 'Não foi possível salvar o pedido. Tente novamente.');
    },
  });
  const remove = useMutation({
    mutationFn: api.customer.removeOrder,
    onSuccess: async () => {
      setMessage('Pedido excluído.');
      await qc.invalidateQueries({ queryKey: ['customer-orders'] });
      await qc.invalidateQueries({ queryKey: ['customer-inventory'] });
    },
    onError: (e) => setMessage(e instanceof Error ? e.message : 'Não foi possível excluir o pedido.'),
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending.current || deleting.current) return;
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
        purchaseDate: editing?.date ?? new Date().toISOString(),
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
  async function deleteOrder(id: string) {
    if (deleting.current || sending.current) return;
    if (
      !window.confirm(
        'Excluir este pedido do histórico? As garrafas e movimentações do estoque serão mantidas.',
      )
    )
      return;
    deleting.current = true;
    setMessage('');
    try {
      await remove.mutateAsync(id);
    } catch {
      /* mutation reports the error */
    } finally {
      deleting.current = false;
    }
  }

  return (
    <Shell title="Meus pedidos">
      <section className="mt-8 rounded-3xl bg-[#5b0c1b] p-8 text-white">
        <h2 className="font-playfair text-3xl">Histórico de compras</h2>
        <p className="mt-2 text-white">Registre vinhos da Vinum ou de qualquer outro local.</p>
        <button
          className="mt-5 rounded-xl bg-[#d0a565] px-5 py-3 font-semibold text-[#4c151c]"
          disabled={save.isPending || remove.isPending}
          onClick={() => {
            if (
              (name || wineId || purchaseLocation || purchasePhoto) &&
              !window.confirm('Descartar o preenchimento atual e iniciar outra compra?')
            )
              return;
            feedback.show({}, false);
            setEditing(null);
            setPurchaseLocation('');
            setPurchasePhoto(null);
            setWineId('');
            setName('');
            setQty('1');
            setMessage('');
            setOpen(true);
          }}
        >
          + Adicionar compra
        </button>
      </section>
      {!open && (name || wineId || purchaseLocation || purchasePhoto) && (
        <button type="button" className="mt-4 rounded-xl border border-[#7d1d2d] px-5 py-3 text-[#7d1d2d]" onClick={() => setOpen(true)}>Continuar preenchimento</button>
      )}
      {open && (
        <form
          className="mt-6 grid gap-4 rounded-3xl bg-white p-6 shadow-sm md:grid-cols-2"
          onSubmit={submit}
          noValidate
          aria-busy={save.isPending}
        >
          <fieldset disabled={save.isPending || remove.isPending} className="contents">
            <label className="text-sm font-semibold text-[#5b0c1b]">
              Tipo do rótulo *
              <select
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
                  {editing && wineId && !wines.some(wine => wine.id === wineId) && <option value={wineId}>{name} (rótulo deste pedido)</option>}
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
            {editing?.photo && !purchasePhoto && <div className="md:col-span-2 flex items-center gap-3"><PrivateImage src={editing.photo} alt="Foto atual do pedido" className="h-20 w-14 object-contain" /><p className="text-sm text-[#715f59]">A foto atual será mantida se você não selecionar outra.</p></div>}
            <BottlePhotoPicker
              buttonId="purchase-photo"
              externalError={feedback.errors.photo}
              value={purchasePhoto}
              onChange={setPurchasePhoto}
              required={source === 'OUTRO_LOCAL' && !editing?.photo}
            />
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
                {save.isPending ? 'Salvando...' : 'Salvar pedido'}
              </button>
              <button
                type="button"
                className="rounded-xl border border-[#7d1d2d] px-5 py-3 font-semibold text-[#7d1d2d]"
                disabled={save.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      'Fechar este formulário? Os dados preenchidos ficam disponíveis enquanto você permanecer nesta tela.',
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
          role={remove.isError ? 'alert' : 'status'}
          className="mt-4 rounded-xl border border-[#eadfd3] bg-white p-4 text-[#5b0c1b]"
        >
          {message}
        </p>
      )}
      <section className="mt-8 overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="border-b border-[#eadfd3] p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6a2d]">Registro de pedidos</p>
          <h2 className="mt-1 font-playfair text-2xl text-[#5b0c1b]">Histórico de compras</h2>
          <p className="mt-2 text-[#715f59]">Consulte os rótulos, quantidades, datas e origens.</p>
        </div>
        <QueryFeedback
          loading={ordersQuery.isPending}
          error={ordersQuery.error}
          fetching={ordersQuery.isFetching}
          empty={!orders.length}
          emptyText="Nenhum pedido registrado. Use Adicionar compra para registrar o primeiro."
          loadingText="Carregando pedidos…"
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
                            disabled={save.isPending || remove.isPending}
                            onClick={() => {
                              if (
                                open &&
                                !window.confirm('Abrir outro pedido e descartar o preenchimento atual?')
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
                              setSource(order.source);
                              setWineId(item.wineId ?? '');
                              setName(item.wineName);
                              setQty(String(item.quantityBottles));
                              setOpen(true);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={remove.isPending}
                            style={{ backgroundColor: '#c62828', color: '#ffffff' }}
                            className="rounded-lg border border-red-700 px-3 py-2 text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
                            onClick={() => deleteOrder(order.id)}
                          >
                            {remove.isPending && remove.variables === order.id ? 'Excluindo...' : 'Excluir'}
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

function Inventory() {
  const feedback = useFormFeedback('inventory', { quantityBottles: 'qty' });
  const sending = useRef(false);
  const moving = useRef(false);
  const qc = useQueryClient();
  const itemsQuery = useQuery({ queryKey: ['customer-inventory'], queryFn: api.customer.inventory });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [winery, setWinery] = useState('');
  const [qty, setQty] = useState('1');
  const [photo, setPhoto] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const create = useMutation({
    mutationFn: api.customer.createInventoryItem,
    onSuccess: async () => {
      setMessage('Rótulo adicionado ao estoque.');
      setOpen(false);
      setName('');
      setWinery('');
      setQty('1');
      setPhoto(null);
      await qc.invalidateQueries({ queryKey: ['customer-inventory'] });
    },
    onError: (e) => {
      feedback.fromApi(e);
      setMessage(e instanceof Error ? e.message : 'Não foi possível adicionar o rótulo. Tente novamente.');
    },
  });
  const move = useMutation({
    mutationFn: ({ id, type }: { id: string; type: 'ENTRADA' | 'CONSUMO' }) =>
      api.customer.movement(id, { type, quantityBottles: 1 }),
    onSuccess: async (_data, variables) => {
      setMessage(
        variables.type === 'ENTRADA'
          ? 'Entrada de uma garrafa registrada.'
          : 'Consumo de uma garrafa registrado.',
      );
      await qc.invalidateQueries({ queryKey: ['customer-inventory'] });
    },
    onError: (e) =>
      setMessage(e instanceof Error ? e.message : 'Não foi possível atualizar o estoque. Tente novamente.'),
  });
  const items = itemsQuery.data ?? [];
  async function add(e: FormEvent) {
    e.preventDefault();
    if (sending.current || moving.current) return;
    const issues = validateInventory({ name, qty, photo: Boolean(photo) });
    feedback.show(issues);
    if (Object.keys(issues).length || !photo)
      return setMessage('Confira os campos destacados. Seus dados foram mantidos.');
    sending.current = true;
    setMessage('');
    try {
      await create.mutateAsync({
        name: name.trim(),
        wineryName: winery.trim() || undefined,
        quantityBottles: Number(qty),
        photo,
      });
    } catch {
      /* mutation reports the error */
    } finally {
      sending.current = false;
    }
  }
  async function registerMovement(id: string, type: 'ENTRADA' | 'CONSUMO') {
    if (moving.current || sending.current) return;
    moving.current = true;
    setMessage('Registrando movimentação…');
    try {
      await move.mutateAsync({ id, type });
    } catch {
      /* mutation reports the error */
    } finally {
      moving.current = false;
    }
  }
  return (
    <Shell title="Meu estoque">
      <section className="mt-8 rounded-3xl bg-[#5b0c1b] p-8 text-white">
        <h2 className="font-playfair text-3xl">Minha adega</h2>
        <p className="mt-2 text-white">Adicione rótulos com foto e controle entradas e consumos.</p>
      </section>
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#9a6a2d]">Minha coleção</p>
            <h2 className="inventory-stock-total">
              <strong className="inventory-stock-total__number">
                {itemsQuery.isPending
                  ? '…'
                  : itemsQuery.isError
                    ? '—'
                    : items.reduce((s, i) => s + i.quantityBottles, 0)}
              </strong>
              <span className="inventory-stock-total__label">
                Garrafas disponíveis<span className="inventory-stock-total__detail">no seu estoque</span>
              </span>
            </h2>
          </div>
          <button
            className="self-center rounded-xl bg-[#7d1d2d] px-4 py-3 font-semibold text-white"
            disabled={create.isPending || move.isPending}
            onClick={() => setOpen(!open)}
          >
            {open ? 'Fechar formulário' : '+ Adicionar rótulo'}
          </button>
        </div>
        {open && (
          <form
            className="mt-6 grid gap-4 rounded-2xl bg-[#fffaf5] p-5 md:grid-cols-2"
            noValidate
            aria-busy={create.isPending}
            onSubmit={add}
          >
            <fieldset className="contents" disabled={create.isPending || move.isPending}>
              <label className="text-sm font-semibold text-[#5b0c1b]">
                Nome do rótulo *
                <input
                  className={input}
                  {...feedback.field('name')}
                  placeholder="Ex.: Reserva Merlot"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <FieldError id="inventory-name-error" message={feedback.errors.name} />
              </label>
              <label className="text-sm font-semibold text-[#5b0c1b]">
                Vinícola ou origem (opcional)
                <input
                  className={input}
                  placeholder="Ex.: Vinícola VINUM"
                  value={winery}
                  onChange={(e) => setWinery(e.target.value)}
                />
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
                />
                <FieldError id="inventory-qty-error" message={feedback.errors.qty} />
              </label>
              <BottlePhotoPicker
                buttonId="inventory-photo"
                externalError={feedback.errors.photo}
                value={photo}
                onChange={setPhoto}
              />
              <button
                className="rounded-xl bg-[#7d1d2d] px-5 py-3 font-semibold text-white"
                disabled={create.isPending}
              >
                {create.isPending ? 'Salvando…' : 'Salvar rótulo'}
              </button>
              <button
                type="button"
                className="rounded-xl border border-[#7d1d2d] px-5 py-3"
                disabled={create.isPending}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </button>
              {message && <p role="status">{message}</p>}
            </fieldset>
          </form>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((item: InventoryItem) => (
            <InventoryWineCard
              key={item.id}
              item={item}
              pending={move.isPending || create.isPending || itemsQuery.isError}
              onMove={(type) => void registerMovement(item.id, type)}
            />
          ))}
        </div>
        <QueryFeedback
          loading={itemsQuery.isPending}
          error={itemsQuery.error}
          fetching={itemsQuery.isFetching}
          empty={!items.length}
          emptyText="Seu estoque está vazio. Adicione um rótulo ou registre uma compra para começar."
          loadingText="Carregando sua adega…"
          retry={() => void itemsQuery.refetch()}
        />
        {message && !open && (
          <p
            className="mt-4 rounded-xl border border-[#dfd0bd] p-4"
            role={move.isError || create.isError ? 'alert' : 'status'}
          >
            {message}
          </p>
        )}
        <Link className="mt-6 inline-block text-sm font-semibold text-[#7d1d2d]" to="/pedidos">
          Registrar também um pedido completo -&gt;
        </Link>
      </section>
    </Shell>
  );
}

export default function ClientSectionPage({ title }: { title: string; description?: string }) {
  return title === 'Meus pedidos' ? <Orders /> : <Inventory />;
}
