import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Application installable et utilisable hors connexion : seulement sur le site en ligne (jamais sur localhost, pour ne pas gêner le développement).
if ('serviceWorker' in navigator && import.meta.env.PROD && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* sans effet : le site fonctionne sans */ });
  });
}
