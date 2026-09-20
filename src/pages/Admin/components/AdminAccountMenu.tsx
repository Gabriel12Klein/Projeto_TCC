import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../api/api';
import type { ResourceKey, User } from '../../../types';
import type { WineryAccount, WineryAccountInput } from './adminAccount.types';
import profileIcon from '../../../assets/admin/common/profile.png';
import './AdminAccountMenu.css';

type Panel = 'profile' | 'summary';
type Props = { user: User; onUserUpdate: (user: User) => void; onOpenModule: (module: ResourceKey) => void };
export function maskCnpj(value: string) {
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 14)
    .replace(/^(.{2})(.)/, '$1.$2').replace(/^(.{2}\..{3})(.)/, '$1.$2')
    .replace(/^(.{2}\..{3}\..{3})(.)/, '$1/$2').replace(/^(.{2}\..{3}\..{3}\/.{4})(.)/, '$1-$2');
}

export default function AdminAccountMenu({ user, onUserUpdate, onOpenModule }: Props) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const menuId = useId();
  const titleId = useId();
  const query = useQuery({ queryKey: ['admin-account', user.id], queryFn: api.admin.account });
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  useEffect(() => {
    if (panel && !dialog.current?.open) dialog.current?.showModal();
  }, [panel]);
  function close() { dialog.current?.close(); setPanel(null); trigger.current?.focus(); }
  function choose(next: Panel) { setOpen(false); setPanel(next); }
  return <div className="admin-account" ref={menuRef}>
    <button ref={trigger} type="button" className="admin-account__trigger" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>
      <img src={profileIcon} alt="" />
      <span>{query.data?.winery.name || 'Vinum'}</span>
      <svg className={open ? 'is-open' : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {open && <div id={menuId} className="admin-account__dropdown">
      <p>Administração da vinícola</p>
      <button type="button" onClick={() => choose('profile')}><strong>Meu cadastro</strong><span>Dados da vinícola e acesso</span></button>
      <button type="button" onClick={() => choose('summary')}><strong>Resumo dos registros</strong><span>Vinhos, lotes, safras e referências</span></button>
    </div>}
    <dialog ref={dialog} className="admin-account-dialog" aria-labelledby={titleId} onCancel={close}>
      {panel && <>
        <header className="admin-account-dialog__heading"><div><p>ÁREA ADMINISTRATIVA</p><h2 id={titleId}>{panel === 'profile' ? 'Meu cadastro' : 'Resumo dos registros'}</h2></div><button type="button" onClick={close} aria-label="Fechar janela">×</button></header>
        <nav className="admin-account-dialog__tabs" aria-label="Configurações da vinícola">
          <button type="button" aria-current={panel === 'profile' ? 'page' : undefined} onClick={() => setPanel('profile')}>Meu cadastro</button>
          <button type="button" aria-current={panel === 'summary' ? 'page' : undefined} onClick={() => setPanel('summary')}>Resumo dos registros</button>
        </nav>
        <div className="admin-account-dialog__body">
          {panel === 'profile' ? <>
            {query.isPending && <p role="status">Carregando cadastro...</p>}
            {query.isError && <div role="alert"><p>{query.error.message}</p><button type="button" onClick={() => void query.refetch()}>Tentar novamente</button></div>}
            {query.data && <AccountForm key={query.data.winery.id} data={query.data} onUserUpdate={onUserUpdate} onCancel={close} />}
          </> : <RegistrationSummary onOpenModule={module => { close(); onOpenModule(module); }} />}
        </div>
      </>}
    </dialog>
  </div>;
}

function AccountForm({ data, onUserUpdate, onCancel }: { data: WineryAccount; onUserUpdate: (user: User) => void; onCancel: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<WineryAccountInput>({
    wineryId: data.winery.id, name: data.winery.name, cnpj: maskCnpj(data.winery.cnpj), city: data.winery.city, state: data.winery.state,
    contactEmail: data.winery.email || '', accountName: data.account.name, loginEmail: data.account.email, phone: data.winery.phone || '',
    currentPassword: '', newPassword: '', confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const writable = data.account.role === 'ADMIN';
  const save = useMutation({ mutationFn: api.admin.updateAccount });
  const credentialsChanged = form.loginEmail.trim().toLowerCase() !== data.account.email || Boolean(form.newPassword);
  function field(key: keyof WineryAccountInput, value: string) { setForm(prev => ({ ...prev, [key]: value })); setMessage(''); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (save.isPending || !writable) return;
    setMessage(''); setError(false);
    if (form.newPassword !== form.confirmPassword) { setError(true); setMessage('A confirmação da nova senha não confere.'); return; }
    try {
      const updated = await save.mutateAsync(form);
      onUserUpdate(updated.account);
      // Não remonta o formulário para que a confirmação de sucesso continue visível.
      qc.setQueryData(['admin-account', data.account.id], updated);
      setForm(prev => ({ ...prev, name: updated.winery.name, loginEmail: updated.account.email, currentPassword: '', newPassword: '', confirmPassword: '' }));
      setMessage('Cadastro salvo com sucesso. Use o e-mail de acesso atualizado no próximo login.');
    } catch (e) { setError(true); setMessage(e instanceof Error ? e.message : 'Não foi possível salvar o cadastro.'); }
  }
  return <form className="admin-account-form" onSubmit={submit}>
    {!writable && <p className="admin-account-note">Somente o administrador pode editar este cadastro.</p>}
    <fieldset disabled={save.isPending || !writable}>
      <legend>Dados da vinícola</legend><p className="admin-account-note">Informações da vinícola exibidas no sistema. Campos com * são obrigatórios.</p>
      <div className="admin-account-form__grid">
        <label>Nome da vinícola *<input value={form.name} onChange={e => field('name', e.target.value)} required minLength={2} maxLength={120} autoComplete="organization" /></label>
        <label>CNPJ <small>(opcional)</small><input value={form.cnpj} onChange={e => field('cnpj', maskCnpj(e.target.value))} placeholder="00.000.000/0000-00" maxLength={18} pattern="[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}/[A-Z0-9]{4}-[A-Z0-9]{2}" title="14 letras ou números, no formato XX.XXX.XXX/XXXX-XX" /><small>Letras e números, com máscara automática.</small></label>
        <label>E-mail de contato<input type="email" value={form.contactEmail} onChange={e => field('contactEmail', e.target.value)} autoComplete="email" /></label>
        <label>Telefone<input type="tel" value={form.phone} onChange={e => field('phone', e.target.value)} maxLength={30} autoComplete="tel" /></label>
        <label>Cidade<input value={form.city} onChange={e => field('city', e.target.value)} maxLength={100} autoComplete="address-level2" /></label>
        <label>Estado (UF)<select value={form.state} onChange={e => field('state', e.target.value)} autoComplete="address-level1"><option value="">Selecione</option>{'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ').map(uf => <option key={uf}>{uf}</option>)}</select></label>
      </div>
    </fieldset>
    <fieldset disabled={save.isPending || !writable}>
      <legend>Acesso do administrador</legend><p className="admin-account-note">O e-mail de acesso pode ser diferente do contato da vinícola.</p>
      <div className="admin-account-form__grid">
        <label>Nome do responsável *<input value={form.accountName} onChange={e => field('accountName', e.target.value)} required minLength={3} maxLength={120} autoComplete="name" /></label>
        <label>E-mail de acesso *<input type="email" value={form.loginEmail} onChange={e => field('loginEmail', e.target.value)} required autoComplete="username" /></label>
        <label>Nova senha<input type="password" value={form.newPassword} onChange={e => field('newPassword', e.target.value)} minLength={8} maxLength={72} autoComplete="new-password" placeholder="Deixe vazio para manter a senha" /><small>Mínimo de 8 caracteres, com maiúscula, minúscula e número.</small></label>
        <label>Confirmar nova senha<input type="password" value={form.confirmPassword} onChange={e => field('confirmPassword', e.target.value)} required={Boolean(form.newPassword)} maxLength={72} autoComplete="new-password" /></label>
        {credentialsChanged && <label>Senha atual *<input type="password" value={form.currentPassword} onChange={e => field('currentPassword', e.target.value)} required autoComplete="current-password" /><small>Confirme para mudar o acesso. Outras sessões serão encerradas.</small></label>}
      </div>
    </fieldset>
    {message && <p className={`admin-account-feedback ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}>{message}</p>}
    <div className="admin-account-form__actions">{writable && <button className="admin-account-primary" type="submit" disabled={save.isPending}>{save.isPending ? 'Salvando...' : 'Salvar alterações'}</button>}<button type="button" onClick={onCancel} disabled={save.isPending}>Cancelar</button></div>
  </form>;
}

function RegistrationSummary({ onOpenModule }: { onOpenModule: (module: ResourceKey) => void }) {
  const query = useQuery({ queryKey: ['admin-summary'], queryFn: api.admin.summary, staleTime: 0 });
  const labels: Record<string, string> = { DRAFT: 'Rascunho', PUBLISHED: 'Publicado', ARCHIVED: 'Arquivado', ACTIVE: 'Ativo', INACTIVE: 'Inativo' };
  return <section className="admin-registration-summary">
    <div className="admin-registration-summary__intro"><p>Visão geral de todos os registros administrativos do sistema, incluindo os que ainda não estão publicados.</p><button type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? 'Atualizando...' : 'Atualizar'}</button></div>
    {query.isPending && <p role="status">Carregando registros...</p>}
    {query.isError && <p role="alert">Não foi possível carregar o resumo. Tente atualizar novamente.</p>}
    {query.data && <>
      <div className="admin-registration-summary__cards">{([
        ['classificacoes', 'Classificações', query.data.classifications],
        ['vinhos', 'Vinhos', query.data.wines], ['lotes', 'Lotes', query.data.batches], ['safras', 'Safras', query.data.vintages], ['uvas', 'Tipos de uva', query.data.grapes], ['tipos-vinho', 'Tipos de vinho', query.data.wineTypes],
      ] as const).map(([module, label, count]) => <button type="button" key={module} onClick={() => onOpenModule(module)}><span>{label}</span><strong>{count.toLocaleString('pt-BR')}</strong><small>Ver registros →</small></button>)}</div>
      <div className="admin-registration-summary__statuses">{[['Situação dos vinhos', query.data.wineStatuses], ['Situação dos lotes', query.data.batchStatuses]].map(([title, rows]) => <section key={String(title)}><h3>{String(title)}</h3>{(rows as { status: string; count: number }[]).length ? <dl>{(rows as { status: string; count: number }[]).map(row => <div key={row.status}><dt>{labels[row.status] || row.status}</dt><dd>{row.count}</dd></div>)}</dl> : <p>Nenhum registro cadastrado.</p>}</section>)}</div>
      <p className="admin-account-note">Atualizado em {new Date(query.data.updatedAt).toLocaleString('pt-BR')}.</p>
    </>}
  </section>;
}
