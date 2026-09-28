import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/api';
import QueryFeedback from '../../ui/QueryFeedback';
import type { EntityRecord, ExternalWine, ExternalWinery, PurchaseLocation } from '../../types';
import ConfirmDeleteDialog from '../../ui/ConfirmDeleteDialog';
import BottlePhotoPicker from './BottlePhotoPicker';
import PrivateImage from './PrivateImage';

const inputClass =
  'mt-1 w-full rounded-xl border border-[#d9cbbd] bg-white px-4 py-3 text-[#321b1c] outline-none focus:border-[#8b2638]';
const emptyAddress = { name: '', street: '', neighborhood: '', city: '', stateRegion: '', country: '' };
type AddressForm = typeof emptyAddress;

export function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
    .replace(/\s+/g, ' ');
}

export function addGrapeSelection(selected: string[], grapeId: string) {
  return grapeId && !selected.includes(grapeId) ? [...selected, grapeId] : selected;
}

export function removeGrapeSelection(selected: string[], grapeId: string) {
  return selected.filter((id) => id !== grapeId);
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

function AddressFields({
  form,
  setForm,
  winery,
}: {
  form: AddressForm;
  setForm: (value: AddressForm) => void;
  winery: boolean;
}) {
  const labels = {
    street: 'Rua',
    neighborhood: 'Bairro',
    city: 'Cidade',
    stateRegion: 'Estado/Região',
    country: 'País',
  };
  const examples = winery
    ? {
        street: 'Ex.: Rua Cobos',
        neighborhood: 'Ex.: Centro',
        city: 'Ex.: Mendoza',
        stateRegion: 'Ex.: Mendoza',
        country: 'Ex.: Argentina',
      }
    : {
        street: 'Ex.: Rua do Comércio',
        neighborhood: 'Ex.: Centro',
        city: 'Ex.: Ijuí',
        stateRegion: 'Ex.: RS ou Rio Grande do Sul',
        country: 'Ex.: Brasil',
      };
  return (
    <>
      {(Object.keys(labels) as Array<keyof typeof labels>).map((field) => (
        <label key={field} className="text-sm font-semibold text-[#5b0c1b]">
          {labels[field]}
          <input
            className={inputClass}
            value={form[field]}
            maxLength={120}
            placeholder={examples[field]}
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
    street: record.street ?? '',
    neighborhood: record.neighborhood ?? '',
    city: record.city ?? '',
    stateRegion: record.stateRegion ?? '',
    country: record.country ?? '',
  };
}

function NamedReferences({ kind }: { kind: 'winery' | 'location' }) {
  const winery = kind === 'winery';
  const singular = winery ? 'vinícola' : 'local de compra';
  const entityLabel = winery ? 'Vinícola' : 'Local de compra';
  const entityWithArticle = winery ? 'a vinícola' : 'o local de compra';
  const queryKey = winery ? ['customer-external-wineries'] : ['customer-purchase-locations'];
  const [form, setForm] = useState<AddressForm>(emptyAddress);
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const [deleteRecord, setDeleteRecord] = useState<ExternalWinery | PurchaseLocation | null>(null);
  const result = useRef<HTMLParagraphElement>(null);
  const qc = useQueryClient();
  useEffect(() => {
    setForm(emptyAddress);
    setEditingId('');
    setMessage('');
    setDeleteRecord(null);
  }, [kind]);
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
    street: form.street || null,
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
        `${entityLabel} ${editingId ? (winery ? 'atualizada' : 'atualizado') : winery ? 'cadastrada' : 'cadastrado'} com sucesso.`,
      );
      setForm(emptyAddress);
      setEditingId('');
      await qc.invalidateQueries({ queryKey });
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : `Não foi possível salvar ${entityWithArticle}.`),
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      winery ? api.customer.removeExternalWinery(id) : api.customer.removePurchaseLocation(id),
    onSuccess: async () => {
      setDeleteRecord(null);
      setMessage(`${entityLabel} ${winery ? 'excluída' : 'excluído'} com sucesso.`);
      await qc.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      setDeleteRecord(null);
      setMessage(error instanceof Error ? error.message : `Não foi possível excluir ${entityWithArticle}.`);
    },
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
          <AddressFields form={form} setForm={setForm} winery={winery} />
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
          emptyText={winery ? 'Nenhuma vinícola cadastrada.' : 'Nenhum local de compra cadastrado.'}
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
                  {[record.street, record.neighborhood, record.city, record.stateRegion, record.country]
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
                  onClick={() => setDeleteRecord(record)}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <ConfirmDeleteDialog
        open={Boolean(deleteRecord)}
        title={winery ? 'Excluir vinícola?' : 'Excluir local de compra?'}
        description={
          winery
            ? `A vinícola ${deleteRecord?.name ?? ''} somente será excluída se não possuir vinhos relacionados.`
            : `O local ${deleteRecord?.name ?? ''} somente será excluído se não estiver relacionado a uma compra.`
        }
        confirmLabel={winery ? 'Excluir vinícola' : 'Excluir local'}
        pending={remove.isPending}
        onCancel={() => setDeleteRecord(null)}
        onConfirm={() => deleteRecord && remove.mutate(deleteRecord.id)}
      />
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
  const [photo, setPhoto] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [deleteWine, setDeleteWine] = useState<ExternalWine | null>(null);
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
        ? api.customer.updateExternalWine(editingId, { ...payload, photo: photo || undefined })
        : api.customer.createExternalWine({ ...payload, photo: photo! }),
    onSuccess: async () => {
      setMessage(`Vinho ${editingId ? 'atualizado' : 'cadastrado'} com sucesso.`);
      setForm(emptyWine);
      setPhoto(null);
      setExistingImage(null);
      setEditingId('');
      await qc.invalidateQueries({ queryKey: ['customer-external-wines'] });
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o vinho.'),
  });
  const remove = useMutation({
    mutationFn: api.customer.removeExternalWine,
    onSuccess: async () => {
      setDeleteWine(null);
      setMessage('Vinho excluído com sucesso.');
      await qc.invalidateQueries({ queryKey: ['customer-external-wines'] });
    },
    onError: (error) => {
      setDeleteWine(null);
      setMessage(error instanceof Error ? error.message : 'Não foi possível excluir o vinho.');
    },
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
    setPhoto(null);
    setExistingImage(wine.imagePath);
    setMessage('');
  };
  const selectedGrapes = (grapes.data ?? [])
    .filter((grape: EntityRecord) => form.grapeIds.includes(grape.id))
    .map((grape: EntityRecord) => ({ id: grape.id, name: String(grape.name) }));
  const dirty =
    editingId ||
    photo ||
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
            if (!editingId && !photo) return setMessage('Adicione uma foto da garrafa.');
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
          <div className="text-sm font-semibold text-[#5b0c1b]">
            <label htmlFor="external-wine-grape">Uvas utilizadas</label>
            <select
              id="external-wine-grape"
              className={`${inputClass} mt-1 font-normal`}
              value=""
              disabled={grapes.isPending || !(grapes.data ?? []).length}
              onChange={(event) => {
                const grapeId = event.target.value;
                setForm({ ...form, grapeIds: addGrapeSelection(form.grapeIds, grapeId) });
              }}
            >
              <option value="">
                {grapes.isPending
                  ? 'Carregando uvas...'
                  : grapes.data?.length
                    ? 'Selecione uma uva para adicionar'
                    : 'Nenhuma uva disponível'}
              </option>
              {(grapes.data ?? [])
                .filter((grape: EntityRecord) => !form.grapeIds.includes(grape.id))
                .map((grape: EntityRecord) => (
                  <option key={grape.id} value={grape.id}>
                    {String(grape.name)}
                  </option>
                ))}
            </select>
            {selectedGrapes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2" aria-label="Uvas selecionadas">
                {selectedGrapes.map((grape) => (
                  <span
                    className="inline-flex items-center gap-2 rounded-full border border-[#c9a66e] bg-[#fff4df] py-1 pl-3 pr-1.5 font-normal text-[#6a1424]"
                    key={grape.id}
                  >
                    {grape.name}
                    <button
                      type="button"
                      className="grid h-7 w-7 place-items-center rounded-full text-lg leading-none hover:bg-[#f1dcc0] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#8b2638]"
                      aria-label={`Remover ${grape.name}`}
                      onClick={() =>
                        setForm({ ...form, grapeIds: removeGrapeSelection(form.grapeIds, grape.id) })
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {(
            [
              ['description', 'Descrição do vinho', 'Escreva uma apresentação geral do vinho.'],
              [
                'characteristics',
                'Características',
                'Ex.: corpo, cor, acidez, persistência e outras características.',
              ],
              ['aromas', 'Aromas', 'Descreva os aromas percebidos no vinho.'],
              ['tastingNotes', 'Notas de degustação', 'Registre as notas e percepções da degustação.'],
            ] as const
          ).map(([field, label, placeholder]) => (
            <label className="text-sm font-semibold text-[#5b0c1b]" key={field}>
              {label}
              <textarea
                className={`${inputClass} min-h-24`}
                maxLength={5000}
                value={form[field]}
                placeholder={placeholder}
                onChange={(event) => setForm({ ...form, [field]: event.target.value })}
              />
            </label>
          ))}
          {existingImage && !photo && (
            <div className="flex items-center gap-4 rounded-xl border border-[#eadfd3] bg-[#fffaf3] p-4 md:col-span-2">
              <PrivateImage
                src={existingImage}
                alt="Foto atual da garrafa"
                className="h-24 w-16 rounded-lg object-contain"
              />
              <p className="text-sm font-normal text-[#715f59]">
                A foto atual será mantida. Selecione outra somente para substituí-la.
              </p>
            </div>
          )}
          <BottlePhotoPicker
            buttonId="external-wine-photo"
            value={photo}
            onChange={setPhoto}
            required={!existingImage}
          />
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
                  setPhoto(null);
                  setExistingImage(null);
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
              <div className="flex min-w-0 items-center gap-3">
                {wine.imagePath && (
                  <PrivateImage
                    src={wine.imagePath}
                    alt={`Foto de ${wine.name}`}
                    className="h-16 w-12 shrink-0 rounded-lg bg-[#f5ead8] object-contain"
                  />
                )}
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
                  onClick={() => setDeleteWine(wine)}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <ConfirmDeleteDialog
        open={Boolean(deleteWine)}
        title="Excluir vinho externo?"
        description={`O vinho ${deleteWine?.name ?? ''} somente será excluído se ainda não fizer parte da adega.`}
        confirmLabel="Excluir vinho"
        pending={remove.isPending}
        onCancel={() => setDeleteWine(null)}
        onConfirm={() => deleteWine && remove.mutate(deleteWine.id)}
      />
    </PageShell>
  );
}

export default function ClientReferencePage({ kind }: { kind: 'winery' | 'wine' | 'location' }) {
  if (kind === 'wine') return <ExternalWines />;
  return <NamedReferences kind={kind} />;
}
