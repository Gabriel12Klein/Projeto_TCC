import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import LoginPage from './pages/Login/LoginPage';
import CadastroPage from './pages/Cadastro/CadastroPage';
import AdminPage from './pages/Admin/AdminPage';
import { api, clearSession, getToken, getStoredUser, saveSession } from './api/api';
import type { User } from './types';
import CatalogLayout from './pages/Catalog/CatalogLayout';
import WineDetailPage from './pages/Catalog/WineDetailPage';
import HomePage from './pages/Home/HomePage';
import ProfilePage from './pages/Profile/ProfilePage';
import BatchPublicPage from './pages/Catalog/BatchPublicPage';
import ClientSectionPage from './pages/Client/ClientSectionPage';
import { ApiError } from './api/feedback';

function Loading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#351416',
        color: '#e4c167',
      }}
    >
      Carregando VINUM...
    </div>
  );
}

export default function App() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(Boolean(getToken()));
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [sessionProblem, setSessionProblem] = useState('');

  useEffect(() => {
    const expired = () => {
      clearSession(); queryClient.clear(); setUser(null); setCheckingSession(false);
      navigate('/login?motivo=sessao-expirada', { replace: true });
    };
    window.addEventListener('vinum:session-expired', expired);
    return () => window.removeEventListener('vinum:session-expired', expired);
  }, [navigate, queryClient]);

  useEffect(() => {
    if (!getToken()) {
      setCheckingSession(false);
      return;
    }
    api
      .me()
      .then((currentUser) => {
        const token = getToken();
        if (token) saveSession({ token, user: currentUser });
        setUser(currentUser);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          queryClient.clear(); clearSession(); setUser(null);
        } else setSessionProblem('Não foi possível verificar sua sessão. Sua conta não foi desconectada; tente novamente quando o serviço estiver disponível.');
      })
      .finally(() => setCheckingSession(false));
  }, [queryClient]);

  async function logout(destination = '/login') {
    try {
      await api.logout();
    } catch {
      /* sessão local pode já ter expirado */
    }
    clearSession();
    // Carrega uma nova página para evitar disputa com o redirecionamento
    // da rota protegida e descartar os dados em memória da sessão anterior.
    window.location.replace(destination);
  }

  function loginSuccess(loggedUser: User) {
    queryClient.clear();
    setUser(loggedUser);
    navigate(loggedUser.role === 'ADMIN' || loggedUser.role === 'EDITOR' ? '/admin' : '/');
  }

  if (checkingSession) return <Loading />;
  if (sessionProblem) return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl">Não foi possível continuar</h1><p role="alert" className="my-4">{sessionProblem}</p><button type="button" className="rounded-lg bg-[#5b0c1b] px-5 py-3 text-white" onClick={() => window.location.reload()}>Tentar novamente</button></main>;

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/consulta/lotes/:code" element={<BatchPublicPage />} />
      <Route path="/catalogo/vinhos/:slug" element={<WineDetailPage />} />
      <Route
        path="/catalogo"
        element={
          user?.role === 'CUSTOMER' ? (
            <CatalogLayout user={user} onLogout={logout} />
          ) : (
            <Navigate to={user ? '/admin' : '/'} replace />
          )
        }
      >
        <Route index element={<Navigate to="/" replace />} />
        <Route path="cadastrar" element={<Navigate to="/catalogo" replace />} />
        <Route path="registros" element={<Navigate to="/catalogo" replace />} />
      </Route>
      <Route
        path="/perfil"
        element={
          user?.role === 'CUSTOMER' ? (
            <CatalogLayout user={user} onLogout={logout} />
          ) : (
            <Navigate to={user ? '/admin' : '/'} replace />
          )
        }
      >
        <Route index element={<ProfilePage user={user as User} onUpdate={updated => { const token = getToken(); if (token) saveSession({ token, user: updated }); setUser(updated); }} />} />
      </Route>
      <Route
        path="/estoque"
        element={
          user?.role === 'CUSTOMER' ? (
            <CatalogLayout user={user} onLogout={logout} />
          ) : (
            <Navigate to={user ? '/admin' : '/'} replace />
          )
        }
      >
        <Route
          index
          element={
            <ClientSectionPage
              title="Meu estoque"
              description="Aqui você poderá acompanhar os vinhos e lotes vinculados ao seu estoque."
            />
          }
        />
      </Route>
      <Route
        path="/pedidos"
        element={
          user?.role === 'CUSTOMER' ? (
            <CatalogLayout user={user} onLogout={logout} />
          ) : (
            <Navigate to={user ? '/admin' : '/'} replace />
          )
        }
      >
        <Route
          index
          element={
            <ClientSectionPage
              title="Meus pedidos"
              description="Aqui você poderá acompanhar seus pedidos, status e histórico de compras."
            />
          }
        />
      </Route>
      <Route
        path="/login"
        element={<LoginPage onOpenRegister={() => navigate('/cadastro')} onLoginSuccess={loginSuccess} />}
      />
      <Route path="/cadastro" element={<CadastroPage onOpenLogin={() => navigate('/login')} />} />
      <Route
        path="/admin/*"
        element={
          checkingSession ? (
            <Loading />
          ) : user && (user.role === 'ADMIN' || user.role === 'EDITOR') ? (
            <AdminPage user={user} onLogout={() => void logout('/')} onUserUpdate={updated => { const token = getToken(); if (token) saveSession({ token, user: updated }); setUser(updated); }} />
          ) : (
            <Navigate to={user ? '/catalogo' : '/login'} replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
