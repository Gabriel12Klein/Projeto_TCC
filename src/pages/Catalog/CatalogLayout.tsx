import { Link, NavLink, Outlet } from 'react-router-dom';
import type { User } from '../../types';
import logo from '../Login/assets/logo-vinum.png';

export default function CatalogLayout({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-[#f7f2eb] text-[#321b1c] lg:flex">
      <aside className="flex w-full shrink-0 flex-col bg-[linear-gradient(165deg,#5b0c1b,#351416)] p-5 text-white shadow-xl lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:p-7">
        <Link to="/catalogo" className="mb-8 flex justify-center border-b border-white/15 pb-7">
          <img className="h-20 w-auto brightness-0 invert" src={logo} alt="VINUM" />
        </Link>
        <div className="mb-5 rounded-2xl border border-white/15 bg-white/10 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[#e2bd76]">Cliente</p>
          <p className="mt-1 truncate font-semibold">{user.name}</p>
        </div>
        <nav className="flex flex-col gap-2" aria-label="Menu do cliente">
          <p className="px-3 pb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#e2bd76]">Vinho</p>
          <NavLink
            to="/catalogo"
            end
            className={({ isActive }) =>
              `rounded-xl px-4 py-3 transition ${isActive ? 'bg-[#d0a565] font-semibold text-[#4c151c]' : 'text-white/85 hover:bg-white/10'}`
            }
          >
            Ver vinhos
          </NavLink>
          <p className="mb-1 mt-8 px-3 text-xs font-bold uppercase tracking-[0.2em] text-[#e2bd76]">Conta</p>
          <NavLink
            to="/perfil"
            className={({ isActive }) =>
              `rounded-xl px-4 py-3 transition ${isActive ? 'bg-[#d0a565] font-semibold text-[#4c151c]' : 'text-white/85 hover:bg-white/10'}`
            }
          >
            Perfil
          </NavLink>
        </nav>
        <button
          className="mt-8 rounded-xl border border-white/25 px-4 py-3 text-left text-white/85 transition hover:bg-white/10 lg:mt-auto"
          onClick={onLogout}
        >
          Sair
        </button>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="border-b border-[#d7bc8a] bg-white/80 px-5 py-4 shadow-sm backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <span className="font-playfair text-xl font-semibold text-[#5b0c1b]">Área do cliente</span>
            <Link className="text-sm font-semibold text-[#851329]" to="/perfil">
              Perfil
            </Link>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
