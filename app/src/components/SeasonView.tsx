import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy, CalendarDays, Swords, MapPin, Heart, Check, Sparkles,
  ChevronRight, Star, Crown, Info, Medal, BookOpen, ArrowLeft,
  Newspaper, Clock, Megaphone, ExternalLink, ShieldCheck, BadgeCheck, FlaskConical, Ticket, History,
} from "lucide-react";
import { CowVisual } from "./CowVisual";
import { resolveIllustration } from "../data/illustrations";
import { RisultatiAdmin } from "./RisultatiAdmin";
import { Vatsamon } from "../types";
import {
  CALENDAR, CATEGORIES, CategoriaId, SEASON_META, SeasonEvent, WinnerEntry,
  winnersFor, cowsByCategory, buildRounds, bracketChampion, roundLabel,
  ALBO_DORO, LEGGENDE, ALBO_ANNI, reinaByName, SOGLIE_PER_FASE,
} from "../data/season";
import {
  tappaPronosticabile, poolPronosticoTappa, esitoPronosticoTappa,
  LS_PRONOSTICI_TAPPA, LS_PRONOSTICI_TAPPA_SCORED,
  PronosticiTappa, PronosticiTappaScored,
} from "../data/eliminatoire";
import { CULTURA, GLOSSARIO, FONTI, STORIA } from "../data/bataillesContent";
import { loadNews, NewsItem } from "../data/news";
import { SPONSOR_SLOTS } from "../config/brand";
import { useLang, tr, Lang, DictKey } from "../i18n/hub";
import { useAuth } from "../lib/auth";
import { ADMIN_UIDS, getAllRisultati, getAllRisultatiAuto, RisultatoConfidence } from "../lib/risultati";
import { oggiISO } from "../lib/oggi";

/**
 * STAGIONE — il "second screen" ufficiale della stagione Batailles de Reines.
 * Tre sezioni:
 *  • Calendario  → eliminatorie reali (disputate con vincitrici) + pausa d'alpeggio + finale.
 *  • Tabellone   → bracket della finale regionale per categoria, con PRONOSTICI dell'utente.
 *  • Segui       → scegli una Reina reale e seguila verso la finale.
 *
 * Tutto statico (dati in data/season.ts) + localStorage per pronostici/segui.
 * Nessun backend: i risultati live si aggiornano committando il JSON della stagione.
 *
 * DIMENSIONI DEL TESTO — questo file dichiara la misura che RENDE.
 * In index.css c'è una regola di leggibilità con un ID
 * (`#vatsamon-go-app [class~="text-[9px]"]`, idem 9.5/10/10.5px) che, avendo
 * specificità di ID ed essendo fuori da ogni @layer, batte le utility
 * Tailwind: `text-[9px]`/`text-[9.5px]` rendevano 11px e
 * `text-[10px]`/`text-[10.5px]` rendevano 12px. Il codice diceva quindi una
 * cosa e il browser ne mostrava un'altra. Qui le classi sono state riportate
 * ai valori reali (`text-[11px] leading-[1.35]` e `text-[12px]
 * leading-[1.4]`, cioè esattamente ciò che quella regola imponeva): stessa
 * resa al pixel, ma verificabile con getComputedStyle. Le `leading-snug`
 * che convivevano con quelle classi erano già morte (la regola con l'ID
 * imponeva comunque la propria line-height) e sono state tolte.
 * Conseguenza da tenere a mente: questi elementi non passano più da quella
 * regola, quindi se il pavimento di leggibilità cambia in index.css vanno
 * aggiornati anche qui.
 */

type SubTab = "notizie" | "calendario" | "albo" | "tabellone" | "segui" | "scopri" | "admin";

const LS_PICKS = "vatsamon_pronostici";
const LS_FOLLOW = "vatsamon_follow_reine";
const LS_REWARDED = "vatsamon_pronostici_rewarded";
/** S13 — coppie "eventId:categoria" già valutate contro un risultato UFFICIALE
 * per il ponte gioco↔realtà (mai ri-valutate: il vincitore di una tappa
 * passata non cambia, vedi useEffect dedicato in SeasonView). */
const LS_RISULTATI_SEEN = "vatsamon_risultati_seen";

function loadJSON<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}

/** Normalizza `cow.categoria` ("1ª"/"2ª"/"3ª" o varianti) in CategoriaId di season.ts. */
export function catIdOf(cow: Vatsamon): CategoriaId {
  const raw = (cow.categoria ?? "").trim();
  if (raw.startsWith("2")) return "2";
  if (raw.startsWith("3")) return "3";
  return "1";
}

/** Silhouette neutra di brand (`public/cow-silhouette.svg`). Serve dove una
 * foto vera non esiste: 9 Reines su 21 della 1ª categoria ricadono sulla stessa
 * illustrazione di razza (castana.png), quindi la "foto" non distingue nulla e
 * fa sembrare reale un ritratto che non è suo. Un segnaposto dichiarato è più
 * onesto — e più leggibile dell'emoji 🐮 di sistema. */
const SILHOUETTE = `${import.meta.env.BASE_URL}cow-silhouette.svg`;

/** Vero quando la Reina non ha né foto propria né illustrazione dedicata al suo
 * nome: resterebbe il jolly di razza, identico per decine di bovine. */
function senzaRitratto(cow: Vatsamon): boolean {
  return !cow.realPhoto && !resolveIllustration(cow.name);
}

/** Ritratto della Reina: foto/illustrazione dedicata quando esiste, altrimenti
 * silhouette. Stessa firma di `CowVisual`, così è uno scambio uno-a-uno. */
function ReinaThumb({ cow, className = "w-32 h-32" }: { cow: Vatsamon; className?: string }) {
  if (senzaRitratto(cow)) {
    return (
      <img
        src={SILHOUETTE}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className={`object-contain rounded-2xl flex-shrink-0 ${className}`}
      />
    );
  }
  return <CowVisual cow={cow} className={className} />;
}

/** Payload del trofeo "Mécro reale" (S13) passato via `onReward` quando la
 * Reina seguita vince davvero la sua categoria in una tappa ufficiale. */
export interface RealTrofeoPayload {
  eventId: string;
  comune: string;
  categoria: string;
  reinaNome: string;
  data: string;
}

/** Banner "gareggia oggi/domenica" (S13) — pura, testabile fuori da React:
 * stessa fonte di verità della schedina pronostici (poolPronosticoTappa),
 * ma senza il vincolo di finestra-chiusa-il-giorno-gara: deve accendersi
 * ANCHE il giorno stesso della tappa, non solo prima. `tappaInFinestra` è
 * calcolata dal chiamante (SeasonView) con `tappaPronosticabile(todayISO)`. */
export function computeFollowBanner(
  followCow: Vatsamon | null,
  todayISO: string,
  tappaInFinestra: SeasonEvent | null,
  calendar: SeasonEvent[] = CALENDAR,
): { ev: SeasonEvent; oggi: boolean } | null {
  if (!followCow) return null;
  const catId = catIdOf(followCow);
  const oggiEv = calendar.find((e) => e.kind === "bataille" && !e.finale && e.data === todayISO);
  if (oggiEv && poolPronosticoTappa(oggiEv, catId).some((c) => c.id === followCow.id)) {
    return { ev: oggiEv, oggi: true };
  }
  if (tappaInFinestra && poolPronosticoTappa(tappaInFinestra, catId).some((c) => c.id === followCow.id)) {
    return { ev: tappaInFinestra, oggi: false };
  }
  return null;
}

/** PONTE GIOCO↔REALTÀ (S13) — pura, testabile fuori da React: `winnersLookup`
 * è iniettato (in produzione è `winnersFor` di data/season.ts, che legge
 * Firestore via lib/risultati.ts; nei test si può passare un finto risultato
 * UFFICIALE senza toccare Firestore). Se un risultato UFFICIALE (mai
 * `simulato`) dice che la Reina seguita ha vinto la sua categoria, produce
 * un reward one-shot. Idempotente per (eventId, categoria): una volta
 * valutato un risultato reale non si ri-valuta più — il vincitore di una
 * tappa passata non cambia, quindi "non ancora vista" è sempre e solo
 * "risultato non ancora pubblicato" (mai un motivo per ri-controllare). */
export function computeRealtaBridgeRewards(
  followCow: Vatsamon,
  seen: string[],
  winnersLookup: (eventId: string) => Partial<Record<CategoriaId, WinnerEntry>>,
  calendar: SeasonEvent[] = CALENDAR,
): { nextSeen: string[]; rewards: RealTrofeoPayload[] } {
  const nextSeen = [...seen];
  const rewards: RealTrofeoPayload[] = [];
  for (const ev of calendar) {
    if (ev.kind !== "bataille") continue;
    for (const cat of ev.categorie) {
      const key = `${ev.id}:${cat}`;
      if (nextSeen.includes(key)) continue;
      const w = winnersLookup(ev.id)[cat];
      if (!w || w.simulato) continue; // non ancora ufficiale: si ricontrolla al prossimo giro
      nextSeen.push(key);
      if (w.cow?.id === followCow.id) {
        rewards.push({ eventId: ev.id, comune: ev.comune, categoria: `${cat}ª`, reinaNome: followCow.name, data: ev.data });
      }
    }
  }
  return { nextSeen, rewards };
}

const LOCALE: Record<Lang, string> = { it: "it-IT", fr: "fr-FR" };
const DATE_FMT: Record<Lang, Intl.DateTimeFormat> = {
  it: new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "long" }),
  fr: new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "long" }),
};
function fmtDate(iso: string, lang: Lang = "it"): string {
  return DATE_FMT[lang].format(new Date(iso + "T12:00:00")).replace(/^\w/, (c) => c.toUpperCase());
}
function monthShort(iso: string, lang: Lang = "it"): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { month: "short" }).format(new Date(iso + "T12:00:00"));
}

export function SeasonView({ onReward, onBack }: {
  onReward?: (coins: number, xp: number, kind?: "tabellone" | "tappa" | "reale", trofeo?: RealTrofeoPayload) => void;
  /** Uscita dalla Stagione. Senza, si usa il tasto Indietro del browser: è lo
   * stesso percorso della gesture di sistema (App.tsx registra un closer che
   * riporta all'Alpeggio), quindi la schermata non è mai un vicolo cieco. */
  onBack?: () => void;
}) {
  const [sub, setSub] = useState<SubTab>("notizie");
  const [lang, setLang] = useLang();
  const [picks, setPicks] = useState<Record<string, string>>(() => loadJSON(LS_PICKS, {}));
  const [followId, setFollowId] = useState<string | null>(() => localStorage.getItem(LS_FOLLOW));
  const [tappaPicks, setTappaPicks] = useState<PronosticiTappa>(() => loadJSON(LS_PRONOSTICI_TAPPA, {}));
  const [catSel, setCatSel] = useState<CategoriaId>("1");
  const { user } = useAuth();
  const isAdmin = Boolean(user && ADMIN_UIDS.includes(user.uid));
  // Bump per forzare un re-render dopo il fetch bulk dei risultati reali
  // (winnersFor legge la cache in memoria in modo sincrono, vedi lib/risultati.ts).
  const [risultatiTick, bumpRisultati] = useState(0);

  useEffect(() => { localStorage.setItem(LS_PICKS, JSON.stringify(picks)); }, [picks]);
  useEffect(() => {
    if (followId) localStorage.setItem(LS_FOLLOW, followId);
    else localStorage.removeItem(LS_FOLLOW);
  }, [followId]);
  useEffect(() => { localStorage.setItem(LS_PRONOSTICI_TAPPA, JSON.stringify(tappaPicks)); }, [tappaPicks]);
  useEffect(() => {
    let alive = true;
    // Priorità Firestore(confermato) > cache auto(G5, non confermata) — vedi
    // lib/risultati.ts getMergedRisultato. Entrambe scaldano cache in memoria
    // lette in modo sincrono da winnersFor (data/season.ts): un solo bump
    // di re-render basta, qualunque delle due arrivi per prima o dopo.
    Promise.all([getAllRisultati(), getAllRisultatiAuto()]).then(() => { if (alive) bumpRisultati((v) => v + 1); });
    return () => { alive = false; };
  }, []);

  // `oggiISO()` (non `new Date()` locale) rispetta `?oggi=YYYY-MM-DD`: la
  // finestra dei pronostici di tappa deve essere time-travel-abile per i
  // test E2E/demo, come il resto della stagione (App.tsx, eliminatoire.ts).
  const todayISO = oggiISO();

  // Prossimo evento in calendario (prima bataille non disputata da oggi in poi).
  const nextEventId = useMemo(() => {
    const fut = CALENDAR.filter((e) => e.kind === "bataille" && !e.disputata && e.data >= todayISO);
    return fut.length ? fut[0].id : null;
  }, [todayISO]);

  // Tappa (non finale) su cui la schedina pronostici è ancora apribile —
  // chiude all'inizio del giorno di gara (data/eliminatoire.ts).
  const tappaInFinestra = useMemo(() => tappaPronosticabile(todayISO), [todayISO]);

  const tappaPicksCount = useMemo(
    () => Object.values(tappaPicks).reduce((n, byCat) => n + Object.keys(byCat).length, 0),
    [tappaPicks],
  );

  // Punteggio "Tifoso": premia partecipazione (pronostici finale + di tappa + seguire una Reina).
  const puntiTifoso = Object.keys(picks).length * 10 + tappaPicksCount * 10 + (followId ? 20 : 0);

  // Ricompensa (monete/XP) una sola volta per categoria con tabellone completato.
  useEffect(() => {
    if (!onReward) return;
    const rewarded = loadJSON<string[]>(LS_REWARDED, []);
    let changed = false;
    for (const cat of CATEGORIES) {
      const champ = bracketChampion(buildRounds(cat.id, picks));
      if (champ && !rewarded.includes(cat.id)) {
        rewarded.push(cat.id);
        changed = true;
        onReward(20, 50);
      }
    }
    if (changed) localStorage.setItem(LS_REWARDED, JSON.stringify(rewarded));
  }, [picks, onReward]);

  // Ricompensa pronostici di tappa: SOLO contro il risultato ufficiale (mai
  // il simulato — "attesa" finché l'admin non pubblica), grant idempotente
  // via LS_PRONOSTICI_TAPPA_SCORED (riaprire l'app non duplica il premio).
  useEffect(() => {
    if (!onReward) return;
    const scored = loadJSON<PronosticiTappaScored>(LS_PRONOSTICI_TAPPA_SCORED, {});
    let changed = false;
    for (const [eventId, byCat] of Object.entries(tappaPicks)) {
      for (const cat of Object.keys(byCat) as CategoriaId[]) {
        if (scored[eventId]?.includes(cat)) continue;
        const pickedId = byCat[cat];
        if (!pickedId) continue;
        const esito = esitoPronosticoTappa(eventId, cat, pickedId);
        if (esito === "attesa") continue;
        scored[eventId] = [...(scored[eventId] ?? []), cat];
        changed = true;
        if (esito === "corretto") onReward(10, 25, "tappa");
      }
    }
    if (changed) localStorage.setItem(LS_PRONOSTICI_TAPPA_SCORED, JSON.stringify(scored));
  }, [tappaPicks, onReward, risultatiTick]);

  const followCow = useMemo<Vatsamon | null>(() => {
    if (!followId) return null;
    for (const c of CATEGORIES) {
      const found = cowsByCategory(c.id).find((x) => x.id === followId);
      if (found) return found;
    }
    return null;
  }, [followId]);

  // Banner "gareggia oggi/domenica" (S13) — vedi `computeFollowBanner` sotto
  // (estratta pura per essere testabile fuori da React/browser).
  const followBanner = useMemo(
    () => computeFollowBanner(followCow, todayISO, tappaInFinestra),
    [followCow, todayISO, tappaInFinestra],
  );

  // PONTE GIOCO↔REALTÀ (S13) — vedi `computeRealtaBridgeRewards` sotto (estratta
  // pura per essere testabile fuori da React/browser: iniettando un
  // `winnersLookup` finto si può simulare un risultato UFFICIALE senza Firestore).
  useEffect(() => {
    if (!onReward || !followCow) return;
    const seen = loadJSON<string[]>(LS_RISULTATI_SEEN, []);
    const { nextSeen, rewards } = computeRealtaBridgeRewards(followCow, seen, winnersFor);
    if (nextSeen.length !== seen.length) localStorage.setItem(LS_RISULTATI_SEEN, JSON.stringify(nextSeen));
    rewards.forEach((trofeo) => onReward(30, 75, "reale", trofeo));
  }, [followCow, onReward, risultatiTick]);

  function pickTappa(eventId: string, cat: CategoriaId, cowId: string) {
    setTappaPicks((prev) => ({ ...prev, [eventId]: { ...prev[eventId], [cat]: cowId } }));
  }

  // La Stagione è l'ULTIMO blocco della schermata che la ospita: sopra ci sono
  // le scorciatoie di gioco (fase, quiz, tappe, leggende), quindi all'apertura
  // il suo inizio cade oltre i 600px e sul telefono si atterra su un titolo
  // tagliato dalla tab-bar — su iPhone SE nemmeno quello. Al primo montaggio la
  // portiamo in cima; `scrollMarginTop` sotto tiene conto dell'HUD sticky.
  useEffect(() => {
    const el = document.getElementById("season-view");
    if (!el) return;
    const motoRidotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: motoRidotto ? "auto" : "smooth", block: "start" });
  }, []);

  return (
    <div
      className="max-w-2xl mx-auto space-y-4"
      id="season-view"
      style={{ scrollMarginTop: "calc(5rem + env(safe-area-inset-top))" }}
    >
      {/* HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-950/50 via-slate-950 to-slate-950 border border-amber-800/40 rounded-3xl p-5">
        <div className="absolute -right-6 -top-6 text-7xl opacity-10 select-none">🐮</div>
        <div className="flex items-center gap-2 mb-1">
          {/* Uscita esplicita: la Stagione non ha una voce propria nella tab-bar
              in basso, quindi senza questa freccia l'unica via d'uscita è
              indovinare. Il trofeo di prima è stato tolto per farle posto. */}
          <button
            id="season-back"
            onClick={() => (onBack ? onBack() : window.history.back())}
            aria-label={tr(lang, "hdr_indietro")}
            className="chip-idle border flex-shrink-0 -ml-1 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="h-section text-slate-100">{tr(lang, "title")} {SEASON_META.anno}</h2>
          <div className="ml-auto flex items-center gap-1.5">
            {/* Toggle lingua IT/FR (la Valle d'Aosta è bilingue). Attivo = rosso
                primario, come ogni altro stato "selezionato" (§ RUOLI COLORE). */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-full overflow-hidden text-[11px] leading-[1.35] font-mono font-black">
              {(["it", "fr"] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLang(l)} className={`px-2 py-0.5 ${lang === l ? "chip-active" : "chip-idle"}`}>{l.toUpperCase()}</button>
              ))}
            </div>
            {/* "LIVE" fu ritirato con S11: il badge affiancava vincitori in parte
                fabbricati (potenza interna, mai un dato di gara) facendoli
                leggere come risultati in tempo reale. Riusa lo stato calendario
                già tradotto ("in corso" / "en cours") — vero indipendentemente
                dal fatto che i singoli risultati siano ufficiali o simulati,
                quello lo dice il badge per-vincitore in Calendario. */}
            {/* `text-rose-300` su `bg-rose-600/20` misurava 3,96:1 (11px 900,
                soglia 4,5): il velo rosso al 20% scurisce il fondo piu' di
                quanto il token di testo si aspetti. Passa a
                `text-primary-strong`, che il contratto indica proprio per il
                rosso usato come solo TESTO e regge su qualsiasi superficie
                (5,5:1 qui). Il pallino eredita il colore del testo, come nel
                chip di stato del Calendario. */}
            <span className="flex items-center gap-1 bg-rose-600/20 border border-rose-500/40 text-primary-strong text-[11px] leading-[1.35] font-mono font-black px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" /> {tr(lang, "st_inCorso").toUpperCase()}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">
          {tr(lang, "headerSub", { date: fmtDate(SEASON_META.finale.data, lang) })}
        </p>
        <div className="mt-3 flex items-center gap-2 text-[12px] leading-[1.4] font-mono">
          {/* punteggio = ricompensa → ambra, l'unico ruolo che le resta */}
          <span className="chip-reward border flex items-center gap-1 px-2 py-1 rounded-lg">
            <Star className="w-3 h-3" /> {puntiTifoso} {tr(lang, "puntiTifoso")}
          </span>
          <span className="flex items-center gap-1 bg-slate-900 border border-slate-800 text-slate-300 px-2 py-1 rounded-lg">
            <MapPin className="w-3 h-3 text-amber-400" /> {SEASON_META.finale.luogo}, {SEASON_META.finale.comune}
          </span>
        </div>
      </div>

      {/* SUB-TABS */}
      <div className="grid grid-cols-3 gap-1 bg-slate-950 border border-slate-850 rounded-2xl p-1">
        {([
          ["notizie", tr(lang, "nav_notizie"), Newspaper],
          ["calendario", tr(lang, "nav_calendario"), CalendarDays],
          ["albo", tr(lang, "nav_albo"), Medal],
          ["tabellone", tr(lang, "nav_tabellone"), Swords],
          ["segui", tr(lang, "nav_segui"), Heart],
          ["scopri", tr(lang, "nav_scopri"), BookOpen],
          // Tab admin: appare SOLO per ADMIN_UIDS (lib/risultati.ts). Gating
          // solo UI — l'autorità reale è firestore.rules.
          ...(isAdmin ? [["admin", tr(lang, "nav_admin"), ShieldCheck] as [SubTab, string, typeof Trophy]] : []),
        ] as [SubTab, string, typeof Trophy][]).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setSub(id)}
            className={`flex items-center justify-center gap-1 py-2.5 px-1 rounded-xl border text-[12px] leading-[1.4] font-mono font-black whitespace-nowrap transition-all min-h-[40px] ${
              sub === id ? "chip-active" : "chip-idle"
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={sub}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {sub === "notizie" && (
            <NewsSection lang={lang} todayISO={todayISO} onGoCalendario={() => setSub("calendario")} onGoTabellone={() => setSub("tabellone")} />
          )}
          {sub === "calendario" && (
            <CalendarSection
              lang={lang} nextEventId={nextEventId} todayISO={todayISO} onGoPronostici={() => setSub("tabellone")}
              tappaInFinestra={tappaInFinestra} tappaPicks={tappaPicks} onPickTappa={pickTappa}
            />
          )}
          {sub === "albo" && <AlboSection lang={lang} />}
          {sub === "tabellone" && (
            <BracketSection lang={lang} catSel={catSel} setCatSel={setCatSel} picks={picks} setPicks={setPicks} />
          )}
          {sub === "scopri" && <ScopriSection lang={lang} />}
          {sub === "segui" && (
            <FollowSection
              lang={lang} followCow={followCow} onFollow={setFollowId}
              onOpenBracket={(cat) => { setCatSel(cat); setSub("tabellone"); }}
              todayISO={todayISO} banner={followBanner}
            />
          )}
          {sub === "admin" && isAdmin && (
            <RisultatiAdmin lang={lang} onSaved={() => bumpRisultati((v) => v + 1)} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ===========================================================================
//  CALENDARIO
// ===========================================================================

/** Provenienza dei risultati (S11 + G5), dichiarata UNA volta per tappa:
 * ufficiale (Firestore, confermato) > auto (cache G5, pre-compilato dal sito
 * ufficiale ma MAI confermato) > simulato (nessun dato reale, calcolo per
 * potenza interna). Vedi data/season.ts winnersFor per come si arriva ai 3
 * stati. Prima erano tre pillole da 8px per tappa, una per vincitrice: senza
 * Firestore l'origine è la stessa per tutte, quindi ripeterla non distingueva
 * niente e mangiava spazio. Ora è una riga sola, in chiaro, sotto il comune.
 * I testi vivono in `i18n/hub.ts` (chiavi `prov_*`): qui resta solo la resa
 * grafica, come per STORICO_META più sotto. */
const PROVENIENZA: Record<RisultatoConfidence, {
  icon: typeof BadgeCheck; tone: string; key: DictKey;
}> = {
  ufficiale: { icon: BadgeCheck, tone: "tone-positive", key: "prov_ufficiale" },
  auto: { icon: Newspaper, tone: "text-slate-300", key: "prov_auto" },
  simulato: { icon: FlaskConical, tone: "text-slate-400", key: "prov_simulato" },
};

/* Stati "neutri" del calendario (in arrivo / conclusa / in calendario): grigi
   di sistema, nessuna semantica di colore da spendere. */
const ST_NEUTRO = "bg-slate-900 text-slate-400 border-slate-700";
/* Pausa d'alpeggio in corso e Désarpa non sono né "positivo" né "selezionato":
   restano fuori dal contratto a tre colori, quindi usano i token esistenti più
   vicini (blu = periodo d'alpeggio, viola = cerimonia), scuriti come il resto
   del tema chiaro. Segnalato nelle note. */
const ST_PAUSA = "bg-blue-950 text-blue-200 border-blue-300";
const ST_CERIMONIA = "bg-purple-950 text-purple-300 border-purple-300";

function statusOf(ev: SeasonEvent, todayISO: string, nextEventId: string | null, lang: Lang): {
  label: string; cls: string; dot?: boolean;
} {
  if (ev.kind === "pausa") {
    const inCorso = todayISO >= ev.data && todayISO <= (ev.dataFine ?? ev.data);
    return inCorso
      ? { label: tr(lang, "st_inCorso"), cls: ST_PAUSA, dot: true }
      : todayISO < ev.data
        ? { label: tr(lang, "st_inArrivo"), cls: ST_NEUTRO }
        : { label: tr(lang, "st_conclusa"), cls: ST_NEUTRO };
  }
  // Cerimonia (Désarpa, S14): mai "disputata"/"prossima" — quelle etichette
  // implicano un vincitore di gara, che qui non esiste.
  if (ev.kind === "cerimonia") {
    return todayISO > ev.data
      ? { label: tr(lang, "st_conclusa"), cls: ST_NEUTRO }
      : { label: tr(lang, "st_cerimonia"), cls: ST_CERIMONIA, dot: todayISO === ev.data };
  }
  // "Disputata" = fatto compiuto → verde positivo; "Prossima" = la tappa in
  // evidenza → rosso primario. I vecchi hex (#34d399, #f59e0b, #64748b) erano
  // tarati sul tema scuro: sul chiaro davano 1,6:1.
  if (ev.disputata) return { label: tr(lang, "st_disputata"), cls: "chip-positive" };
  if (ev.id === nextEventId) return { label: tr(lang, "st_prossima"), cls: "chip-active-soft", dot: true };
  return { label: tr(lang, "st_inCalendario"), cls: ST_NEUTRO };
}

function CalendarSection({ lang, nextEventId, todayISO, onGoPronostici, tappaInFinestra, tappaPicks, onPickTappa }: {
  lang: Lang; nextEventId: string | null; todayISO: string; onGoPronostici: () => void;
  tappaInFinestra: SeasonEvent | null;
  tappaPicks: PronosticiTappa;
  onPickTappa: (eventId: string, cat: CategoriaId, cowId: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      {CALENDAR.map((ev) => {
        const st = statusOf(ev, todayISO, nextEventId, lang);
        const winners = winnersFor(ev.id);
        const hasWinners = Object.keys(winners).length > 0;
        const isPausa = ev.kind === "pausa";
        const isCerimonia = ev.kind === "cerimonia";
        const note = lang === "fr" ? (ev.noteFr ?? ev.note) : ev.note;
        // `luogoFr` esiste solo per i luoghi generici tradotti ("Area
        // combattimenti"); i toponimi (Vertosan, Champoluc, Mont-Blanc) non
        // hanno variante e restano tali → fallback all'italiano, mai vuoto.
        const luogo = lang === "fr" ? (ev.luogoFr ?? ev.luogo) : ev.luogo;

        return (
          <div
            key={ev.id}
            className={`rounded-2xl border p-3.5 ${
              ev.finale
                ? "bg-gradient-to-br from-amber-950/40 to-slate-950 border-amber-700/50"
                : isPausa
                  ? "bg-sky-950/20 border-sky-900/40 border-dashed"
                  : isCerimonia
                    /* `violet-*` NON è rimappato in index.css (@theme rimappa
                       purple/sky/rose/amber/blue/emerald/red, non violet):
                       `bg-violet-950/20` prendeva quindi il violet-950 SCURO di
                       serie e dipingeva un fondo rgb(205,197,222) invece del
                       pastello atteso — la nota in corsivo scendeva a 3,34:1 e
                       la riga del luogo a 4,47:1 (misurati dai pixel). Stessa
                       famiglia del chip di stato (ST_CERIMONIA) ma con i token
                       del tema: fondo purple-950 pastello + cornice purple-300
                       tratteggiata. La card resta "non è una gara" a colpo
                       d'occhio senza spegnere i testi. */
                    ? "bg-purple-950 border-purple-300 border-dashed"
                    : "bg-slate-950 border-slate-850"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* data — slate-400 e non slate-500: su una card tinta (Désarpa)
                  slate-500 scendeva a 3,34:1, su quelle chiare restava a 5,05
                  senza margine. slate-400 tiene 6,2-6,8 ovunque. */}
              <div className="flex-shrink-0 text-center w-14">
                <div className="text-[11px] leading-[1.35] font-mono uppercase text-slate-400">{fmtDate(ev.data, lang).split(" ")[0]}</div>
                <div className="text-xl font-mono font-black text-slate-100 leading-none">{new Date(ev.data + "T12:00:00").getDate()}</div>
                <div className="text-[11px] leading-[1.35] font-mono uppercase text-slate-400">{monthShort(ev.data, lang)}</div>
              </div>

              <div className="min-w-0 flex-grow">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-mono font-black text-slate-100 truncate">
                    {ev.finale && <Crown className="inline w-4 h-4 text-amber-400 mb-0.5 mr-1" />}
                    {isPausa ? tr(lang, "cal_pausa") : ev.comune}
                  </span>
                  <span className={`flex items-center gap-1 text-[11px] leading-[1.35] font-mono font-black px-1.5 py-0.5 rounded-full border ${st.cls}`}>
                    {/* il pallino eredita il colore del testo del chip */}
                    {st.dot && <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-current" />}
                    {st.label}
                  </span>
                </div>
                <div className="text-[12px] leading-[1.4] font-mono text-slate-400 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-600" /> {luogo}
                  {/* slate-600 come TESTO misurava 2,24:1: resta ai soli tratti
                      decorativi (l'icona qui sopra), il testo passa a slate-500. */}
                  {ev.dataFine && <span className="text-slate-500"> · {tr(lang, "cal_finoAl")} {fmtDate(ev.dataFine, lang)}</span>}
                </div>

                {/* Chip di categoria SOLO quando la tappa non ha ancora
                    vincitrici: se ci sono, ogni riga vincitrice porta già la
                    sua categoria e questa fascia era pura ripetizione (~90px
                    per tappa). Colore d'accento tolto: era testo a ~1,9:1. */}
                {!isPausa && !isCerimonia && !hasWinners && (
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {ev.categorie.map((c) => {
                      const cat = CATEGORIES.find((x) => x.id === c)!;
                      return (
                        <span key={c} className="text-[12px] leading-[1.4] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-900 text-slate-300">
                          {cat.emoji} {lang === "fr" ? cat.labelFr : cat.label}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* slate-400 e non slate-500: la nota è l'unica riga lunga della
                    card e su Désarpa (fondo tinto) stava a 3,34:1. */}
                {note && <p className="text-[12px] leading-[1.4] text-slate-400 mt-1.5 italic">{note}</p>}

                {/* vincitrici della tappa. La provenienza del dato (ufficiale /
                    auto / simulato, vedi data/season.ts winnersFor) è
                    dichiarata una volta sola qui sotto, non per vincitrice. */}
                {hasWinners && (
                  <>
                    {/* Da dove vengono questi risultati: una riga per tappa (di
                        norma una sola, l'origine è comune a tutte le categorie),
                        leggibile, non tre pillole da 8px. */}
                    {[...new Set(ev.categorie.map((c) => winners[c]?.confidence).filter(Boolean))]
                      .map((conf) => {
                        const p = PROVENIENZA[conf as RisultatoConfidence];
                        const ProvIcon = p.icon;
                        return (
                          <div key={conf} className={`flex items-start gap-1.5 mt-1.5 text-[11px] leading-snug ${p.tone}`}>
                            <ProvIcon className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                            <span>{tr(lang, p.key)}</span>
                          </div>
                        );
                      })}
                    <div className="mt-2 space-y-1">
                      {ev.categorie.map((c) => {
                        const w = winners[c];
                        if (!w) return null;
                        const cat = CATEGORIES.find((x) => x.id === c)!;
                        return (
                          <div key={c} className="flex items-center gap-2 bg-slate-900/70 rounded-lg px-2 py-1">
                            {w.cow ? (
                              <ReinaThumb cow={w.cow} className="w-7 h-7" />
                            ) : (
                              <img src={SILHOUETTE} alt="" aria-hidden="true" loading="lazy" className="w-7 h-7 rounded-lg object-contain flex-shrink-0" />
                            )}
                            <span className="text-[12px] leading-[1.4] font-mono text-slate-300 truncate flex items-center gap-1 flex-wrap">
                              <Trophy className="inline w-3 h-3 tone-reward mb-0.5 mr-0.5" />
                              <b className="text-slate-100">{w.nome}</b>
                              <span className="text-slate-500"> · {lang === "fr" ? cat.labelFr : cat.label}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* CTA pronostici per la finale */}
                {ev.finale && (
                  <button
                    onClick={onGoPronostici}
                    className="btn-primary mt-2.5 w-full border font-mono font-black text-[11px] py-2 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Swords className="w-3.5 h-3.5" /> {tr(lang, "cal_ctaFinale")}
                  </button>
                )}

                {/* CTA schedina pronostici di tappa (S12) — SOLO sulla prossima
                    tappa ancora in finestra (chiude all'inizio del giorno di gara). */}
                {tappaInFinestra?.id === ev.id && (
                  <PronosticoTappaSchedina
                    lang={lang}
                    evento={ev}
                    picks={tappaPicks[ev.id] ?? {}}
                    onPick={(cat, cowId) => onPickTappa(ev.id, cat, cowId)}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex items-start gap-2 bg-slate-950 border border-slate-850 rounded-2xl p-3 text-[11px] leading-[1.35] font-mono text-slate-500">
        <Info className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
        {tr(lang, "cal_disclaimer")}
      </div>
    </div>
  );
}

/**
 * Schedina pronostici di tappa (S12) — una riga per categoria, 3 Reines
 * pronosticabili (pool `poolPronosticoTappa`, stesso hash deterministico di
 * `avversarieTappa`). L'esito si valuta altrove (SeasonView, contro il
 * risultato ufficiale): qui c'è solo la raccolta del pronostico.
 */
function PronosticoTappaSchedina({ lang, evento, picks, onPick }: {
  lang: Lang;
  evento: SeasonEvent;
  picks: Partial<Record<CategoriaId, string>>;
  onPick: (cat: CategoriaId, cowId: string) => void;
}) {
  return (
    <div id="pronostico-tappa-schedina" data-tappa-id={evento.id} className="mt-2.5 bg-slate-900/60 border border-slate-700 rounded-xl p-2.5 space-y-2">
      <div className="text-[11px] leading-[1.35] font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-1">
        <Ticket className="w-3 h-3" /> {tr(lang, "cal_schedinaTitle")}
      </div>
      {evento.categorie.map((cat) => {
        const catMeta = CATEGORIES.find((c) => c.id === cat)!;
        const pool = poolPronosticoTappa(evento, cat);
        const pickedId = picks[cat];
        return (
          <div key={cat} className="space-y-1">
            <div className="text-[11px] leading-[1.35] font-mono font-bold text-slate-300">
              {catMeta.emoji} {lang === "fr" ? catMeta.labelFr : catMeta.label}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {pool.map((cow) => {
                const picked = pickedId === cow.id;
                return (
                  <button
                    key={cow.id}
                    onClick={() => onPick(cat, cow.id)}
                    className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 border transition-all ${
                      picked ? "chip-active-soft" : "border-slate-800 bg-slate-950 hover:border-primary"
                    }`}
                  >
                    <ReinaThumb cow={cow} className="w-7 h-7" />
                    <span className={`text-[8px] font-mono font-bold truncate max-w-full ${picked ? "" : "text-slate-400"}`}>
                      {cow.name}
                    </span>
                    {picked && <Check className="w-2.5 h-2.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===========================================================================
//  TABELLONE (BRACKET) + PRONOSTICI
// ===========================================================================

function BracketSection({ lang, catSel, setCatSel, picks, setPicks }: {
  lang: Lang; catSel: CategoriaId; setCatSel: (c: CategoriaId) => void;
  picks: Record<string, string>; setPicks: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const rounds = buildRounds(catSel, picks);
  const champion = bracketChampion(rounds);
  const cat = CATEGORIES.find((x) => x.id === catSel)!;

  function pick(matchId: string, cowId: string) {
    setPicks((prev) => {
      const next = { ...prev, [matchId]: cowId };
      const round = Number(matchId.split("-r")[1].split("-m")[0]);
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${catSel}-r`)) {
          const kr = Number(k.split("-r")[1].split("-m")[0]);
          if (kr > round) delete next[k];
        }
      });
      return next;
    });
  }

  if (!rounds.length) {
    return <div className="bg-slate-950 border border-slate-850 rounded-2xl p-6 text-center text-xs font-mono text-slate-500">{tr(lang, "br_nodata")}</div>;
  }

  return (
    <div className="space-y-3">
      {/* selettore categoria — selezione = rosso primario (§ RUOLI COLORE): gli
          accenti per categoria erano oro/azzurro/verde, cioè tre significati
          diversi per la stessa cosa, e come testo stavano sotto 2:1 sul chiaro. */}
      <div className="grid grid-cols-3 gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCatSel(c.id)}
            className={`py-2 rounded-xl text-[12px] leading-[1.4] font-mono font-black border transition-all ${catSel === c.id ? "chip-active" : "text-slate-300 bg-slate-900 border-slate-800 hover:bg-slate-850"}`}
          >
            {c.emoji} {lang === "fr" ? c.labelFr : c.label}
          </button>
        ))}
      </div>
      {/* `cat` era fisso su labelFr: in italiano usciva "Finale regionale ·
          1ère catégorie (pesi massimi …)", mezza frase nell'altra lingua. */}
      <p className="text-[12px] leading-[1.4] font-mono text-slate-500 text-center">
        {tr(lang, "br_intro", { cat: lang === "fr" ? cat.labelFr : cat.label, peso: lang === "fr" ? cat.pesoFr : cat.peso })}
      </p>

      {/* campionessa designata */}
      <AnimatePresence>
        {champion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-amber-500/20 to-slate-950 border border-amber-500/50 rounded-2xl p-3 flex items-center gap-3"
          >
            <ReinaThumb cow={champion} className="w-14 h-14" />
            <div className="min-w-0">
              <div className="text-[11px] leading-[1.35] font-mono uppercase tone-reward tracking-widest flex items-center gap-1"><Crown className="w-3 h-3" /> {tr(lang, "br_champion")}</div>
              <div className="text-base font-mono font-black text-slate-100 truncate">{champion.name}</div>
              {/* `??` non intercetta la stringa vuota: 11 Reines su 73 hanno
                  l'allevatore vuoto e lasciavano un "·" orfano a fine riga. */}
              <div className="text-[12px] leading-[1.4] font-mono text-slate-400 truncate">{[champion.comune, champion.allevatore].filter(Boolean).join(" · ") || "—"}</div>
            </div>
            <Sparkles className="w-5 h-5 tone-reward ml-auto flex-shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* tabellone: colonne scorrevoli */}
      <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
        <div className="flex gap-3 min-w-min">
          {rounds.map((matches, ri) => (
            <div key={ri} className="flex flex-col gap-3 justify-around" style={{ minWidth: 148 }}>
              <div className="text-[11px] leading-[1.35] font-mono font-black uppercase tracking-widest text-center text-slate-300">
                {roundLabel(ri, rounds.length)}
              </div>
              {matches.map((m) => (
                <div key={m.matchId} className="bg-slate-950 border border-slate-850 rounded-xl p-1.5 space-y-1">
                  {[m.a, m.b].map((cow, idx) => {
                    const picked = m.winner?.id && cow?.id === m.winner.id;
                    const decided = !!m.winner;
                    return (
                      <button
                        key={idx}
                        data-pick={cow ? "1" : undefined}
                        disabled={!cow}
                        onClick={() => cow && pick(m.matchId, cow.id)}
                        className={`w-full flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-left transition-all border ${
                          !cow
                            ? "border-slate-900 bg-slate-900/40"
                            : picked
                              ? "chip-active-soft"
                              : decided
                                ? "border-slate-850 bg-slate-900/40 opacity-50"
                                : "border-slate-800 bg-slate-900 hover:border-primary"
                        }`}
                      >
                        {cow ? (
                          <>
                            <ReinaThumb cow={cow} className="w-6 h-6 flex-shrink-0" />
                            <span className={`text-[12px] leading-[1.4] font-mono font-bold truncate ${picked ? "" : "text-slate-300"}`}>{cow.name}</span>
                            {picked && <Check className="w-3 h-3 ml-auto flex-shrink-0" />}
                          </>
                        ) : (
                          /* slate-600 misurava 2,47:1: lo slot indeciso resta
                             attenuato ma leggibile con slate-500 (4,9:1). */
                          <span className="text-[12px] leading-[1.4] font-mono text-slate-500 px-1">?</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}

          {/* colonna campionessa */}
          <div className="flex flex-col justify-center" style={{ minWidth: 120 }}>
            <div className="text-[11px] leading-[1.35] font-mono font-black uppercase tracking-widest text-center tone-reward mb-2">{tr(lang, "br_reine")}</div>
            <div className={`rounded-xl border-2 p-2 text-center ${champion ? "chip-active-soft" : "is-empty border-dashed"}`}>
              {champion ? (
                <>
                  <ReinaThumb cow={champion} className="w-16 h-16 mx-auto" />
                  <div className="text-[11px] font-mono font-black truncate mt-1">{champion.name}</div>
                </>
              ) : (
                <Crown className="w-8 h-8" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
//  SEGUI LA TUA REINE
// ===========================================================================

/** Riga di storico apparizioni/vittorie della Reina seguita (S13) — derivata
 * da CALENDAR + risultati ufficiali (`winnersFor`) + pool deterministico di
 * tappa (`poolPronosticoTappa`, la stessa fonte della schedina pronostici).
 * Zero storage nuovo: pura funzione di dati già esistenti. */
export type StoricoEsito = "vittoria" | "gareggia" | "gareggiata" | "seed" | "reineDesReines";
export interface StoricoEntry { key: string; ev: SeasonEvent; esito: StoricoEsito }

export function buildStorico(followCow: Vatsamon, catId: CategoriaId, todayISO: string): StoricoEntry[] {
  const out: StoricoEntry[] = [];
  for (const ev of CALENDAR) {
    if (ev.kind !== "bataille" || !ev.categorie.includes(catId)) continue;
    if (ev.finale) {
      const w = winnersFor(ev.id)[catId];
      if (w && !w.simulato && w.cow?.id === followCow.id) {
        out.push({ key: ev.id, ev, esito: "reineDesReines" });
      } else if (cowsByCategory(catId).slice(0, 8).some((c) => c.id === followCow.id)) {
        out.push({ key: ev.id, ev, esito: "seed" });
      }
      continue;
    }
    const w = winnersFor(ev.id)[catId];
    if (w && !w.simulato && w.cow?.id === followCow.id) {
      out.push({ key: ev.id, ev, esito: "vittoria" });
      continue;
    }
    if (poolPronosticoTappa(ev, catId).some((c) => c.id === followCow.id)) {
      out.push({ key: ev.id, ev, esito: ev.data <= todayISO ? "gareggiata" : "gareggia" });
    }
  }
  return out;
}

/* Toni allineati al contratto: verde = è andata bene (vittoria confermata),
   rosso = in evidenza/imminente, grigio = cronaca passata o neutra. */
const STORICO_META: Record<StoricoEsito, { icon: typeof Trophy; tone: string; key: DictKey }> = {
  vittoria: { icon: Trophy, tone: "tone-positive", key: "fol_storicoVittoria" },
  gareggia: { icon: Swords, tone: "text-primary-strong", key: "fol_storicoGareggia" },
  gareggiata: { icon: Swords, tone: "text-slate-400", key: "fol_storicoGareggiata" },
  seed: { icon: Crown, tone: "text-slate-300", key: "fol_storicoSeed" },
  reineDesReines: { icon: Crown, tone: "tone-positive", key: "fol_storicoReine" },
};

function FollowSection({ lang, followCow, onFollow, onOpenBracket, todayISO, banner }: {
  lang: Lang;
  followCow: Vatsamon | null;
  onFollow: (id: string | null) => void;
  onOpenBracket: (cat: CategoriaId) => void;
  todayISO: string;
  banner: { ev: SeasonEvent; oggi: boolean } | null;
}) {
  const [catFilter, setCatFilter] = useState<CategoriaId>("1");

  if (followCow) {
    const catId = catIdOf(followCow);
    const cat = CATEGORIES.find((x) => x.id === catId)!;
    const seeded = cowsByCategory(cat.id).slice(0, 8).some((c) => c.id === followCow.id);
    const storico = buildStorico(followCow, catId, todayISO);
    return (
      <div className="space-y-3">
        {/* banner "gareggia oggi/domenica" — deterministico via avversarieTappa */}
        {banner && (
          <div className="chip-active-soft border rounded-2xl p-3 flex items-center gap-2.5">
            <Megaphone className="w-5 h-5 flex-shrink-0" />
            <p className="text-[11px] font-mono font-black leading-snug">
              {tr(lang, banner.oggi ? "fol_bannerOggi" : "fol_bannerDomenica", { nome: followCow.name, comune: banner.ev.comune })}
            </p>
          </div>
        )}

        <div className="bg-gradient-to-br from-rose-950/30 to-slate-950 border border-rose-800/40 rounded-3xl p-4">
          <div className="flex items-center gap-3">
            <ReinaThumb cow={followCow} className="w-20 h-20 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] leading-[1.35] font-mono uppercase text-primary-strong tracking-widest flex items-center gap-1"><Heart className="w-3 h-3 fill-current" /> {tr(lang, "fol_seguendo")}</div>
              <div className="text-xl font-mono font-black text-slate-100 truncate">{followCow.name}</div>
              <div className="text-[12px] leading-[1.4] font-mono text-slate-400 truncate">{cat.emoji} {lang === "fr" ? cat.labelFr : cat.label} · {followCow.riconoscimento || "—"}</div>
            </div>
          </div>
          {/* Due colonne, non tre: "Alpeggi di Valtournenche" in un terzo di
              schermo restava troncato. `||` e non `??`: 11 Reines su 73 hanno
              l'allevatore come stringa VUOTA, e `??` la lascia passare — il
              riquadro appariva senza valore, cioè rotto. */}
          <div className="grid grid-cols-2 gap-2 mt-3 text-center">
            <Stat label={tr(lang, "fol_comune")} value={followCow.comune || "—"} />
            <Stat label={tr(lang, "fol_allevatore")} value={followCow.allevatore || "—"} />
            <Stat label={tr(lang, "fol_potenza")} value={String(followCow.potenza ?? followCow.cp)} />
            <Stat
              label={tr(lang, "fol_peso")}
              value={followCow.peso_kg ? `${followCow.peso_kg} kg${followCow.pesoStimato ? "*" : ""}` : "—"}
            />
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 space-y-2">
          <div className="text-[12px] leading-[1.4] font-mono font-black uppercase tracking-widest text-slate-300">{tr(lang, "fol_cammino")}</div>
          <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
            {seeded
              ? tr(lang, "fol_seed", { cat: lang === "fr" ? cat.labelFr : cat.label })
              : tr(lang, "fol_qual", { cat: lang === "fr" ? cat.labelFr : cat.label, date: fmtDate(SEASON_META.finale.data, lang) })}
          </p>
          <button
            onClick={() => onOpenBracket(cat.id)}
            className="btn-primary w-full border font-mono font-black text-[11px] py-2.5 rounded-xl flex items-center justify-center gap-1.5"
          >
            <Swords className="w-3.5 h-3.5" /> {tr(lang, "fol_vaiTabellone")} {lang === "fr" ? cat.labelFr : cat.label} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* storico stagione reale — apparizioni/vittorie derivate, zero storage nuovo */}
        <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 space-y-2">
          <div className="text-[12px] leading-[1.4] font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-400" /> {tr(lang, "fol_storico")}
          </div>
          {storico.length === 0 ? (
            <p className="is-empty text-[11px] font-mono leading-relaxed">{tr(lang, "fol_storicoVuoto")}</p>
          ) : (
            <div className="space-y-1">
              {storico.map((s) => {
                const meta = STORICO_META[s.esito];
                const Icon = meta.icon;
                const isWin = s.esito === "vittoria" || s.esito === "reineDesReines";
                return (
                  <div key={s.key} className="flex items-center gap-2 bg-slate-900/70 rounded-lg px-2 py-1.5">
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${meta.tone}`} />
                    <span className="text-[12px] leading-[1.4] font-mono text-slate-300 truncate flex items-center gap-1 flex-wrap">
                      <b className={meta.tone}>{tr(lang, meta.key)}</b>
                      <span className="text-slate-500"> · {s.ev.finale ? <Crown className="inline w-2.5 h-2.5 mb-0.5 mr-0.5" /> : null}{s.ev.comune} · {fmtDate(s.ev.data, lang)}</span>
                      {isWin && (
                        <span className="chip-positive inline-flex items-center gap-0.5 text-[12px] leading-[1.4] font-mono font-black px-1.5 py-0.5 rounded-full border">
                          <BadgeCheck className="w-2.5 h-2.5" /> {tr(lang, "res_ufficiale")}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => onFollow(null)}
          className="w-full text-[12px] leading-[1.4] font-mono font-bold text-slate-500 hover:text-rose-300 py-2"
        >
          {tr(lang, "fol_smetti")} {followCow.name}
        </button>
      </div>
    );
  }

  // selezione
  const list = cowsByCategory(catFilter);
  return (
    <div className="space-y-3">
      <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 text-center">
        <Heart className="w-7 h-7 text-primary-strong mx-auto mb-1" />
        <h3 className="h-card text-slate-100">{tr(lang, "fol_scegli")}</h3>
        <p className="text-[12px] leading-[1.4] font-mono text-slate-500 mt-0.5">{tr(lang, "fol_scegliSub")}</p>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCatFilter(c.id)}
            className={`py-2 rounded-xl text-[12px] leading-[1.4] font-mono font-black border transition-all ${catFilter === c.id ? "chip-active" : "text-slate-300 bg-slate-900 border-slate-800 hover:bg-slate-850"}`}
          >
            {c.emoji} {lang === "fr" ? c.labelFr : c.label}
          </button>
        ))}
      </div>

      {/* È il momento in cui si sceglie "la Reina del cuore": 9 delle 21 card
          della 1ª categoria mostravano la STESSA illustrazione di razza, quindi
          non c'era niente da scegliere con gli occhi. Silhouette dove la foto
          non è sua + i dati veri che la distinguono (comune, peso). */}
      <div className="grid grid-cols-2 gap-2">
        {list.map((cow) => (
          <button
            key={cow.id}
            onClick={() => onFollow(cow.id)}
            className="flex items-center gap-2 bg-slate-950 border border-slate-850 hover:border-primary rounded-xl p-2 text-left transition-all"
          >
            <ReinaThumb cow={cow} className="w-9 h-9 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[12px] leading-[1.4] font-mono font-bold text-slate-200 truncate">{cow.name}</div>
              <div className="text-[12px] leading-[1.4] font-mono text-slate-500 truncate">{cow.comune || "—"}</div>
              {cow.peso_kg ? (
                <div className="text-[12px] leading-[1.4] font-mono text-slate-500 truncate tabular-nums">{cow.peso_kg} kg{cow.pesoStimato ? "*" : ""}</div>
              ) : null}
            </div>
          </button>
        ))}
      </div>
      {/* l'asterisco deve valere qualcosa: 62 pesi su 73 sono stimati */}
      <p className="text-[12px] leading-[1.4] font-mono text-slate-500 text-center">
        {tr(lang, "fol_pesoStimato")}
      </p>
    </div>
  );
}

// ===========================================================================
//  NOTIZIE (home dell'hub) — countdown · feed reale · sponsor
// ===========================================================================

function NewsSection({ lang, todayISO, onGoCalendario, onGoTabellone }: {
  lang: Lang; todayISO: string; onGoCalendario: () => void; onGoTabellone: () => void;
}) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [generato, setGenerato] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadNews().then((r) => { if (alive) { setNews(r.items); setGenerato(r.generato); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  // S14: la Désarpa (kind "cerimonia") entra nello stesso countdown delle
  // batailles — altrimenti una tappa lontana la "salterebbe" nel conteggio
  // anche quando la cerimonia è cronologicamente più vicina.
  const next = CALENDAR.find((e) => (e.kind === "bataille" || e.kind === "cerimonia") && e.data >= todayISO);
  const isNextCerimonia = next?.kind === "cerimonia";
  const giorni = next ? Math.max(0, Math.round((new Date(next.data + "T12:00:00").getTime() - new Date(todayISO + "T12:00:00").getTime()) / 86400000)) : null;

  return (
    <div className="space-y-3">
      {/* countdown prossima tappa */}
      {next && (
        <div className="bg-gradient-to-br from-amber-950/50 to-slate-950 border border-amber-700/40 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-[11px] leading-[1.35] font-mono uppercase tracking-widest text-amber-400">
            <Clock className="w-3 h-3" /> {next.finale ? tr(lang, "news_finale") : isNextCerimonia ? tr(lang, "news_cerimonia") : tr(lang, "news_prossimaTappa")}
          </div>
          <div className="flex items-end justify-between mt-1">
            <div className="min-w-0">
              <div className="text-lg font-mono font-black text-slate-100 truncate">{next.finale && <Crown className="inline w-4 h-4 text-amber-400 mb-0.5 mr-1" />}{next.comune}</div>
              {/* stesso fallback del Calendario: `luogoFr` copre solo i luoghi
                  generici, i toponimi restano nella forma italiana */}
              <div className="text-[12px] leading-[1.4] font-mono text-slate-400 truncate"><MapPin className="inline w-3 h-3 text-slate-500 mb-0.5" /> {lang === "fr" ? (next.luogoFr ?? next.luogo) : next.luogo} · {fmtDate(next.data, lang)}</div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="text-2xl font-mono font-black text-amber-300 tabular-nums leading-none">{giorni}</div>
              <div className="text-[12px] leading-[1.4] font-mono uppercase text-slate-500">{tr(lang, "news_giorni")}</div>
            </div>
          </div>
          {/* "Pronostici" porta al tabellone della finale: non pertinente per la
              Désarpa (nessun vincitore di gara), quindi si nasconde solo lì. */}
          <div className={`grid gap-2 mt-3 ${isNextCerimonia ? "grid-cols-1" : "grid-cols-2"}`}>
            <button onClick={onGoCalendario} className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-mono font-black text-[12px] leading-[1.4] py-2 rounded-xl flex items-center justify-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {tr(lang, "news_btnCalendario")}</button>
            {!isNextCerimonia && (
              <button onClick={onGoTabellone} className="btn-primary border font-mono font-black text-[12px] leading-[1.4] py-2 rounded-xl flex items-center justify-center gap-1"><Swords className="w-3.5 h-3.5" /> {tr(lang, "news_btnPronostici")}</button>
            )}
          </div>
        </div>
      )}

      {/* notizie */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5"><Newspaper className="w-3.5 h-3.5 text-amber-400" /> {tr(lang, "news_dalMondo")}</h3>
        {generato && <span className="text-[12px] leading-[1.4] font-mono text-slate-500">{tr(lang, "news_agg")} {fmtDate(generato, lang)}</span>}
      </div>

      {loading ? (
        <div className="bg-slate-950 border border-slate-850 rounded-2xl p-6 text-center text-[11px] font-mono text-slate-500">{tr(lang, "news_loading")}</div>
      ) : (
        news.map((n) => (
          <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer"
            className="block bg-slate-950 border border-slate-850 hover:border-amber-600/40 rounded-2xl p-3 transition-all">
            <div className="flex items-center gap-2 text-[12px] leading-[1.4] font-mono uppercase tracking-wide text-amber-400 mb-1">
              <span>{n.fonte}</span><span className="text-slate-500">·</span><span className="text-slate-500">{fmtDate(n.data, lang)}</span>
              <ExternalLink className="w-3 h-3 text-slate-600 ml-auto" />
            </div>
            <div className="text-[12px] font-mono font-black text-slate-100 leading-snug">{n.titolo}</div>
            {n.estratto && <p className="text-[12px] leading-[1.4] text-slate-400 mt-1">{n.estratto}</p>}
          </a>
        ))
      )}

      {/* sponsor (inventario vendibile) */}
      <div className="space-y-1.5">
        <div className="text-[11px] leading-[1.35] font-mono uppercase tracking-widest text-slate-500 px-1 flex items-center gap-1"><Megaphone className="w-3 h-3" /> {tr(lang, "news_spazioSponsor")}</div>
        <div className="grid grid-cols-1 gap-2">
          {SPONSOR_SLOTS.map((s) => (
            <div key={s.id} className="bg-slate-900/60 border border-dashed border-slate-700 rounded-xl p-3 text-center">
              <div className="text-[12px] leading-[1.4] font-mono uppercase tracking-widest text-amber-400">{lang === "fr" ? s.livelloFr : s.livello}</div>
              <div className="text-[12px] leading-[1.4] font-mono font-bold text-slate-400 mt-0.5">{lang === "fr" ? s.placeholderFr : s.placeholder}</div>
              {/* slate-600 su fondo tratteggiato misurava 2,42:1 */}
              <div className="text-[12px] leading-[1.4] font-mono text-slate-500 mt-0.5">{lang === "fr" ? s.posizioneFr : s.posizione}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 bg-slate-950 border border-slate-850 rounded-2xl p-3 text-[11px] leading-[1.35] font-mono text-slate-500">
        <Info className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
        {tr(lang, "news_disclaimer")}
      </div>
    </div>
  );
}

// ===========================================================================
//  ALBO D'ORO
// ===========================================================================

function AlboSection({ lang }: { lang: Lang }) {
  return (
    <div className="space-y-3">
      <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 text-center">
        <Medal className="w-7 h-7 text-amber-400 mx-auto mb-1" />
        <h3 className="text-sm font-mono font-black text-amber-200">{tr(lang, "albo_title")}</h3>
        <p className="text-[12px] leading-[1.4] font-mono text-slate-500 mt-0.5">{tr(lang, "albo_sub")}</p>
      </div>

      {/* leggende */}
      <div className="grid grid-cols-1 gap-2">
        {LEGGENDE.map((l) => {
          const cow = reinaByName(l.nome);
          return (
            <div key={l.nome} className="bg-gradient-to-br from-amber-950/40 to-slate-950 border border-amber-700/40 rounded-2xl p-3 flex gap-2.5">
              {cow ? <ReinaThumb cow={cow} className="w-12 h-12 flex-shrink-0" /> : <img src={SILHOUETTE} alt="" aria-hidden="true" loading="lazy" className="w-12 h-12 rounded-xl object-contain flex-shrink-0" />}
              <div className="min-w-0">
                <div className="text-[12px] leading-[1.4] font-mono uppercase tracking-widest tone-reward">{lang === "fr" ? l.titoloFr : l.titolo}</div>
                <div className="text-sm font-mono font-black text-slate-100 truncate">{l.nome}</div>
                <p className="text-[11px] leading-[1.35] font-mono text-slate-400 mt-0.5">{lang === "fr" ? l.descrFr : l.descr}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* per anno */}
      {ALBO_ANNI.map((anno) => (
        <div key={anno} className="bg-slate-950 border border-slate-850 rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-mono font-black text-slate-100">{anno}</span>
            <span className="text-[11px] leading-[1.35] font-mono text-slate-500">{tr(lang, "albo_finaleCN")}</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {(["1", "2", "3"] as CategoriaId[]).map((catId) => {
              const h = ALBO_DORO.find((e) => e.anno === anno && e.cat === catId);
              const cat = CATEGORIES.find((c) => c.id === catId)!;
              const cow = h ? reinaByName(h.nome) : undefined;
              return (
                <div key={catId} className="bg-slate-900/70 rounded-xl p-2 flex items-center gap-2 border-l-[3px] border-slate-700">
                  {cow ? <ReinaThumb cow={cow} className="w-8 h-8 flex-shrink-0" /> : <img src={SILHOUETTE} alt="" aria-hidden="true" loading="lazy" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-[12px] leading-[1.4] font-mono uppercase text-slate-300">{cat.emoji} {lang === "fr" ? cat.labelFr : cat.label}</div>
                    <div className="text-[11px] font-mono font-black text-slate-200 truncate">{h?.nome ?? "—"}</div>
                    {/* join filtrato: senza allevatore restava un "·" a inizio riga */}
                    <div className="text-[12px] leading-[1.4] font-mono text-slate-500 truncate">
                      {[h?.allevatore, lang === "fr" ? h?.noteFr ?? h?.note : h?.note].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-[11px] leading-[1.35] font-mono text-slate-500 text-center">
        {tr(lang, "albo_note")}
      </p>
    </div>
  );
}

// ===========================================================================
//  SCOPRI — cultura · regolamento · glossario
// ===========================================================================

type ScopriTab = "storia" | "cultura" | "regolamento" | "glossario";

function ScopriSection({ lang }: { lang: Lang }) {
  const [tab, setTab] = useState<ScopriTab>("storia");
  return (
    <div className="space-y-3">
      {/* SECONDO livello di navigazione: sopra ci sono già sei pillole piene su
          due righe, e ripetere lo stesso trattamento faceva sembrare le due
          barre lo stesso comando. Qui: una riga sola, senza icone, selezione a
          sottolineatura. Recupera ~36px e distingue i due livelli a colpo
          d'occhio. */}
      <div className="grid grid-cols-4 gap-1.5 border-b border-slate-800">
        {([
          ["storia", tr(lang, "scopri_storia")],
          ["cultura", tr(lang, "scopri_cultura")],
          ["regolamento", tr(lang, "scopri_regolamento")],
          ["glossario", tr(lang, "scopri_glossario")],
        ] as [ScopriTab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`min-h-[40px] px-1 pb-1.5 -mb-px border-b-2 text-[11px] font-mono font-black transition-all ${
              tab === id ? "border-primary text-primary-strong" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "storia" && (
        <div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{tr(lang, "storia_intro")}</p>
          <div className="relative pl-5">
            {/* linea verticale della timeline */}
            <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-gradient-to-b from-primary/60 via-slate-700 to-slate-800" />
            <div className="space-y-3">
              {STORIA.map((m) => (
                <div key={m.id} className="relative">
                  <div className="absolute -left-5 top-1 w-3.5 h-3.5 rounded-full bg-primary border-2 border-slate-950 shadow" />
                  <div className="bg-slate-950 border border-slate-850 rounded-2xl p-3.5">
                    <div className="flex items-center gap-2 mb-1">
                      {/* `epocaFr` è obbligatorio su MilestoneStoria: niente fallback */}
                      <span className="text-[11px] leading-[1.35] font-mono font-black uppercase tracking-widest text-slate-300 bg-slate-900 border border-slate-700 rounded-full px-2 py-0.5">{lang === "fr" ? m.epocaFr : m.epoca}</span>
                    </div>
                    <h4 className="h-card text-slate-100 flex items-center gap-1.5">
                      <span className="text-base">{m.emoji}</span> {lang === "fr" ? m.titoloFr : m.titolo}
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed mt-1.5">{lang === "fr" ? m.testoFr : m.testo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "cultura" && (
        <div className="space-y-2.5">
          {CULTURA.map((c) => (
            <div key={c.id} className="bg-slate-950 border border-slate-850 rounded-2xl p-3.5">
              <h4 className="h-card text-slate-100 flex items-center gap-1.5">
                <span className="text-base">{c.emoji}</span> {lang === "fr" ? c.titoloFr : c.titolo}
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed mt-1.5">{lang === "fr" ? c.testoFr : c.testo}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "regolamento" && (
        <div className="space-y-3">
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-3 overflow-x-auto">
            <div className="text-[12px] leading-[1.4] font-mono font-black uppercase tracking-widest text-slate-300 mb-2">{tr(lang, "reg_categorie")}</div>
            <table className="w-full text-[12px] leading-[1.4] font-mono border-collapse">
              <thead>
                <tr className="text-slate-500">
                  <th className="text-left font-bold py-1 pr-2">{tr(lang, "reg_fase")}</th>
                  {CATEGORIES.map((c) => (
                    <th key={c.id} className="text-right font-bold py-1 px-1 text-slate-300">{c.emoji} {c.id}ª</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SOGLIE_PER_FASE.map((s) => (
                  <tr key={s.fase} className="border-t border-slate-850">
                    <td className="py-1.5 pr-2 text-slate-300">{lang === "fr" ? s.faseLabelFr : s.faseLabel}</td>
                    {(["1", "2", "3"] as CategoriaId[]).map((catId) => (
                      <td key={catId} className="py-1.5 px-1 text-right text-slate-200 tabular-nums">{s.soglie[catId]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[12px] leading-[1.4] font-mono text-slate-500 mt-2">{tr(lang, "reg_soglieNota")}</p>
          </div>

          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-3.5 space-y-2 text-[11px] text-slate-300 leading-relaxed">
            {([
              [tr(lang, "reg_r1t"), tr(lang, "reg_r1d")],
              [tr(lang, "reg_r2t"), tr(lang, "reg_r2d")],
              [tr(lang, "reg_r3t"), tr(lang, "reg_r3d")],
              [tr(lang, "reg_r4t"), tr(lang, "reg_r4d")],
            ]).map(([t, d]) => (
              <div key={t}><b className="text-slate-100">{t}</b> — {d}</div>
            ))}
          </div>
        </div>
      )}

      {tab === "glossario" && (
        <div className="space-y-2">
          {GLOSSARIO.map((g) => (
            <div key={g.chiave} className="bg-slate-950 border border-slate-850 rounded-xl p-3">
              {/* il glossario è bilingue per natura: restano entrambi i lemmi,
                  ma il capofila è quello della lingua scelta — in FR il termine
                  in grassetto era italiano */}
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="h-card text-slate-100">{lang === "fr" ? g.fr : g.it}</span>
                <span className="text-[12px] leading-[1.4] font-mono text-slate-400">{lang === "fr" ? g.it : g.fr}</span>
                {g.patois && <span className="text-[11px] leading-[1.35] font-mono italic text-slate-500">{g.patois}</span>}
              </div>
              {/* `defFr` è obbligatorio su GlossarioVoce: niente fallback */}
              <p className="text-[12px] leading-[1.4] text-slate-400 mt-0.5">{lang === "fr" ? g.defFr : g.def}</p>
            </div>
          ))}
          <div className="flex items-start gap-2 bg-slate-950 border border-slate-850 rounded-2xl p-3 text-[11px] leading-[1.35] font-mono text-slate-500">
            <Info className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
            {tr(lang, "gloss_fonti")}: {FONTI.filter((f) => f.tipo === "ufficiale" || f.tipo === "regione").map((f) => f.nome).join(" · ")}.
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-850 py-1.5 px-1">
      <div className="text-[12px] leading-[1.4] font-mono uppercase text-slate-500 truncate">{label}</div>
      <div className="text-[11px] font-mono font-black text-slate-200 truncate">{value}</div>
    </div>
  );
}
