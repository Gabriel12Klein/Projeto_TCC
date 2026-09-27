import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/api';
import QueryFeedback from '../../ui/QueryFeedback';
import type { ExternalWine, ExternalWinery, PurchaseLocation } from '../../types';

const inputClass =
  'mt-1 w-full rounded-xl border border-[#d9cbbd] bg-white px-4 py-3 text-[#321b1c] outline-none focus:border-[#8b2638]';

function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="client-section-page mx-auto max-w-6xl px-5 py-10 lg:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#9a6a2d]">Área do cliente</p>
      <h1 className="mt-2 font-playfair text-4xl text-[#5b0c1b]">{title}</h1>
      {children}
    </main>
  );
}

function NamedReferences({ kind }: { kind: 'winery' | 'location' }) {
  const winery = kind === 'winery';
  const title = winery ? 'Cadastrar vinícola' : 'Cadastrar local de compra';
  const singular = winery ? 'vinícola' : 'local de compra';
  const queryKey = winery ? ['customer-external-wineries'] : ['customer-purchase-locations'];
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const result = useRef<HTMLParagraphElement>(null);
  const qc = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn: winery ? api.customer.externalWineries : api.customer.purchaseLocations,
  });
  const save = useMutation({
    mutationFn: () =>
      winery
        ? editingId
          ? api.customer.updateExternalWinery(editingId, name.trim())
          : api.customer.createExternalWinery(name.trim())
        : editingId
          ? api.customer.updatePurchaseLocation(editingId, name.trim())
          : api.customer.createPurchaseLocation(name.trim()),
    onSuccess: async () => {
      setMessage(
        `${winery ? 'Vinícola' : 'Local de compra'} ${editingId ? 'atualizado' : 'cadastrado'} com sucesso.`,
      );
      setName('');
      setEditingId('');
      await qc.invalidateQueries({ queryKey });
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : `Não foi possível salvar o ${singular}.`),
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      winery ? api.customer.removeExternalWinery(id) : api.customer.removePurchaseLocation(id),
    onSuccess: async () => {
      setMessage(`${winery ? 'Vinícola' : 'Local de compra'} excluído com sucesso.`);
      await qc.invalidateQueries({ queryKey });
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : `Não foi possível excluir o ${singular}.`),
  });
  useEffect(() => {
    if (message) window.requestAnimationFrame(() => result.current?.focus());
  }, [message]);
  function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    if (name.trim().length < 2) return setMessage('Informe um nome com pelo menos 2 caracteres.');
    save.mutate();
  }
  const records = (query.data ?? []) as Array<ExternalWinery | PurchaseLocation>;
  return (
    <PageShell title={title}>
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
        <h2 className="font-playfair text-2xl text-[#5b0c1b]">
          {editingId ? `Editar ${singular}` : `Novo ${singular}`}
        </h2>
        <form className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={submit}>
          <label className="flex-1 text-sm font-semibold text-[#5b0c1b]">
            Nome *
            <input
              className={inputClass}
              value={name}
              maxLength={120}
              required
              autoComplete="off"
              placeholder={winery ? 'Ex.: Catena Zapata' : 'Ex.: Supermercado Central'}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button
            className="rounded-xl bg-[#7d1d2d] px-5 py-3 font-semibold text-white disabled:opacity-50"
            disabled={save.isPending}
            type="submit"
          >
            {save.isPending ? 'Salvando…' : editingId ? 'Salvar alteração' : 'Cadastrar'}
          </button>
          {editingId && (
            <button
              className="rounded-xl border border-[#7d1d2d] px-5 py-3 font-semibold text-[#7d1d2d]"
              type="button"
              onClick={() => {
                setEditingId('');
                setName('');
              }}
            >
              Cancelar
            </button>
          )}
        </form>
        {message && (
          <p
            ref={result}
            tabIndex={-1}
            className="mt-4 rounded-xl border border-[#eadfd3] p-4"
            role={save.isError || remove.isError ? 'alert' : 'status'}
          >
            {message}
          </p>
        )}
      </section>
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
        <h2 className="font-playfair text-2xl text-[#5b0c1b]">
          {winery ? 'Minhas vinícolas' : 'Meus locais de compra'}
        </h2>
        <QueryFeedback
          loading={query.isPending}
          error={query.error}
          fetching={query.isFetching}
          empty={!records.length}
          emptyText={`Nenhum ${singular} cadastrado.`}
          loadingText="Carregando cadastros…"
          retry={() => void query.refetch()}
        />
        <div className="mt-4 grid gap-3">
          {records.map((record) => (
            <article
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eadfd3] p-4"
              key={record.id}
            >
              <strong className="text-[#5b0c1b]">{record.name}</strong>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-[#9a6a2d] px-3 py-2 text-sm font-semibold text-[#7d5b2b]"
                  type="button"
                  onClick={() => {
                    setEditingId(record.id);
                    setName(record.name);
                    setMessage('');
                  }}
                >
                  Editar
                </button>
                <button
                  className="rounded-lg border border-[#7d1d2d] px-3 py-2 text-sm font-semibold text-[#7d1d2d] disabled:opacity-50"
                  disabled={remove.isPending}
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Excluir ${record.name}?`)) remove.mutate(record.id);
                  }}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function ExternalWines() {
  const [name, setName] = useState('');
  const [wineryId, setWineryId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const result = useRef<HTMLParagraphElement>(null);
  const qc = useQueryClient();
  const wineries = useQuery({
    queryKey: ['customer-external-wineries'],
    queryFn: api.customer.externalWineries,
  });
  const wines = useQuery({
    queryKey: ['customer-external-wines'],
    queryFn: () => api.customer.externalWines(),
  });
  const save = useMutation({
    mutationFn: () =>
      editingId
        ? api.customer.updateExternalWine(editingId, { name: name.trim(), externalWineryId: wineryId })
        : api.customer.createExternalWine({ name: name.trim(), externalWineryId: wineryId }),
    onSuccess: async () => {
      setMessage(`Vinho ${editingId ? 'atualizado' : 'cadastrado'} com sucesso.`);
      setName('');
      setWineryId('');
      setEditingId('');
      await qc.invalidateQueries({ queryKey: ['customer-external-wines'] });
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o vinho.'),
  });
  const remove = useMutation({
    mutationFn: api.customer.removeExternalWine,
    onSuccess: async () => {
      setMessage('Vinho excluído com sucesso.');
      await qc.invalidateQueries({ queryKey: ['customer-external-wines'] });
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Não foi possível excluir o vinho.'),
  });
  useEffect(() => {
    if (message) window.requestAnimationFrame(() => result.current?.focus());
  }, [message]);
  function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    if (!wineryId) return setMessage('Selecione uma vinícola.');
    if (name.trim().length < 2) return setMessage('Informe um nome com pelo menos 2 caracteres.');
    save.mutate();
  }
  return (
    <PageShell title="Cadastrar vinho">
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
        <h2 className="font-playfair text-2xl text-[#5b0c1b]">
          {editingId ? 'Editar vinho externo' : 'Novo vinho externo'}
        </h2>
        {!wineryId && !wineries.isPending && !wineries.data?.length && (
          <p className="mt-4 rounded-xl border border-[#eadfd3] p-4 text-[#715f59]">
            Cadastre uma vinícola antes de cadastrar o vinho.{' '}
            <Link className="font-semibold text-[#7d1d2d]" to="/cadastros/vinicolas">
              Cadastrar vinícola
            </Link>
          </p>
        )}
        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <label className="text-sm font-semibold text-[#5b0c1b]">
            Vinícola *
            <select
              className={inputClass}
              required
              value={wineryId}
              onChange={(event) => setWineryId(event.target.value)}
            >
              <option value="">Selecione a vinícola</option>
              {(wineries.data ?? []).map((record) => (
                <option key={record.id} value={record.id}>
                  {record.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-[#5b0c1b]">
            Nome do vinho *
            <input
              className={inputClass}
              required
              maxLength={120}
              value={name}
              placeholder="Ex.: DV Catena"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button
              className="rounded-xl bg-[#7d1d2d] px-5 py-3 font-semibold text-white disabled:opacity-50"
              disabled={save.isPending || !wineries.data?.length}
              type="submit"
            >
              {save.isPending ? 'Salvando…' : editingId ? 'Salvar alteração' : 'Cadastrar'}
            </button>
            {editingId && (
              <button
                className="rounded-xl border border-[#7d1d2d] px-5 py-3 font-semibold text-[#7d1d2d]"
                type="button"
                onClick={() => {
                  setEditingId('');
                  setName('');
                  setWineryId('');
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
        {message && (
          <p
            ref={result}
            tabIndex={-1}
            className="mt-4 rounded-xl border border-[#eadfd3] p-4"
            role={save.isError || remove.isError ? 'alert' : 'status'}
          >
            {message}
          </p>
        )}
      </section>
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
        <h2 className="font-playfair text-2xl text-[#5b0c1b]">Meus vinhos externos</h2>
        <QueryFeedback
          loading={wines.isPending}
          error={wines.error}
          fetching={wines.isFetching}
          empty={!wines.data?.length}
          emptyText="Nenhum vinho externo cadastrado."
          loadingText="Carregando vinhos…"
          retry={() => void wines.refetch()}
        />
        <div className="mt-4 grid gap-3">
          {(wines.data ?? []).map((wine: ExternalWine) => (
            <article
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eadfd3] p-4"
              key={wine.id}
            >
              <div>
                <strong className="block text-[#5b0c1b]">{wine.name}</strong>
                <span className="text-sm text-[#715f59]">{wine.externalWinery.name}</span>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-[#9a6a2d] px-3 py-2 text-sm font-semibold text-[#7d5b2b]"
                  type="button"
                  onClick={() => {
                    setEditingId(wine.id);
                    setName(wine.name);
                    setWineryId(wine.externalWineryId);
                    setMessage('');
                  }}
                >
                  Editar
                </button>
                <button
                  className="rounded-lg border border-[#7d1d2d] px-3 py-2 text-sm font-semibold text-[#7d1d2d] disabled:opacity-50"
                  disabled={remove.isPending}
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Excluir ${wine.name}?`)) remove.mutate(wine.id);
                  }}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

export default function ClientReferencePage({ kind }: { kind: 'winery' | 'wine' | 'location' }) {
  if (kind === 'wine') return <ExternalWines />;
  return <NamedReferences kind={kind} />;
}
