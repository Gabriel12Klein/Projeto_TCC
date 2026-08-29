import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import LoginPage from './pages/Login/LoginPage';
import CadastroPage from './pages/Cadastro/CadastroPage';
import AdminPage from './pages/Admin/AdminPage';
import { api, clearSession, getToken, getStoredUser } from './api/api';
import type { User } from './types';

function Loading() {
  return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#351416',color:'#e4c167'}}>Carregando VINUM...</div>;
}

function CatalogPlaceholder({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  return (
    <main className="min-h-screen grid place-items-center bg-[#351416] p-6 text-white">
      <section className="max-w-xl rounded-3xl border border-[#d0a565] bg-[#4c151c] p-10 text-center shadow-2xl">
        <h1 className="font-playfair text-4xl text-[#e4c167]">VINUM</h1>
        <p className="mt-4">O catálogo público será disponibilizado na próxima fase.</p>
        <div className="mt-7 flex justify-center gap-3">
          {user?.role === 'ADMIN' || user?.role === 'EDITOR' ? <Link className="rounded bg-[#d0a565] px-4 py-2 text-[#351416]" to="/admin">Administração</Link> : null}
          {user ? <button className="rounded border border-[#d0a565] px-4 py-2" onClick={onLogout}>Sair</button> : <Link className="rounded border border-[#d0a565] px-4 py-2" to="/login">Entrar</Link>}
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(Boolean(getToken()));
  const [user, setUser] = useState<User | null>(getStoredUser());

  useEffect(() => {
    if (!getToken()) {
      setCheckingSession(false);
      return;
    }
    api.me().then((currentUser) => {
      setUser(currentUser);
    }).catch(() => {
      clearSession();
      setUser(null);
    }).finally(() => setCheckingSession(false));
  }, []);

  async function logout() {
    try { await api.logout(); } catch { /* sessão local pode já ter expirado */ }
    clearSession();
    setUser(null);
    navigate('/login');
  }

  function loginSuccess(loggedUser: User) {
    setUser(loggedUser);
    navigate(loggedUser.role === 'ADMIN' || loggedUser.role === 'EDITOR' ? '/admin' : '/catalogo');
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/catalogo" replace />} />
      <Route path="/catalogo" element={<CatalogPlaceholder user={user} onLogout={logout} />} />
      <Route path="/login" element={<LoginPage onOpenRegister={() => navigate('/cadastro')} onLoginSuccess={loginSuccess} />} />
      <Route path="/cadastro" element={<CadastroPage onOpenLogin={() => navigate('/login')} />} />
      <Route path="/admin/*" element={
        checkingSession ? <Loading /> : user && (user.role === 'ADMIN' || user.role === 'EDITOR')
          ? <AdminPage user={user} onLogout={logout} />
          : <Navigate to={user ? '/catalogo' : '/login'} replace />
      } />
      <Route path="*" element={<Navigate to="/catalogo" replace />} />
    </Routes>
  );
}
