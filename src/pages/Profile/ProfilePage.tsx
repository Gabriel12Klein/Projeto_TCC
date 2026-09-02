import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/api';
import type { User } from '../../types';

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
}

const stateCodes = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

const stateNames: Record<string, string> = {
  ACRE: 'AC', ALAGOAS: 'AL', AMAPA: 'AP', AMAZONAS: 'AM', BAHIA: 'BA', CEARA: 'CE',
  'DISTRITO FEDERAL': 'DF', 'ESPIRITO SANTO': 'ES', GOIAS: 'GO', MARANHAO: 'MA',
  'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS', 'MINAS GERAIS': 'MG', PARA: 'PA',
  PARAIBA: 'PB', PARANA: 'PR', PERNAMBUCO: 'PE', PIAUI: 'PI', 'RIO DE JANEIRO': 'RJ',
  'RIO GRANDE DO NORTE': 'RN', 'RIO GRANDE DO SUL': 'RS', RONDONIA: 'RO', RORAIMA: 'RR',
  'SANTA CATARINA': 'SC', 'SAO PAULO': 'SP', SERGIPE: 'SE', TOCANTINS: 'TO',
};

function normalizeState(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  if (stateCodes.has(normalized)) return normalized;
  return stateNames[normalized] ?? '';
}

function profileDraftKey(userId: number | string) {
  return `vinum_form_draft:profile:${String(userId)}`;
}

function profileFormFromUser(user: User) {
  return {
    name: user.name,
    age: user.age?.toString() ?? '',
    birthDate: user.birthDate ?? '',
    street: user.street ?? '',
    addressNumber: user.addressNumber ?? '',
    city: user.city ?? '',
    state: normalizeState(user.state ?? '') || user.state || '',
    country: user.country ?? '',
    phone: formatPhone(user.phone ?? ''),
    newPassword: '',
  };
}

function readProfileDraft(user: User) {
  try {
    const value = sessionStorage.getItem(profileDraftKey(user.id));
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function clearProfileDraft(user: User) {
  try {
    sessionStorage.removeItem(profileDraftKey(user.id));
  } catch {
    /* armazenamento de rascunho indisponível não impede o uso normal do formulário */
  }
}

export default function ProfilePage({ user, onUpdate }: { user: User; onUpdate: (user: User) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => ({ ...profileFormFromUser(user), ...(readProfileDraft(user) ?? {}) }));
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [saving, setSaving] = useState(false);
  const skipNextDraftPersist = useRef(false);
  useEffect(() => {
    if (skipNextDraftPersist.current) {
      skipNextDraftPersist.current = false;
      return;
    }
    try {
      const { newPassword: _newPassword, ...safeDraft } = form;
      sessionStorage.setItem(profileDraftKey(user.id), JSON.stringify(safeDraft));
    } catch {
      /* limites do armazenamento não impedem o uso normal do formulário */
    }
  }, [form, user.id]);
  const setField = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const profileChecklist = [
    { label: 'Nome completo', ok: form.name.trim().length >= 3 },
    { label: 'E-mail', ok: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email) },
    { label: 'Número da casa', ok: !form.addressNumber || /^\d+$/.test(form.addressNumber) },
    { label: 'Estado', ok: !form.state || Boolean(normalizeState(form.state)) },
    { label: 'Telefone', ok: !form.phone || form.phone.replace(/\D/g, '').length >= 10 },
    {
      label: 'Nova senha',
      ok: !form.newPassword || (
        form.newPassword.length >= 8 && /[a-z]/.test(form.newPassword) && /[A-Z]/.test(form.newPassword) && /\d/.test(form.newPassword)
      ),
    },
  ];
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const normalizedState = normalizeState(form.state);
      if (form.addressNumber && !/^\d+$/.test(form.addressNumber)) {
        setMessageType('error');
        setMessage('O número da casa deve conter apenas números.');
        setSaving(false);
        return;
      }
      if (form.state && !normalizedState) {
        setMessageType('error');
        setMessage('Informe o estado por sigla ou nome completo válido.');
        setSaving(false);
        return;
      }
      const updated = await api.updateProfile({
        name: form.name,
        age: form.age ? Number(form.age) : null,
        birthDate: form.birthDate || null,
        street: form.street || null,
        addressNumber: form.addressNumber || null,
        city: form.city || null,
        state: normalizedState || null,
        country: form.country || null,
        phone: form.phone || null,
        ...(form.newPassword ? { newPassword: form.newPassword } : {}),
      });
      onUpdate(updated);
      setForm((current) => ({
        ...current,
        name: updated.name,
        age: updated.age?.toString() ?? '',
        birthDate: updated.birthDate ?? '',
        street: updated.street ?? '',
        addressNumber: updated.addressNumber ?? '',
        city: updated.city ?? '',
        state: updated.state ?? '',
        country: updated.country ?? '',
        phone: formatPhone(updated.phone ?? ''),
        newPassword: '',
      }));
      skipNextDraftPersist.current = true;
      clearProfileDraft(user);
      setEditing(false);
      setMessageType('success');
      setMessage('Informações atualizadas com sucesso.');
    } catch (error) {
      setMessageType('error');
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar as informações.');
    } finally {
      setSaving(false);
    }
  }
  const displayAddress = [user.street, user.addressNumber, user.city, user.state, user.country]
    .filter(Boolean)
    .join(', ');
  const inputClass =
    'mt-2 w-full rounded-xl border border-[#d7c9bb] bg-white px-4 py-3 outline-none focus:border-[#851329] focus:ring-2 focus:ring-[#851329]/15';
  if (!editing)
    return (
      <main className="mx-auto max-w-5xl px-5 py-10 lg:px-10">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#9a6a2d]">Minha conta</p>
          <h1 className="mt-2 font-playfair text-4xl font-semibold text-[#5b0c1b]">Perfil do cliente</h1>
          <p className="mt-3 text-[#715f59]">Confira um resumo das suas informações pessoais.</p>
        </div>
        <section className="rounded-3xl border border-[#dfd0bd] bg-white p-7 shadow-sm md:p-10">
          <div className="grid gap-6 md:grid-cols-2">
            <Info label="Nome completo" value={user.name} />
            <Info label="E-mail" value={user.email} />
            <Info label="Idade" value={user.age ? `${user.age} anos` : 'Não informado'} />
            <Info
              label="Data de nascimento"
              value={
                user.birthDate
                  ? new Date(`${user.birthDate}T00:00:00`).toLocaleDateString('pt-BR')
                  : 'Não informado'
              }
            />
            <Info label="Telefone" value={user.phone || 'Não informado'} />
            <Info label="Endereço" value={displayAddress || 'Não informado'} />
          </div>
          <button
            className="mt-9 rounded-xl bg-[#5b0c1b] px-7 py-3 font-semibold text-[#f4d58e] transition hover:bg-[#751329]"
            onClick={() => {
              setMessage('');
              setEditing(true);
            }}
          >
            Editar informações
          </button>
          {message ? (
            <p className="mt-4 text-sm text-[#2d772d]" aria-live="polite">
              {message}
            </p>
          ) : null}
        </section>
      </main>
    );
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 lg:px-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#9a6a2d]">Minha conta</p>
        <h1 className="mt-2 font-playfair text-4xl font-semibold text-[#5b0c1b]">Editar informações</h1>
        <p className="mt-3 text-[#715f59]">Atualize seus dados pessoais.</p>
      </div>
      <form onSubmit={save} className="rounded-3xl border border-[#dfd0bd] bg-white p-6 shadow-sm md:p-9">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="font-semibold">
            Nome completo
            <input
              className={inputClass}
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              required
            />
          </label>
          <label className="font-semibold">
            E-mail
            <input className={`${inputClass} bg-[#f4eee8] text-[#776b66]`} value={user.email} readOnly />
          </label>
          <label className="font-semibold">
            Idade
            <input
              className={inputClass}
              type="number"
              min="0"
              max="130"
              value={form.age}
              onChange={(event) => setField('age', event.target.value)}
            />
          </label>
          <label className="font-semibold">
            Data de nascimento
            <input
              className={inputClass}
              type="date"
              value={form.birthDate}
              onChange={(event) => setField('birthDate', event.target.value)}
            />
          </label>
          <label className="font-semibold">
            Telefone
            <input
              className={inputClass}
              value={form.phone}
              onChange={(event) => setField('phone', formatPhone(event.target.value))}
            />
          </label>
          <label className="font-semibold">
            Rua
            <input
              className={inputClass}
              value={form.street}
              onChange={(event) => setField('street', event.target.value)}
            />
          </label>
          <label className="font-semibold">
            Número
            <input
              className={inputClass}
              value={form.addressNumber}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={20}
              onChange={(event) => setField('addressNumber', event.target.value.replace(/\D/g, ''))}
            />
          </label>
          <label className="font-semibold">
            Cidade
            <input
              className={inputClass}
              value={form.city}
              onChange={(event) => setField('city', event.target.value)}
            />
          </label>
          <label className="font-semibold">
            Estado
            <input
              className={inputClass}
              value={form.state}
              onChange={(event) => setField('state', event.target.value)}
              onBlur={() => {
                const normalized = normalizeState(form.state);
                if (normalized) setField('state', normalized);
              }}
              placeholder="Ex.: RS ou Rio Grande do Sul"
              maxLength={60}
            />
          </label>
          <label className="font-semibold">
            País
            <input
              className={inputClass}
              value={form.country}
              onChange={(event) => setField('country', event.target.value)}
            />
          </label>
        </div>
        <div className="my-8 h-px bg-[#eee3d5]" />
        <section className="mb-8 rounded-2xl border border-[#eadcca] bg-[#fffaf3] p-5" aria-label="Checklist do perfil">
          <h2 className="font-playfair text-2xl font-semibold text-[#5b0c1b]">Checklist do perfil</h2>
          <p className="mt-1 text-sm text-[#715f59]">Confira os campos preenchidos corretamente antes de salvar.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {profileChecklist.map((item) => (
              <div key={item.label} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${item.ok ? 'bg-[#eaf5e6] text-[#2d772d]' : 'bg-[#fff0d8] text-[#9a6200]'}`}>
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white font-bold">{item.ok ? '✓' : '!'}</span>
                <span>{item.label}: {item.ok ? 'correto' : 'verificar'}</span>
              </div>
            ))}
          </div>
        </section>
        <h2 className="font-playfair text-2xl font-semibold text-[#5b0c1b]">Alterar senha</h2>
        <p className="mt-2 text-sm text-[#715f59]">Deixe em branco para manter sua senha atual.</p>
        <label className="mt-5 block max-w-xl font-semibold">
          Nova senha
          <input
            className={inputClass}
            type="password"
            minLength={8}
            value={form.newPassword}
            onChange={(event) => setField('newPassword', event.target.value)}
          />
        </label>
        <div className="mt-8 flex gap-3">
          <button
            disabled={saving}
            className="rounded-xl bg-[#5b0c1b] px-7 py-3 font-semibold text-[#f4d58e] disabled:opacity-60"
            type="submit"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
          <button
            className="rounded-xl border border-[#cdbbaf] px-7 py-3 font-semibold text-[#5b0c1b]"
            type="button"
            onClick={() => {
              clearProfileDraft(user);
              window.location.assign('/catalogo/registros');
            }}
          >
            Cancelar
          </button>
        </div>
        {message ? (
          <p className={`mt-4 text-sm ${messageType === 'success' ? 'text-[#2d772d]' : 'text-[#7d1d2d]'}`} aria-live="polite">
            {message}
          </p>
        ) : null}
      </form>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#faf6f0] p-5">
      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6a2d]">{label}</dt>
      <dd className="mt-2 break-words font-semibold text-[#4c151c]">{value}</dd>
    </div>
  );
}
