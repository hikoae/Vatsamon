// La migrazione delle chiavi di salvataggio DEVE girare prima di ogni lettura
// di localStorage (rinomina vazzamon_ → vatsamon_).
import './lib/migrateSaveKeys';
// Tipografia "Registro Alpino": Inter (UI/dati) + Fraunces (display), self-hosted
// per la PWA offline (niente CDN esterni).
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import AuthGate from './components/AuthGate.tsx';
import {AuthProvider} from './lib/auth.tsx';
import {UpdateReadyToast} from './components/UpdateReadyToast.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import {isCriticalActivityActive, notifyUpdatePending} from './lib/swUpdate';
import './index.css';

// Service Worker con aggiornamento GUARDATO: appena è disponibile una nuova
// versione, la applichiamo subito SOLO se non c'è un'attività critica in
// corso (foto in "Scatta la Reina", battaglia). Altrimenti la rimandiamo al
// ritorno in idle — un reload forzato a metà cattura cancellerebbe la foto.
// In più controlliamo gli aggiornamenti ogni minuto e a ogni ritorno in
// primo piano, così una scheda aperta non resta mai bloccata su una versione
// vecchia in attesa di applicare l'update.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (!isCriticalActivityActive()) {
      updateSW(true);
      return;
    }
    notifyUpdatePending();
    const waitForIdle = setInterval(() => {
      if (!isCriticalActivityActive()) {
        clearInterval(waitForIdle);
        updateSW(true);
      }
    }, 3000);
  },
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
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
      <UpdateReadyToast />
    </ErrorBoundary>
  </StrictMode>,
);
