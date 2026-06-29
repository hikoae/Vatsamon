import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import AuthGate from './components/AuthGate.tsx';
import {AuthProvider} from './lib/auth.tsx';
import './index.css';

// Service Worker con AUTO-AGGIORNAMENTO: appena è disponibile una nuova versione
// il SW prende il controllo e workbox-window ricarica la pagina da solo. In più
// controlliamo gli aggiornamenti ogni minuto e a ogni ritorno in primo piano,
// così una scheda aperta non resta mai bloccata su una versione vecchia.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    const check = () => { registration.update().catch(() => {}); };
    setInterval(check, 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  </StrictMode>,
);
