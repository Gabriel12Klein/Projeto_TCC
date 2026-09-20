import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ComponentType } from 'react';
import adminBackground from '../../assets/admin/common/admin-background.png';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
import ModuleTabs from './components/ModuleTabs';
import { moduleConfigs } from './moduleConfigs';
import { api } from '../../api/api';
import type { EntityRecord, ResourceKey, User } from '../../types';
import VinicolaCadastrar from './modules/Vinicola/VinicolaCadastrar';
import VinicolaRegistros from './modules/Vinicola/VinicolaRegistros';
import SafraCadastrar from './modules/Safra/SafraCadastrar';
import SafraRegistros from './modules/Safra/SafraRegistros';
import VinhoCadastrar from './modules/Vinho/VinhoCadastrar';
import VinhoRegistros from './modules/Vinho/VinhoRegistros';
import LoteCadastrar from './modules/Lote/LoteCadastrar';
import LoteRegistros from './modules/Lote/LoteRegistros';
import ModuleForm from './components/ModuleForm';
import ModuleRecords from './components/ModuleRecords';

type AdminModuleKey = ResourceKey;

const components: Record<AdminModuleKey, { form: ComponentType<any>; records: ComponentType<any> }> = {
  vinicolas: { form: VinicolaCadastrar, records: VinicolaRegistros },
  safras: { form: SafraCadastrar, records: SafraRegistros },
  vinhos: { form: VinhoCadastrar, records: VinhoRegistros },
  'tipos-vinho': { form: ModuleForm, records: ModuleRecords },
  uvas: { form: ModuleForm, records: ModuleRecords },
  classificacoes: { form: ModuleForm, records: ModuleRecords },
  lotes: { form: LoteCadastrar, records: LoteRegistros },
};

const ADMIN_MODULE_KEY = 'vinum_admin_module';
const ADMIN_TAB_KEY = 'vinum_admin_tab';

function getInitialModule(): AdminModuleKey {
  const saved = sessionStorage.getItem(ADMIN_MODULE_KEY);
  return saved === 'vinhos' || saved === 'lotes' || saved === 'safras' || saved === 'tipos-vinho' || saved === 'uvas' || saved === 'classificacoes' ? saved : 'lotes';
}

function getInitialTab() {
  const saved = sessionStorage.getItem(ADMIN_TAB_KEY);
  return saved === 'records' ? 'records' : 'form';
}

export default function AdminPage({ user, onLogout, onUserUpdate }: { user: User; onLogout: () => void; onUserUpdate: (user: User) => void }) {
  const queryClient = useQueryClient();
  const [module, setModule] = useState(getInitialModule);
  const [tab, setTab] = useState(getInitialTab);
  const [editing, setEditing] = useState<EntityRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  const config = moduleConfigs[module];
  const Current = components[module][tab];

  useEffect(() => {
    sessionStorage.setItem(ADMIN_MODULE_KEY, module);
  }, [module]);

  useEffect(() => {
    sessionStorage.setItem(ADMIN_TAB_KEY, tab);
  }, [tab]);

  useEffect(() => {
    setFormMessage('');
  }, [module, tab]);

  function selectModule(key: AdminModuleKey) {
    setModule(key);
    setTab('form');
    setEditing(null);
  }

  async function save(payload: Record<string, unknown>) {
    let saved;
    if (editing?.id) {
      saved = await api.update(module, editing.id, payload);
    } else {
      saved = await api.create(module, payload);
    }

    setEditing(null);
    setRefreshKey((value) => value + 1);
    await queryClient.invalidateQueries();
    setTab('records');
    return saved;
  }

  function edit(item: EntityRecord) {
    setEditing(item);
    setTab('form');
  }

  function changeTab(next) {
    setTab(next);
    if (next === 'form' && tab !== 'form') setEditing(null);
  }

  function handleLogout() {
    sessionStorage.removeItem(ADMIN_MODULE_KEY);
    sessionStorage.removeItem(ADMIN_TAB_KEY);
    onLogout?.();
  }

  const shellClass = sidebarCollapsed
    ? 'grid-cols-[88px_minmax(0,1fr)] gap-5'
    : 'grid-cols-[clamp(250px,17vw,270px)_minmax(0,1fr)] gap-[clamp(18px,1.5vw,28px)] max-[1450px]:grid-cols-[clamp(245px,18vw,260px)_minmax(0,1fr)] max-[1450px]:gap-[18px]';

  return (
    <main className="min-h-screen w-full flex justify-center items-start p-[clamp(10px,1.3vw,22px)] overflow-auto bg-[radial-gradient(circle_at_50%_10%,#731426_0%,#4a0b17_38%,#2b070e_100%)] font-inter text-vinum-text max-[1250px]:justify-start max-[1160px]:p-2">
      <div
        className={`relative w-[min(97vw,1600px)] min-w-[1180px] h-[clamp(760px,94vh,1040px)] grid ${shellClass} py-[clamp(16px,1.4vw,24px)] px-[clamp(18px,1.7vw,30px)] border-[3px] border-[#c49a57] rounded-[clamp(28px,2.2vw,42px)] shadow-[0_18px_55px_rgb(14_0_4_/_45%),inset_0_0_0_4px_rgba(255,255,255,.75)] overflow-hidden transition-[grid-template-columns,gap] duration-[220ms] max-[1450px]:w-[98vw] max-[1450px]:min-w-[1160px] max-[1450px]:py-4 max-[1450px]:px-[18px] max-[1250px]:min-w-[1140px] max-[1160px]:w-[1140px] max-[1160px]:min-w-[1140px] max-[1160px]:h-[clamp(740px,96vh,920px)] max-[900px]:min-w-0 max-[900px]:w-full max-[900px]:h-auto max-[900px]:min-h-screen max-[900px]:grid-cols-1 max-[900px]:overflow-visible`}
        style={{ background: `#f9f6f1 url(${adminBackground}) center / cover no-repeat` }}
      >
        <AdminSidebar
          active={module}
          onSelect={selectModule}
          onLogout={handleLogout}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((value) => !value)}
        />

        <section className="relative min-w-0 h-full flex flex-col pt-1 px-0.5 pb-0 overflow-hidden">
          <AdminHeader heading={config.heading} user={user} onUserUpdate={onUserUpdate} onOpenModule={key => { setModule(key); setTab('records'); setEditing(null); setRefreshKey(value => value + 1); }} />
          <ModuleTabs tab={tab} onChange={changeTab} />

          <div className="relative flex-1 min-h-0 -mt-px p-[clamp(18px,1.7vw,27px)_clamp(16px,1.5vw,24px)] bg-[rgba(255,255,255,.55)] border border-[#e7e1db] rounded-[18px] shadow-[0_8px_20px_rgb(73_37_29_/_10%)] overflow-y-auto overflow-x-hidden [scrollbar-color:#8d817c_#f0ece8] [scrollbar-width:thin] max-[1450px]:p-[18px_18px_16px]">
            <Current
              config={config}
              initialData={editing}
              draftScope={`admin:${module}`}
              refreshKey={refreshKey}
              onSave={save}
              onMessage={setFormMessage}
              onCancel={() => {
                setEditing(null);
                setTab('records');
              }}
              onEdit={edit}
              onNew={() => {
                setEditing(null);
                setTab('form');
              }}
              onOpenWine={() => {
                setModule('vinhos');
                setTab('form');
                setEditing(null);
              }}
            />
          </div>

          <div className="shrink-0 min-h-[38px] px-[clamp(16px,1.5vw,24px)] pt-[8px] pb-[2px] flex items-start" aria-live="polite">
            {formMessage && <p className="m-0 text-[#7d1d2d] text-[13px] leading-[1.35]">{formMessage}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
