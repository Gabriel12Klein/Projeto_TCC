import { Link, Outlet } from 'react-router-dom';
import type { User } from '../../types';
import logo from '../Login/assets/logo-vinum.png';

export default function CatalogLayout({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-[#f7f2eb] text-[#321b1c]">
      <header className="sticky top-0 z-20 border-b border-[#d7bc8a] bg-[#4c151c]/95 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3">
          <Link to="/catalogo" aria-label="Página inicial do catálogo"><img className="h-14 w-auto brightness-0 invert" src={logo} alt="VINUM" /></Link>
          <nav className="flex items-center gap-3 text-sm text-white">
            <Link className="rounded-lg px-3 py-2 hover:bg-white/10" to="/catalogo">Vinhos</Link>
            {user?.role === 'ADMIN' || user?.role === 'EDITOR' ? <Link className="rounded-lg px-3 py-2 hover:bg-white/10" to="/admin">Administração</Link> : null}
            {user ? <button className="rounded-lg border border-[#d0a565] px-3 py-2 text-[#efd08f] hover:bg-white/10" onClick={onLogout}>Sair</button> : <Link className="rounded-lg border border-[#d0a565] px-3 py-2 text-[#efd08f] hover:bg-white/10" to="/login">Entrar</Link>}
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="mt-16 border-t border-[#dec9a6] bg-[#351416] px-5 py-8 text-center text-sm text-[#dfc38e]">VINUM — Da origem à taça</footer>
    </div>
  );
}
