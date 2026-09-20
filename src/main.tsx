import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProviders } from './app/providers';
import './styles.css';

// Descarta uma única vez os rascunhos referentes aos registros zerados na limpeza.
// Não altera sessão, cadastro da Vinum, uvas ou tipos de vinho.
try {
  const resetKey = 'vinum_operational_cleanup_20260920';
  if (!sessionStorage.getItem(resetKey)) {
    const prefixes = ['vinhos', 'safras', 'lotes'].flatMap(module => [
      `vinum_form_draft:admin:${module}:`, `vinum_form_draft:${module}:`,
    ]);
    for (const key of Object.keys(sessionStorage)) {
      if (prefixes.some(prefix => key.startsWith(prefix))) sessionStorage.removeItem(key);
    }
    sessionStorage.setItem(resetKey, 'done');
  }
} catch { /* Armazenamento indisponível não impede a inicialização. */ }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
