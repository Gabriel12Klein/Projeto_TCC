import { useState } from 'react';
import { api } from '../../api/api';
import type { User } from '../../types';

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function ProfilePage({ user, onUpdate }: { user: User; onUpdate: (user: User) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user.name,
    age: user.age?.toString() ?? '',
    birthDate: user.birthDate ?? '',
    street: user.street ?? '',
    addressNumber: user.addressNumber ?? '',
    city: user.city ?? '',
    state: user.state ?? '',
    country: user.country ?? '',
    phone: formatPhone(user.phone ?? ''),
    newPassword: '',
  });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const setField = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const updated = await api.updateProfile({
        name: form.name,
        age: form.age ? Number(form.age) : null,
        birthDate: form.birthDate || null,
        street: form.street || null,
        addressNumber: form.addressNumber || null,
        city: form.city || null,
        state: form.state || null,
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
      setEditing(false);
      setMessage('Informações atualizadas com sucesso.');
    } catch (error) {
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
              onChange={(event) => setField('addressNumber', event.target.value)}
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
            onClick={() => window.location.assign('/catalogo/registros')}
          >
            Cancelar
          </button>
        </div>
        {message ? (
          <p className="mt-4 text-sm text-[#7d1d2d]" aria-live="polite">
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
