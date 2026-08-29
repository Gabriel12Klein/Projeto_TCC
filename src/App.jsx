import { useEffect, useState } from 'react';
import LoginPage from './pages/Login/LoginPage.jsx';
import CadastroPage from './pages/Cadastro/CadastroPage.jsx';
import AdminPage from './pages/Admin/AdminPage.jsx';
import { api, clearSession, getToken, getStoredUser } from './api/api.js';

export default function App() {
  const [currentPage, setCurrentPage] = useState(getToken() ? 'loading' : 'login');
  const [user, setUser] = useState(getStoredUser());

  useEffect(() => {
    if (!getToken()) return;
    api.me().then((currentUser) => {
      setUser(currentUser);
      setCurrentPage('admin');
    }).catch(() => {
      clearSession();
      setUser(null);
      setCurrentPage('login');
    });
  }, []);

  async function logout() {
    try { await api.logout(); } catch { /* sessão local pode já ter expirado */ }
    clearSession();
    setUser(null);
    setCurrentPage('login');
  }

  if (currentPage === 'loading') return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#351416',color:'#e4c167'}}>Carregando VINUM...</div>;
  if (currentPage === 'cadastro') return <CadastroPage onOpenLogin={() => setCurrentPage('login')} />;
  if (currentPage === 'admin') return <AdminPage user={user} onLogout={logout} />;
  return <LoginPage onOpenRegister={() => setCurrentPage('cadastro')} onLoginSuccess={(loggedUser)=>{setUser(loggedUser);setCurrentPage('admin')}} />;
}
