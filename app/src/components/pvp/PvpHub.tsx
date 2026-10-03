import { useEffect, useState } from "react";
import {
  LogIn, RefreshCw, Swords, Ticket, Loader2, X,
} from "lucide-react";
import { Vatsamon } from "../../types";
import { useAuth } from "../../lib/auth";
import { useBackCloser } from "../../lib/useBackCloser";
import { useScrollLock } from "../../lib/useScrollLock";
import { ConfirmDialog } from "../ConfirmDialog";
import {
  getChallengePreview, listMyMatches, slotForUid, gcStaleMatches, PvpError,
} from "../../lib/pvp";
import { PvpMatch } from "../../lib/pvpTypes";
import { PvpChallengeCreate, readPendingChallengeCode, clearPendingChallengeCode } from "./PvpChallengeCreate";
import { PvpChallengeJoin } from "./PvpChallengeJoin";

type MatchRow = PvpMatch & { id: string };

/**
 * Stato sintetico delle sfide, calcolato UNA volta in App (`refreshPvpBadge`)
 * e passato a chi lo deve mostrare. `null` = non lo sappiamo (nessun account,
 * fetch non ancora fatta, o fallita): chi lo riceve degrada, non finge zero.
 */
export interface PvpStato {
  attive: number;
  toccaATe: number;
  esitiNonVisti: number;
}

/* ══════════════════════════════════════════════════════════════════════════
   1. L'INGRESSO IN PRIMA PAGINA (Alpeggio)
   ══════════════════════════════════════════════════════════════════════════
   Il PvP stava in fondo alla Stalla, dopo tre sezioni di allevamento: nessuno
   lo trovava. Qui diventa la prima riga dell'Alpeggio, la schermata su cui si
   atterra. Vincoli che ne hanno deciso la forma:

   - la mappa è il cuore di quella schermata → l'ingresso è una RIGA (70px
     misurati su 375/390/393/430, con e senza fasce; 52px sugli schermi corti,
     vedi sotto), non una card: alla mappa costa 82px, non mezza schermata;
   - la barra in basso ha già 5 voci + il FAB → niente sesta voce;
   - il PvP è a turni, quindi l'informazione che merita la prima pagina è lo
     STATO ("tocca a te"), non un bottone muto. Il testo cambia con lo stato;
     quando lo stato non c'è (ospite, offline, fetch fallita) l'ingresso resta
     una riga che spiega, mai un contenitore vuoto;
   - se il PvP NON esiste in questa copia dell'app (build senza cloud), la riga
     non si disegna affatto: vedi `varianteEntry`. */

type Variante = {
  id: "invito" | "turno" | "in-corso" | "vuoto" | "sconosciuto";
  titolo: string;
  riga: string;
  /** Sempre presente: una riga senza azione non viene disegnata (vedi sotto). */
  cta: string;
};

/**
 * `null` = nessuna riga da disegnare.
 *
 * Succede in un caso solo: build senza cloud (`firebaseEnabled === false`). Lì
 * il PvP non è "bloccato" — non esiste proprio, e non c'è niente che l'utente
 * possa fare per sbloccarlo (a differenza di "serve un account", che ha la sua
 * azione). Prima quel caso rendeva un bottone disabilitato: 82px tratteggiati
 * sulla schermata più vista, che pubblicizzavano una funzione irraggiungibile
 * e non facevano nulla al tocco. Meglio il silenzio, e quei pixel alla mappa:
 * la spiegazione per esteso resta comunque a un tocco dalla Stalla
 * (`#pvp-stalla-pointer` → foglio → `NonDisponibile`), quindi non si perde
 * nulla. Il tipo dice la stessa cosa: senza `cta` non si costruisce Variante.
 */
function varianteEntry(eligible: boolean, firebaseEnabled: boolean, stato: PvpStato | null): Variante | null {
  if (!firebaseEnabled) return null;
  if (!eligible) {
    // Il perché completo sta nel foglio, a un tocco: qui basta l'aggancio.
    return {
      id: "invito",
      titolo: "Sfida un altro allevatore",
      riga: "Serve un account.",
      cta: "Accedi",
    };
  }
  // Da qui in giù il TITOLO porta lo stato e la riga sotto porta il nome della
  // funzione: chi ha una partita aperta legge "è il tuo turno", chi non sa cosa
  // sia legge comunque "Sfide tra Allevatori".
  if (stato?.toccaATe) {
    return {
      id: "turno",
      titolo: stato.toccaATe === 1 ? "È il tuo turno" : `È il tuo turno in ${stato.toccaATe} partite`,
      riga: "Sfide tra Allevatori",
      cta: "Gioca",
    };
  }
  if (stato?.attive) {
    return {
      id: "in-corso",
      titolo: stato.attive === 1 ? "1 sfida in corso" : `${stato.attive} sfide in corso`,
      riga: "Sfide tra Allevatori",
      cta: "Apri",
    };
  }
  if (stato) {
    return {
      id: "vuoto",
      titolo: "Sfida un altro allevatore",
      riga: "A turni, con un codice.",
      cta: "Inizia",
    };
  }
  return {
    id: "sconosciuto",
    titolo: "Sfide tra Allevatori",
    riga: "Partita a turni con un altro.",
    cta: "Apri",
  };
}

/**
 * Riga d'ingresso al PvP in cima all'Alpeggio. Tutta la riga è il bersaglio:
 * un solo <button>, così il tap grande non richiede mira (e non annida bottoni).
 *
 * SCHERMI CORTI (`max-height: 740px`, cioè iPhone SE e simili — 667pt): la riga
 * si stringe a 52px invece di 70. Lì sopra la mappa ci sono già intestazione,
 * fasce di sistema e il cappello della scheda mappa, e ogni pixel speso qui è un
 * pixel di mappa che finisce sotto la barra in basso. La soglia sta fra 667 (SE)
 * e 812 (12 mini): sui telefoni alti la riga resta esattamente com'era.
 * Il bersaglio di tocco NON cala: il bottone è tutta la riga, 52px pieni per
 * l'intera larghezza — sopra i 44 richiesti. A stringersi sono l'imbottitura, il
 * quadrato dell'icona e il minimo della pastiglia (che è uno <span>, non un
 * bersaglio a sé).
 */
export function PvpEntry({ stato, onOpen, playClick }: {
  stato: PvpStato | null;
  onOpen: () => void;
  playClick: () => void;
}) {
  const { user, firebaseEnabled } = useAuth();
  const eligible = firebaseEnabled && !!user && !user.isGuest;
  const v = varianteEntry(eligible, firebaseEnabled, stato);
  // Niente riga da disegnare (build senza cloud): quei pixel vanno alla mappa.
  if (!v) return null;

  return (
    <section id="pvp-entry" className="mb-3 [@media(max-height:740px)]:mb-2">
      <button
        type="button"
        onClick={() => { playClick(); onOpen(); }}
        aria-label={`${v.titolo}. ${v.riga}`}
        className="w-full flex items-center gap-3 rounded-3xl p-3 [@media(max-height:740px)]:p-2 text-left border bg-slate-950 border-slate-800 hover:bg-slate-900"
      >
        {/* Rosso = interattivo/attivo (contratto UI). */}
        <span className="w-11 h-11 [@media(max-height:740px)]:w-9 [@media(max-height:740px)]:h-9 rounded-2xl flex items-center justify-center flex-shrink-0 bg-primary text-white">
          <Swords className="w-5 h-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-grow">
          <span className={`h-card block truncate ${v.id === "turno" ? "text-primary-strong" : "text-slate-100"}`}>
            {v.titolo}
          </span>
          {/* due righe al massimo, sempre: è ciò che tiene l'altezza della riga
              sotto gli 80px e quindi la mappa dov'è. Se un testo cresce (o si
              traduce) viene tagliato, non spinge giù la mappa. */}
          <span className="t-body block leading-snug line-clamp-2 text-slate-400">{v.riga}</span>
        </span>
        <span className="btn-primary h-card rounded-xl border-b-4 px-3.5 flex items-center justify-center flex-shrink-0 min-h-[44px] [@media(max-height:740px)]:min-h-[36px]">
          {v.cta}
        </span>
      </button>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   2. IL PANNELLO COMPLETO — foglio aperto dall'ingresso
   ══════════════════════════════════════════════════════════════════════════
   Prima era una sezione fra le altre in fondo alla Stalla. Ora è un foglio a
   sé: si apre dall'Alpeggio (e dal rimando nella Stalla), quindi il PvP non
   dipende più da dove ti trovi.

   Niente listener persistente: SOLO fetch one-shot all'apertura
   (`listMyMatches`, `getChallengePreview` per la sfida in attesa) — i listener
   live vivono SOLO dentro PvpBattleScene, mentre una partita è a schermo. */
export function PvpHubSheet({ collection, onOpenMatch, onClose, onStato, playClick }: {
  collection: Vatsamon[];
  onOpenMatch: (matchId: string) => void;
  onClose: () => void;
  /** Rimanda ad App lo stato appena letto, così l'ingresso in prima pagina si allinea. */
  onStato?: (s: PvpStato) => void;
  playClick: () => void;
}) {
  const { user, firebaseEnabled, signInWithGoogle, signOut } = useAuth();
  const [matches, setMatches] = useState<MatchRow[] | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<"open" | "gone" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [chiediUscita, setChiediUscita] = useState(false);

  const eligible = firebaseEnabled && !!user && !user.isGuest;
  // «test/test» crea un utente locale (isGuest) che ha la PRECEDENZA su quello
  // Firebase in lib/auth: da lì `signInWithGoogle()` non cambierebbe nulla —
  // il popup si aprirebbe, l'accesso riuscirebbe, e le sfide resterebbero
  // spente senza spiegazione. Per quel caso l'unica via che funziona davvero è
  // chiudere l'accesso di prova e rientrare dalla schermata di accesso.
  const ospiteDiProva = firebaseEnabled && !!user && user.isGuest;

  useScrollLock(true);
  useBackCloser(chiediUscita, () => setChiediUscita(false));

  const refresh = async () => {
    if (!eligible || !user) return;
    setLoading(true); setError(null);
    try {
      const [rows, code] = await Promise.all([
        listMyMatches(user.uid),
        Promise.resolve(readPendingChallengeCode()),
      ]);
      setMatches(rows);
      // GC lazy (S10c): best-effort, silenzioso, mai atteso — un fallimento
      // (rete, rules non ancora deployate) non deve rompere l'hub.
      void gcStaleMatches(rows);
      if (code) {
        const c = await getChallengePreview(code).catch(() => null);
        if (c && c.status === "open") { setPendingCode(code); setPendingStatus("open"); }
        else { clearPendingChallengeCode(); setPendingCode(null); setPendingStatus(null); }
      } else {
        setPendingCode(null); setPendingStatus(null);
      }
    } catch (err) {
      setError(err instanceof PvpError ? err.message : "Non riesco a caricare le sfide.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eligible) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, user?.uid]);

  const attive = (matches ?? []).filter((m) => m.status === "active");
  const chiuse = (matches ?? []).filter((m) => m.status !== "active").slice(0, 5);
  const toccaATe = user ? attive.filter((m) => slotForUid(m, user.uid) && m.turnOf === slotForUid(m, user.uid)).length : 0;

  // Ogni lettura riuscita riallinea l'ingresso in prima pagina.
  useEffect(() => {
    if (!matches || !user || !onStato) return;
    onStato({
      attive: attive.length,
      toccaATe,
      esitiNonVisti: 0, // gli esiti non visti li conta App: qui li stai guardando.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-xs flex items-end sm:items-center justify-center"
      id="pvp-hub-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pvp-hub-title"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border-2 border-slate-700 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md flex flex-col shadow-2xl"
        // La colonna non deve mai finire sotto il notch né sull'home indicator:
        // il tetto sottrae la fascia alta, l'imbottitura in fondo somma quella bassa.
        style={{
          maxHeight: "calc(100dvh - 2.5rem - env(safe-area-inset-top))",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-4 pb-3 border-b border-slate-800 flex-shrink-0">
          <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0">
            <Swords className="w-4 h-4" aria-hidden="true" />
          </span>
          <h2 id="pvp-hub-title" className="h-section text-slate-100 flex-grow min-w-0 truncate">Sfide tra Allevatori</h2>
          {eligible && (
            <button
              onClick={() => { playClick(); refresh(); }}
              disabled={loading}
              className="is-disabled text-slate-500 hover:text-slate-200 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Aggiorna le sfide"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => { playClick(); onClose(); }}
            aria-label="Chiudi le sfide"
            className="text-slate-500 hover:text-slate-200 rounded-xl flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-3" id="pvp-hub">
          {/* Che cos'è — una riga, sempre: chi apre per la prima volta deve
              capire il gioco senza uscire da qui. */}
          <p className="t-body text-slate-400 leading-relaxed">
            Una partita a turni fra due allevatori: crei la sfida, passi il codice
            a chi vuoi affrontare, e le vostre Reines si spingono un turno per uno.
          </p>

          {!eligible ? (
            <NonDisponibile
              firebaseEnabled={firebaseEnabled}
              ospiteDiProva={ospiteDiProva}
              onGoogle={() => { playClick(); signInWithGoogle().catch(() => {}); }}
              onCambiaAccount={() => { playClick(); setChiediUscita(true); }}
            />
          ) : (
            <>
              {toccaATe > 0 && (
                <div className="chip-active-soft border rounded-xl px-3 py-2 t-body font-bold">
                  Tocca a te in {toccaATe} {toccaATe === 1 ? "partita" : "partite"}.
                </div>
              )}

              {pendingCode && pendingStatus === "open" && (
                <button onClick={() => { playClick(); setShowCreate(true); }} className="w-full flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-left min-h-[44px]">
                  <span>
                    <span className="t-meta text-slate-500 block">Sfida in attesa</span>
                    <span className="h-card text-primary-strong tracking-widest block">{pendingCode}</span>
                  </span>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                </button>
              )}

              {error && <p className="t-body text-rose-400">{error}</p>}

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { playClick(); setShowCreate(true); }} className="btn-primary h-card rounded-xl border-b-4 min-h-[48px] flex items-center justify-center gap-1.5">
                  <Swords className="w-4 h-4" aria-hidden="true" /> Sfida
                </button>
                <button onClick={() => { playClick(); setShowJoin(true); }} className="h-card rounded-xl min-h-[48px] flex items-center justify-center gap-1.5 bg-slate-950 border border-slate-800 text-slate-200 hover:bg-slate-850">
                  <Ticket className="w-4 h-4" aria-hidden="true" /> Ho un codice
                </button>
              </div>

              {attive.length > 0 && (
                <div className="space-y-1.5">
                  <div className="t-meta text-slate-500">Partite in corso</div>
                  {attive.map((m) => {
                    const slot = user ? slotForUid(m, user.uid) : null;
                    const mine = !!slot && m.turnOf === slot;
                    const oppNick = slot === "p1" ? m.players.p2.nickname : m.players.p1.nickname;
                    return (
                      <button key={m.id} data-pvp-match={m.id} onClick={() => { playClick(); onOpenMatch(m.id); }}
                        className="w-full flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-left min-h-[48px] hover:bg-slate-850">
                        <span className="min-w-0">
                          <span className="h-card text-slate-100 truncate block">vs {oppNick}</span>
                          <span className="t-body text-slate-500 block">{m.mode === "live" ? "Live" : "Per corrispondenza"}</span>
                        </span>
                        <span className={`t-meta px-2 py-1 rounded-full flex-shrink-0 border ${mine ? "chip-active-soft" : "border-slate-800 text-slate-500"}`}>
                          {mine ? "Tocca a te" : "In attesa"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {matches !== null && attive.length === 0 && chiuse.length === 0 && (
                <div className="is-empty">
                  <span className="t-body">Nessuna sfida ancora. Creane una, o inserisci il codice che ti hanno passato.</span>
                </div>
              )}

              {chiuse.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-slate-800">
                  <div className="t-meta text-slate-500">Concluse di recente</div>
                  {chiuse.map((m) => {
                    const won = user && m.winnerUid === user.uid;
                    const slot = user ? slotForUid(m, user.uid) : null;
                    const oppNick = slot === "p1" ? m.players.p2.nickname : m.players.p1.nickname;
                    return (
                      <button key={m.id} onClick={() => { playClick(); onOpenMatch(m.id); }} className="w-full flex items-center justify-between px-3 py-1.5 text-left min-h-[44px]">
                        <span className="t-body text-slate-400 truncate">vs {oppNick}</span>
                        <span className={`t-meta ${won ? "tone-positive" : "text-rose-400"}`}>{won ? "Vittoria" : "Sconfitta"}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreate && user && (
        <PvpChallengeCreate
          playerCows={collection}
          creatorUid={user.uid}
          creatorNickname={user.displayName || "Allevatore"}
          onMatchReady={(matchId) => { setShowCreate(false); onOpenMatch(matchId); }}
          onClose={() => { setShowCreate(false); refresh(); }}
          playClick={playClick}
        />
      )}
      {showJoin && user && (
        <PvpChallengeJoin
          playerCows={collection}
          acceptorUid={user.uid}
          acceptorNickname={user.displayName || "Allevatore"}
          onMatchReady={(matchId) => { setShowJoin(false); onOpenMatch(matchId); }}
          onClose={() => setShowJoin(false)}
          playClick={playClick}
        />
      )}

      {chiediUscita && (
        <ConfirmDialog
          title="Chiudo l'accesso di prova?"
          message={
            "Ti porto alla schermata di accesso: da lì entri con Google o con email e le sfide si sbloccano. " +
            "Il salvataggio di prova viene messo da parte come copia di sicurezza su questo dispositivo — il nuovo account riparte da zero."
          }
          confirmLabel="Vai all'accesso"
          cancelLabel="Resto qui"
          danger
          onConfirm={() => { playClick(); signOut().catch(() => {}); }}
          onCancel={() => setChiediUscita(false)}
        />
      )}
    </div>
  );
}

/**
 * Stato NON disponibile — il caso più frequente, e prima era un vicolo cieco:
 * un cartello che diceva «accedi con un account» e un bottone che, dall'accesso
 * di prova, non poteva funzionare (vedi `ospiteDiProva` sopra). Qui diventa un
 * invito con l'azione giusta per ciascun caso.
 */
function NonDisponibile({ firebaseEnabled, ospiteDiProva, onGoogle, onCambiaAccount }: {
  firebaseEnabled: boolean;
  ospiteDiProva: boolean;
  onGoogle: () => void;
  onCambiaAccount: () => void;
}) {
  if (!firebaseEnabled) {
    return (
      <div className="is-empty">
        <span className="t-body">
          Questa copia dell'app gira in modalità locale, senza collegamento al cloud:
          le sfide online non sono raggiungibili da qui.
        </span>
      </div>
    );
  }

  if (ospiteDiProva) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
        <div className="h-card text-slate-100">Con l'accesso di prova non ti trova nessuno</div>
        <p className="t-body text-slate-400 leading-relaxed">
          I dati dell'accesso di prova restano su questo dispositivo, quindi non c'è
          un allevatore da sfidare né uno che possa sfidare te. Con un account —
          Google o email — la partita vive online e il codice funziona.
        </p>
        <button
          onClick={onCambiaAccount}
          className="btn-primary w-full h-card rounded-xl border-b-4 min-h-[48px] flex items-center justify-center gap-1.5"
        >
          <LogIn className="w-4 h-4" aria-hidden="true" /> Passa a un account
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
      <div className="h-card text-slate-100">Serve un account per sfidare</div>
      <p className="t-body text-slate-400 leading-relaxed">
        Le sfide vivono online: senza un account non c'è un allevatore da collegare al codice.
      </p>
      <button
        onClick={onGoogle}
        className="btn-primary w-full h-card rounded-xl border-b-4 min-h-[48px] flex items-center justify-center gap-1.5"
      >
        <LogIn className="w-4 h-4" aria-hidden="true" /> Accedi con Google
      </button>
    </div>
  );
}
