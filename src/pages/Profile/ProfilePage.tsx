import { formatPhone, phoneSchema } from '../../../shared/contact';
import { updateMaskedInput } from '../../ui/maskedInput';
import { useFormFeedback } from '../../ui/useFormFeedback';
import FieldError from '../../ui/FieldError';
import PasswordInput, { PasswordChecklist } from '../../ui/PasswordInput';
import { passwordSchema } from '../../../shared/password';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/api';
import type { User } from '../../types';
import { ageFromBirthDate } from '../../../shared/profile';



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
    email: user.email,
    currentPassword: '',
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
  const feedback = useFormFeedback('profile');
  const sending = useRef(false);
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
      const { newPassword: _newPassword, currentPassword: _currentPassword, ...safeDraft } = form;
      sessionStorage.setItem(profileDraftKey(user.id), JSON.stringify(safeDraft));
    } catch {
      /* limites do armazenamento não impedem o uso normal do formulário */
    }
  }, [form, user.id]);
  const setField = (field: keyof typeof form, value: string) => {
    feedback.clear(String(field));
    setForm((current) => ({ ...current, [field]: value }));
  };
  const profileChecklist = [
    { label: 'Nome completo', ok: form.name.trim().length >= 3 },
    { label: 'E-mail', ok: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) },
    { label: 'Número da casa', ok: !form.addressNumber || /^\d+$/.test(form.addressNumber) },
    { label: 'Estado', ok: !form.state || Boolean(normalizeState(form.state)) },
    { label: 'Telefone', ok: !form.phone || phoneSchema.safeParse(form.phone).success },
    {
      label: 'Nova senha',
      ok: !form.newPassword || (
        passwordSchema.safeParse(form.newPassword).success
      ),
    },
  ];
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (sending.current) return;
    const issues = feedback.nativeErrors(event.currentTarget as HTMLFormElement);
    const phone = phoneSchema.safeParse(form.phone);
    if (!phone.success) issues.phone = phone.error.issues[0].message;
    if (form.newPassword) { const password = passwordSchema.safeParse(form.newPassword); if (!password.success) issues.newPassword = password.error.issues[0].message; }
    if (form.state && !normalizeState(form.state)) issues.state = 'Informe uma UF ou nome de estado válido.';
    if (form.birthDate && ageFromBirthDate(form.birthDate) === null) issues.birthDate = 'Informe uma data de nascimento válida, não futura.';
    feedback.show(issues);
    if (Object.keys(issues).length) { setMessageType('error'); setMessage('Confira os campos destacados. Seus dados foram mantidos.'); return; }
    sending.current = true;
    setSaving(true);
    setMessage('');
    try {
      if (form.newPassword) {
        const checked = passwordSchema.safeParse(form.newPassword);
        if (!checked.success) { setMessageType('error'); setMessage(checked.error.issues[0].message); return; }
      }
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
        email: form.email,
        currentPassword: form.currentPassword || undefined,
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
        email: updated.email,
        currentPassword: '',
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
      feedback.fromApi(error);
      setMessageType('error');
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar as informações.');
    } finally {
      sending.current = false;
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
            <Info label="Telefone" value={formatPhone(user.phone || '') || 'Não informado'} />
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
        <p className="mt-3 text-[#715f59]">Nome e e-mail são obrigatórios. Os demais dados são opcionais; a idade é calculada pela data de nascimento.</p>
      </div>
      <form noValidate aria-busy={saving} onSubmit={save} className="rounded-3xl border border-[#dfd0bd] bg-white p-6 shadow-sm md:p-9">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="font-semibold" htmlFor="profile-name">
            Nome completo
            <input
              className={inputClass}
              minLength={3}
              maxLength={120}
              autoComplete="name"
              {...feedback.field('name')} value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              required
            />
          <FieldError id="profile-name-error" message={feedback.errors.name} /></label>
          <label className="font-semibold" htmlFor="profile-email">
            E-mail
            <input className={inputClass} type="email" {...feedback.field('email')} value={form.email} onChange={(event) => setField('email', event.target.value)} required />
          <FieldError id="profile-email-error" message={feedback.errors.email} /></label>
          <label className="font-semibold">
            Idade
            <input
              className={inputClass}
              type="number"
              min="0"
              max="130"
              value={ageFromBirthDate(form.birthDate) ?? ''}
              readOnly
            />
          </label>
          <label className="font-semibold" htmlFor="profile-birthDate">
            Data de nascimento
            <input
              className={inputClass}
              type="date"
              {...feedback.field('birthDate')} value={form.birthDate}
              onChange={(event) => setField('birthDate', event.target.value)}
            />
          <FieldError id="profile-birthDate-error" message={feedback.errors.birthDate} /></label>
          <label className="font-semibold" htmlFor="profile-phone">
            Telefone
            <input
              className={inputClass}
              type="tel"
              autoComplete="tel"
              placeholder="(55) 99935-4038"
              {...feedback.field('phone')} value={form.phone}
              onChange={(event) => updateMaskedInput(event, formatPhone, value => setField('phone', value))}
            />
          <FieldError id="profile-phone-error" message={feedback.errors.phone} /></label>
          <label className="font-semibold" htmlFor="profile-street">
            Rua
            <input
              className={inputClass}
              {...feedback.field('street')} value={form.street}
              onChange={(event) => setField('street', event.target.value)}
            />
          <FieldError id="profile-street-error" message={feedback.errors.street} /></label>
          <label className="font-semibold" htmlFor="profile-addressNumber">
            Número
            <input
              className={inputClass}
              {...feedback.field('addressNumber')} value={form.addressNumber}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={20}
              onChange={(event) => setField('addressNumber', event.target.value.replace(/\D/g, ''))}
            />
          <FieldError id="profile-addressNumber-error" message={feedback.errors.addressNumber} /></label>
          <label className="font-semibold" htmlFor="profile-city">
            Cidade
            <input
              className={inputClass}
              {...feedback.field('city')} value={form.city}
              onChange={(event) => setField('city', event.target.value)}
            />
          <FieldError id="profile-city-error" message={feedback.errors.city} /></label>
          <label className="font-semibold" htmlFor="profile-state">
            Estado
            <input
              className={inputClass}
              {...feedback.field('state')} value={form.state}
              onChange={(event) => setField('state', event.target.value)}
              onBlur={() => {
                const normalized = normalizeState(form.state);
                if (normalized) setField('state', normalized);
              }}
              placeholder="Ex.: RS ou Rio Grande do Sul"
              maxLength={60}
            />
          <FieldError id="profile-state-error" message={feedback.errors.state} /></label>
          <label className="font-semibold" htmlFor="profile-country">
            País
            <input
              className={inputClass}
              {...feedback.field('country')} value={form.country}
              onChange={(event) => setField('country', event.target.value)}
            />
          <FieldError id="profile-country-error" message={feedback.errors.country} /></label>
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
        <label className="mt-5 block max-w-xl font-semibold" htmlFor="profile-newPassword">
          Nova senha
          <PasswordInput
            visibilityLabel="nova senha"
            autoComplete="new-password"
            className={inputClass}
            type="password"
            minLength={8}
            {...feedback.field('newPassword')} value={form.newPassword}
            onChange={(event) => setField('newPassword', event.target.value)}
          />
        <FieldError id="profile-newPassword-error" message={feedback.errors.newPassword} /></label>
        <PasswordChecklist value={form.newPassword} />
        <div className="mt-8 flex flex-wrap gap-3">
          {(form.email.trim().toLowerCase() !== user.email || form.newPassword) && <label htmlFor="profile-currentPassword">Senha atual
            <PasswordInput visibilityLabel="senha atual" className={inputClass} type="password" autoComplete="current-password" {...feedback.field('currentPassword')} value={form.currentPassword} onChange={(event) => setField('currentPassword', event.target.value)} required />
          <FieldError id="profile-currentPassword-error" message={feedback.errors.currentPassword} /></label>}
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
              if (saving) return;
              if (!window.confirm('Descartar as alterações não salvas do perfil?')) return;
              clearProfileDraft(user);
              setForm(profileFormFromUser(user));
              setEditing(false);
              setMessage('');
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
