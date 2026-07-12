/**
 * Cancello d'ingresso dell'app. Decide cosa mostrare:
 *   caricamento → login (se Firebase attivo e nessun utente)
 *              → creazione personaggio (primo accesso, nessun salvataggio)
 *              → gioco (App) + daemon di sincronizzazione cloud automatica
 *
 * In "modalità locale" (Firebase non configurato) salta login/onboarding e
 * avvia direttamente il gioco con lo storage locale, come prima.
 */
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import LoginScreen from "./LoginScreen";
import Onboarding from "./Onboarding";
import { useAuth } from "../lib/auth";
import {
  loadCloudSave,
  writeLocalSave,
  clearLocalSave,
  readLocalSave,
  saveCloudSave,
  backupLocalSave,
  hasExistingProgress,
} from "../lib/cloudSave";

// Import lazy: il bundle di gioco (App.tsx + scene pesanti) non viene scaricato
// finché login/onboarding non sono risolti (S4 perf).
const App = lazy(() => import("../App"));

const OWNER_KEY = "vatsamon_owner_uid";
type Phase = "resolving" | "login" | "onboarding" | "ready";

/** Segna lo storage come "già onboardato" (per giocatori migrati/grandfathered). */
function markOnboarded(reason: string) {
  localStorage.setItem("vatsamon_onboarded", JSON.stringify({ [reason]: true, at: Date.now() }));
}

export default function AuthGate() {
  const { user, loading, firebaseEnabled } = useAuth();
  const [phase, setPhase] = useState<Phase>("resolving");
  const sessionUid = useRef<string>("guest");

  useEffect(() => {
    if (loading) return;
    let cancelled = false;

    // Firebase attivo ma nessun utente loggato → schermata di accesso.
    if (firebaseEnabled && !user) {
      clearLocalSave();
      localStorage.removeItem(OWNER_KEY);
      setPhase("login");
      return;
    }
    if (!user) return;

    (async () => {
      setPhase("resolving");

      // Modalità locale / ospite: nessun login, storage solo locale.
      if (!firebaseEnabled || user.isGuest) {
        sessionUid.current = "guest";
        backupLocalSave("local-start");
        const forced = new URLSearchParams(location.search).has("onboard");
        if (localStorage.getItem("vatsamon_onboarded") && !forced) {
          setPhase("ready");
          return;
        }
        // Giocatore con progressi pre-onboarding: NON sovrascrivere, lo
        // promuoviamo a "onboarded" e va dritto al gioco coi suoi dati.
        if (hasExistingProgress() && !forced) {
          markOnboarded("grandfathered");
          setPhase("ready");
          return;
        }
        // Utente davvero nuovo (o ?onboard): crea il personaggio.
        setPhase("onboarding");
        return;
      }

      // Utente reale: se lo storage locale apparteneva a un altro account, pulisci
      // (clearLocalSave fa prima un backup).
      const owner = localStorage.getItem(OWNER_KEY);
      if (owner && owner !== user.uid) clearLocalSave();

      // Idrata dal cloud (Firestore restituisce la cache anche offline).
      let cloud = null;
      try {
        cloud = await loadCloudSave(user.uid);
      } catch {
        cloud = null;
      }
      if (cancelled) return;

      localStorage.setItem(OWNER_KEY, user.uid);
      sessionUid.current = user.uid;

      const cloudHasData = Boolean(cloud?.keys && Object.keys(cloud.keys).length);
      if (cloudHasData) {
        // Il cloud è la verità: backup del locale, poi idrata.
        backupLocalSave("cloud-hydrate");
        writeLocalSave(cloud!.keys);
        if (!localStorage.getItem("vatsamon_onboarded")) markOnboarded("from-cloud");
        setPhase("ready");
        return;
      }

      // Nessun salvataggio cloud → account nuovo.
      if (hasExistingProgress()) {
        // Migra i progressi locali esistenti dentro al nuovo account (niente wipe).
        backupLocalSave("migrate-to-account");
        if (!localStorage.getItem("vatsamon_onboarded")) markOnboarded("migrated");
        try {
          await saveCloudSave(user.uid);
        } catch {
          /* sync best-effort: ritenterà il daemon */
        }
        setPhase("ready");
        return;
      }
      setPhase("onboarding");
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, loading, firebaseEnabled]);

  if (loading || phase === "resolving") return <Splash />;
  if (phase === "login") return <LoginScreen />;
  if (phase === "onboarding") {
    return (
      <Onboarding
        onComplete={() => {
          if (user) {
            localStorage.setItem(OWNER_KEY, user.uid);
            sessionUid.current = user.uid;
          }
          setPhase("ready");
        }}
      />
    );
  }

  return (
    <>
      <Suspense fallback={<Splash />}>
        <App key={sessionUid.current} />
      </Suspense>
      <CloudSyncDaemon
        uid={user?.uid ?? "guest"}
        enabled={Boolean(firebaseEnabled && user && !user.isGuest)}
      />
    </>
  );
}

function Splash() {
  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-center text-slate-100 gap-3">
      <div className="aurora-bg" />
      <div className="text-5xl animate-float">🐄</div>
      <Loader2 className="animate-spin text-rose-500" size={28} />
      <p className="text-sm text-slate-400">Carico i tuoi progressi…</p>
    </div>
  );
}

/**
 * Sincronizzazione automatica: campiona lo storage locale e, quando cambia,
 * scrive sul cloud con un piccolo debounce. Forza il salvataggio quando l'app
 * passa in background o viene chiusa.
 */
function CloudSyncDaemon({ uid, enabled }: { uid: string; enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let last = JSON.stringify(readLocalSave());
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      saveCloudSave(uid).catch(() => {});
    };
    const poll = setInterval(() => {
      const cur = JSON.stringify(readLocalSave());
      if (cur !== last) {
        last = cur;
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(flush, 1200);
      }
    }, 4000);
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", flush);
    return () => {
      clearInterval(poll);
      if (debounce) clearTimeout(debounce);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", flush);
    };
  }, [uid, enabled]);
  return null;
}
