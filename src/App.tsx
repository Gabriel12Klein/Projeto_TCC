import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import LoginPage from './pages/Login/LoginPage';
import CadastroPage from './pages/Cadastro/CadastroPage';
import AdminPage from './pages/Admin/AdminPage';
import { api, clearSession, getToken, getStoredUser } from './api/api';
import type { User } from './types';
import CatalogLayout from './pages/Catalog/CatalogLayout';
import CatalogPage from './pages/Catalog/CatalogPage';
import WineDetailPage from './pages/Catalog/WineDetailPage';

function Loading() {
  return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#351416',color:'#e4c167'}}>Carregando VINUM...</div>;
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
      <Route path="/catalogo" element={<CatalogLayout user={user} onLogout={logout} />}>
        <Route index element={<CatalogPage />} />
        <Route path="vinhos/:slug" element={<WineDetailPage />} />
      </Route>
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
