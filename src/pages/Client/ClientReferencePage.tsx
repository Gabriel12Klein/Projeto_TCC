import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/api';
import QueryFeedback from '../../ui/QueryFeedback';
import type { EntityRecord, ExternalWine, ExternalWinery, PurchaseLocation } from '../../types';

const inputClass =
  'mt-1 w-full rounded-xl border border-[#d9cbbd] bg-white px-4 py-3 text-[#321b1c] outline-none focus:border-[#8b2638]';
const emptyAddress = { name: '', neighborhood: '', city: '', stateRegion: '', country: '' };
type AddressForm = typeof emptyAddress;

export function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
    .replace(/\s+/g, ' ');
}

function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="client-section-page mx-auto max-w-6xl px-5 py-10 lg:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#9a6a2d]">Área do cliente</p>
      <h1 className="mt-2 font-playfair text-4xl text-[#5b0c1b]">{title}</h1>
      {children}
    </main>
  );
}

function AddressFields({ form, setForm }: { form: AddressForm; setForm: (value: AddressForm) => void }) {
  const labels = { neighborhood: 'Bairro', city: 'Cidade', stateRegion: 'Estado/Região', country: 'País' };
  return (
    <>
      {(Object.keys(labels) as Array<keyof typeof labels>).map((field) => (
        <label key={field} className="text-sm font-semibold text-[#5b0c1b]">
          {labels[field]}
          <input
            className={inputClass}
            value={form[field]}
            maxLength={120}
            onChange={(event) => setForm({ ...form, [field]: event.target.value })}
          />
        </label>
      ))}
    </>
  );
}

function addressFrom(record: ExternalWinery | PurchaseLocation): AddressForm {
  return {
    name: record.name,
    neighborhood: record.neighborhood ?? '',
    city: record.city ?? '',
    stateRegion: record.stateRegion ?? '',
    country: record.country ?? '',
  };
}

function NamedReferences({ kind }: { kind: 'winery' | 'location' }) {
  const winery = kind === 'winery';
  const singular = winery ? 'vinícola' : 'local de compra';
  const queryKey = winery ? ['customer-external-wineries'] : ['customer-purchase-locations'];
  const [form, setForm] = useState<AddressForm>(emptyAddress);
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const result = useRef<HTMLParagraphElement>(null);
  const qc = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn: winery ? api.customer.externalWineries : api.customer.purchaseLocations,
  });
  const wineryQuery = useQuery({
    queryKey: ['customer-external-wineries'],
    queryFn: api.customer.externalWineries,
    enabled: !winery,
  });
  const suggestions = useMemo(() => {
    const term = normalizeSearch(form.name);
    if (winery || !term) return [];
    return (wineryQuery.data ?? []).filter((item) => normalizeSearch(item.name).includes(term));
  }, [form.name, winery, wineryQuery.data]);
  useEffect(() => setHighlighted(0), [form.name]);
  const payload = {
    ...form,
    neighborhood: form.neighborhood || null,
    city: form.city || null,
    stateRegion: form.stateRegion || null,
    country: form.country || null,
  };
  const reset = () => {
    setForm(emptyAddress);
    setEditingId('');
    setMessage('');
  };
  const save = useMutation({
    mutationFn: () =>
      winery
        ? editingId
          ? api.customer.updateExternalWinery(editingId, payload)
          : api.customer.createExternalWinery(payload)
        : editingId
          ? api.customer.updatePurchaseLocation(editingId, payload)
          : api.customer.createPurchaseLocation(payload),
    onSuccess: async () => {
      setMessage(
        `${winery ? 'Vinícola' : 'Local de compra'} ${editingId ? 'atualizado' : 'cadastrado'} com sucesso.`,
      );
      setForm(emptyAddress);
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
  const accept = (item: ExternalWinery) => setForm(addressFrom(item));
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((value) => (value + 1) % suggestions.length);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((value) => (value - 1 + suggestions.length) % suggestions.length);
    }
    if (event.key === 'Tab' && suggestions[highlighted]) accept(suggestions[highlighted]);
    if (event.key === 'Enter' && suggestions[highlighted]) {
      event.preventDefault();
      accept(suggestions[highlighted]);
    }
  }
  const records = (query.data ?? []) as Array<ExternalWinery | PurchaseLocation>;
  const dirty = editingId || Object.values(form).some(Boolean);
  return (
    <PageShell title={winery ? 'Cadastrar vinícola' : 'Cadastrar local de compra'}>
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
        <h2 className="font-playfair text-2xl uppercase text-[#5b0c1b]">
          {editingId
            ? `EDITANDO ${singular.toLocaleUpperCase('pt-BR')}`
            : winery
              ? 'NOVA VINÍCOLA'
              : 'NOVO LOCAL DE COMPRA'}
        </h2>
        <form
          className="mt-5 grid gap-4 md:grid-cols-2"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            setMessage('');
            if (form.name.trim().length < 2)
              return setMessage('Informe um nome com pelo menos 2 caracteres.');
            save.mutate();
          }}
        >
          <label className="relative text-sm font-semibold text-[#5b0c1b]">
            {winery ? 'Nome da Vinícola *' : 'Nome do local *'}
            <input
              className={inputClass}
              value={form.name}
              maxLength={120}
              required
              autoComplete="off"
              role={!winery ? 'combobox' : undefined}
              aria-expanded={!winery && suggestions.length > 0}
              aria-controls={!winery ? 'winery-suggestions' : undefined}
              onKeyDown={keyDown}
              placeholder={winery ? 'Ex.: Vinícola Catena Zapata' : 'Ex.: Supermercado Central'}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            {!winery && suggestions.length > 0 && (
              <ul
                id="winery-suggestions"
                role="listbox"
                className="absolute z-10 mt-1 w-full rounded-xl border border-[#d9cbbd] bg-white p-1 shadow-lg"
              >
                {suggestions.map((item, index) => (
                  <li role="option" aria-selected={index === highlighted} key={item.id}>
                    <button
                      type="button"
                      className={`w-full rounded-lg px-3 py-2 text-left ${index === highlighted ? 'bg-[#f3e3c8]' : ''}`}
                      onMouseEnter={() => setHighlighted(index)}
                      onClick={() => accept(item)}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </label>
          <AddressFields form={form} setForm={setForm} />
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button
              className="rounded-xl bg-[#7d1d2d] px-5 py-3 font-semibold text-white disabled:opacity-50"
              disabled={save.isPending}
              type="submit"
            >
              {save.isPending ? 'Salvando…' : editingId ? 'Salvar alteração' : 'Cadastrar'}
            </button>
            {dirty && (
              <button
                className="rounded-xl border border-[#7d1d2d] px-5 py-3 font-semibold text-[#7d1d2d]"
                type="button"
                onClick={reset}
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
              <div>
                <strong className="block text-[#5b0c1b]">{record.name}</strong>
                <span className="text-sm text-[#715f59]">
                  {[record.neighborhood, record.city, record.stateRegion, record.country]
                    .filter(Boolean)
                    .join(' · ') || 'Endereço não informado'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-[#9a6a2d] px-3 py-2 text-sm font-semibold text-[#7d5b2b]"
                  type="button"
                  onClick={() => {
                    setEditingId(record.id);
                    setForm(addressFrom(record));
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

type WineForm = {
  name: string;
  wineryId: string;
  vintageYear: string;
  grapeIds: string[];
  description: string;
  characteristics: string;
  aromas: string;
  tastingNotes: string;
};
const emptyWine: WineForm = {
  name: '',
  wineryId: '',
  vintageYear: '',
  grapeIds: [],
  description: '',
  characteristics: '',
  aromas: '',
  tastingNotes: '',
};

function ExternalWines() {
  const [form, setForm] = useState<WineForm>(emptyWine);
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
  const grapes = useQuery({ queryKey: ['customer-grapes'], queryFn: () => api.list('uvas') });
  const payload = {
    name: form.name.trim(),
    externalWineryId: form.wineryId,
    vintageYear: form.vintageYear ? Number(form.vintageYear) : null,
    grapeIds: form.grapeIds,
    description: form.description || null,
    characteristics: form.characteristics || null,
    aromas: form.aromas || null,
    tastingNotes: form.tastingNotes || null,
  };
  const save = useMutation({
    mutationFn: () =>
      editingId
        ? api.customer.updateExternalWine(editingId, payload)
        : api.customer.createExternalWine(payload),
    onSuccess: async () => {
      setMessage(`Vinho ${editingId ? 'atualizado' : 'cadastrado'} com sucesso.`);
      setForm(emptyWine);
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
  const edit = (wine: ExternalWine) => {
    setEditingId(wine.id);
    setForm({
      name: wine.name,
      wineryId: wine.externalWineryId,
      vintageYear: wine.vintageYear?.toString() ?? '',
      grapeIds: wine.grapeLinks.map((link) => link.grape.id),
      description: wine.description ?? '',
      characteristics: wine.characteristics ?? '',
      aromas: wine.aromas ?? '',
      tastingNotes: wine.tastingNotes ?? '',
    });
    setMessage('');
  };
  const dirty =
    editingId ||
    Object.values(form).some((value) => (Array.isArray(value) ? value.length > 0 : Boolean(value)));
  return (
    <PageShell title="Cadastrar vinho">
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
        <h2 className="font-playfair text-2xl text-[#5b0c1b]">
          {editingId ? 'Editando vinho externo' : 'Novo vinho externo'}
        </h2>
        {!wineries.isPending && !wineries.data?.length && (
          <p className="mt-4 rounded-xl border border-[#eadfd3] p-4">
            Cadastre uma vinícola antes do vinho.{' '}
            <Link className="font-semibold text-[#7d1d2d]" to="/cadastros/vinicolas">
              Cadastrar vinícola
            </Link>
          </p>
        )}
        <form
          className="mt-5 grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage('');
            if (!form.wineryId) return setMessage('Selecione uma vinícola.');
            save.mutate();
          }}
        >
          <label className="text-sm font-semibold text-[#5b0c1b]">
            Vinícola *
            <select
              className={inputClass}
              required
              value={form.wineryId}
              onChange={(event) => setForm({ ...form, wineryId: event.target.value })}
            >
              <option value="">Selecione a vinícola</option>
              {(wineries.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
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
              value={form.name}
              placeholder="Ex.: DV Catena"
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <label className="text-sm font-semibold text-[#5b0c1b]">
            Ano da safra
            <input
              className={inputClass}
              type="number"
              min="1000"
              max="9999"
              placeholder="Ex.: 2022"
              value={form.vintageYear}
              onChange={(event) => setForm({ ...form, vintageYear: event.target.value })}
            />
          </label>
          <fieldset className="rounded-xl border border-[#d9cbbd] p-3">
            <legend className="px-1 text-sm font-semibold text-[#5b0c1b]">Uvas utilizadas</legend>
            <div className="max-h-36 overflow-auto">
              {(grapes.data ?? []).map((grape: EntityRecord) => (
                <label className="flex gap-2 py-1" key={grape.id}>
                  <input
                    type="checkbox"
                    checked={form.grapeIds.includes(grape.id)}
                    onChange={() =>
                      setForm({
                        ...form,
                        grapeIds: form.grapeIds.includes(grape.id)
                          ? form.grapeIds.filter((id) => id !== grape.id)
                          : [...form.grapeIds, grape.id],
                      })
                    }
                  />
                  {String(grape.name)}
                </label>
              ))}
            </div>
          </fieldset>
          {(
            [
              ['description', 'Descrição do vinho'],
              ['characteristics', 'Características'],
              ['aromas', 'Aromas'],
              ['tastingNotes', 'Notas de degustação'],
            ] as const
          ).map(([field, label]) => (
            <label className="text-sm font-semibold text-[#5b0c1b]" key={field}>
              {label}
              <textarea
                className={`${inputClass} min-h-24`}
                maxLength={5000}
                value={form[field]}
                onChange={(event) => setForm({ ...form, [field]: event.target.value })}
              />
            </label>
          ))}
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button
              className="rounded-xl bg-[#7d1d2d] px-5 py-3 font-semibold text-white disabled:opacity-50"
              disabled={save.isPending || !wineries.data?.length}
              type="submit"
            >
              {save.isPending ? 'Salvando…' : editingId ? 'Salvar alteração' : 'Cadastrar'}
            </button>
            {dirty && (
              <button
                className="rounded-xl border border-[#7d1d2d] px-5 py-3 font-semibold text-[#7d1d2d]"
                type="button"
                onClick={() => {
                  setEditingId('');
                  setForm(emptyWine);
                  setMessage('');
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
          {(wines.data ?? []).map((wine) => (
            <article
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eadfd3] p-4"
              key={wine.id}
            >
              <div>
                <strong className="block text-[#5b0c1b]">
                  {wine.name}
                  {wine.vintageYear ? ` · ${wine.vintageYear}` : ''}
                </strong>
                <span className="text-sm text-[#715f59]">
                  {wine.externalWinery.name}
                  {wine.grapeLinks.length
                    ? ` · ${wine.grapeLinks.map((link) => link.grape.name).join(', ')}`
                    : ''}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-[#9a6a2d] px-3 py-2 text-sm font-semibold text-[#7d5b2b]"
                  type="button"
                  onClick={() => edit(wine)}
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
