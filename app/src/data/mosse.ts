import {
  AzioneId, MossaMods, MossaRef, Personalita, SpintaState, Spintatore, TurnResult, applyAzione,
} from "../lib/spinta";
import { Vatsamon } from "../types";

/**
 * LE MOSSE — il colore comico della Spinta.
 *
 * Ogni mossa è una VARIANTE di una delle 4 famiglie del motore (incalza /
 * reggi / gira / incoraggia): la matrice di counter, i tell e il giudizio di
 * condotta restano identici; cambia solo il "come" (piccoli modificatori).
 *
 * PALETTO INCRUENTO (GAME_REDESIGN §principi): ogni "testata" o "incornata"
 * è una spinta a corna limate — la desc non descrive MAI un contatto lesivo.
 * I nomi sono il folklore della piazza («i nomi li inventa la piazza, la
 * tradizione è vera»): l'umorismo sta nel registro, non nella violenza.
 *
 * `desc` = la riga comica · `comeFunziona` = la meccanica onesta (stile
 * SAC_ITEMS: niente descrizioni-fantasma). Le speciali/leggendarie hanno
 * usi contati PER SPINTA e requisiti di condizione.
 */

export type MossaRarita = "comune" | "rara" | "speciale" | "leggendaria";

export interface Mossa {
  id: string;
  famiglia: AzioneId;
  nome: string;
  emoji: string;
  desc: string;          // la riga COMICA (registro sagra di paese)
  comeFunziona: string;  // la riga CHIARA (meccanica onesta)
  rarita: MossaRarita;
  mods: MossaMods;
  usiMax?: number;       // usi per spinta (speciali/leggendarie)
  requisiti?: { calmaMin?: number; fiatoMin?: number; barraMin?: number; barraMax?: number; turnoMin?: number };
  glossarioKey?: string; // aggancio ⓘ → GLOSSARIO (bataillesContent.ts)
}

const M = (m: Mossa) => m;

export const MOSSE: Record<string, Mossa> = {
  // ── FAMIGLIA INCALZA 🐂 — spinte frontali: la massa conta ──────────────
  "incornata-buongiorno": M({
    id: "incornata-buongiorno", famiglia: "incalza", nome: "Incornata del Buongiorno", emoji: "☀️", rarita: "comune",
    desc: "Una spinta franca per dire: questa piazza è mia.",
    comeFunziona: "Incalzata standard: forte su chi recupera o gira, si spegne su chi regge. Fiato −20, calma −10.",
    mods: {},
  }),
  "spinta-polenta": M({
    id: "spinta-polenta", famiglia: "incalza", nome: "Spinta della Polenta Concia", emoji: "🥣", rarita: "comune",
    desc: "Colazione abbondante, spinta abbondante. Semplice.",
    comeFunziona: "Spinta +15%, ma costa 6 fiato in più.",
    mods: { spintaMult: 1.15, fiatoDelta: -6 },
  }),
  "testata-diplomatica": M({
    id: "testata-diplomatica", famiglia: "incalza", nome: "Testata Diplomatica", emoji: "🤝", rarita: "rara",
    desc: "Non ti sposto: ti convinco a spostarti.",
    comeFunziona: "Spinta −20%, ma innervosisce l'avversaria (−5 calma) e a te ne costa meno (+3).",
    mods: { spintaMult: 0.8, calmaAvv: 5, calmaDelta: 3 },
  }),
  "incornata-suocera": M({
    id: "incornata-suocera", famiglia: "incalza", nome: "Incornata della Suocera", emoji: "😤", rarita: "speciale",
    desc: "Spintone frontale carico di rancore famigliare. (La suocera non c'entra: in piazza la chiamano così.)",
    comeFunziona: "Spinta +50%, costa 10 fiato in più. Max 2 usi per spinta, serve calma ≥ 40.",
    mods: { spintaMult: 1.5, fiatoDelta: -10 },
    usiMax: 2, requisiti: { calmaMin: 40 },
  }),
  "testata-termonucleare": M({
    id: "testata-termonucleare", famiglia: "incalza", nome: "Testata Termonucleare", emoji: "💥", rarita: "leggendaria",
    desc: "La spinta che si racconta ancora a veglia. Nessuna si fa male: è la piazza che trema.",
    comeFunziona: "Spinta doppia, ma −18 fiato e −10 calma extra. 1 uso per spinta, serve fiato ≥ 50.",
    mods: { spintaMult: 2.0, fiatoDelta: -18, calmaDelta: -10 },
    usiMax: 1, requisiti: { fiatoMin: 50 },
    glossarioKey: "bataille",
  }),

  // ── FAMIGLIA REGGI 🪨 — posture piantate: la forza si vede quando ti attaccano ──
  "zoccoli-radice": M({
    id: "zoccoli-radice", famiglia: "reggi", nome: "Zoccoli di Radice", emoji: "🌳", rarita: "comune",
    desc: "Piantata lì come un larice. Buona fortuna.",
    comeFunziona: "Reggi standard: ferma l'incalzata (rimbalzo +2.5), recupera +10 fiato e +5 calma. Aggirabile di leno.",
    mods: {},
  }),
  "muro-di-stalla": M({
    id: "muro-di-stalla", famiglia: "reggi", nome: "Muro di Stalla", emoji: "🛡️", rarita: "comune",
    desc: "Provate voi a spostare una stalla.",
    comeFunziona: "Assorbe quasi tutta l'incalzata e rimbalza più forte (+3.5), ma è più statica: chi gira la aggira meglio.",
    mods: { reggiAssorbi: 0.3, reggiRimbalzo: 3.5, reggiEsposizioneGira: 1.5 },
  }),
  "sguardo-regale": M({
    id: "sguardo-regale", famiglia: "reggi", nome: "Sguardo Regale", emoji: "👑", rarita: "rara",
    desc: "Non serve spingere chi ti guarda così.",
    comeFunziona: "Reggi che intimidisce: chi la fissa perde 6 calma; assorbe un po' meglio l'urto.",
    mods: { calmaAvv: 6, reggiAssorbi: 0.35 },
    glossarioKey: "reine",
  }),
  "quintale-fermo": M({
    id: "quintale-fermo", famiglia: "reggi", nome: "Il Quintale Fermo", emoji: "⚖️", rarita: "rara",
    desc: "Sette quintali di serenità applicata.",
    comeFunziona: "Reggi riposante: +4 fiato e +4 calma extra, ma rimbalzo ridotto (2.0).",
    mods: { fiatoDelta: 4, calmaDelta: 4, reggiRimbalzo: 2.0 },
  }),
  "sciopero-zoccolo": M({
    id: "sciopero-zoccolo", famiglia: "reggi", nome: "Sciopero dello Zoccolo", emoji: "🪧", rarita: "speciale",
    desc: "La Reina proclama lo sciopero generale: da qui non si muove nessuno.",
    comeFunziona: "Muro quasi totale (assorbe l'85%, rimbalzo +5). Solo quando sei in svantaggio (barra ≤ 45). Max 2 usi per spinta.",
    mods: { reggiAssorbi: 0.15, reggiRimbalzo: 5 },
    usiMax: 2, requisiti: { barraMax: 45 },
  }),

  // ── FAMIGLIA GIRA 🌀 — leve di fianco: la presa conta ──────────────────
  "giro-di-leno": M({
    id: "giro-di-leno", famiglia: "gira", nome: "Giro di Leno", emoji: "🌀", rarita: "comune",
    desc: "Il classico: se il muro non si sposta, giragli attorno.",
    comeFunziona: "Gira standard: aggira chi regge, punita dall'incalzata frontale. Fiato −13.",
    mods: {},
  }),
  "valzer-del-mercato": M({
    id: "valzer-del-mercato", famiglia: "gira", nome: "Valzer del Mercato", emoji: "💃", rarita: "comune",
    desc: "Due passi di lato, un inchino, e l'avversaria saluta il vuoto.",
    comeFunziona: "Leva +20%, ma costa 3 calma in più.",
    mods: { spintaMult: 1.2, calmaDelta: -3 },
  }),
  "finta-del-casaro": M({
    id: "finta-del-casaro", famiglia: "gira", nome: "Finta del Casaro", emoji: "🧀", rarita: "rara",
    desc: "Finge di andare alla fontina. Funziona sempre.",
    comeFunziona: "Leva −10%, ma CONFONDE l'avversaria: la sua prossima scelta è casuale, non tattica.",
    mods: { spintaMult: 0.9, scrambleTell: true },
    glossarioKey: "alpeggio",
  }),
  "piroetta-genepy": M({
    id: "piroetta-genepy", famiglia: "gira", nome: "Piroetta del Genepy", emoji: "🍵", rarita: "speciale",
    desc: "Un giro così pulito che il pastore versa da bere.",
    comeFunziona: "Leva +60%. Serve grande calma (≥ 60). Max 2 usi per spinta.",
    mods: { spintaMult: 1.6 },
    usiMax: 2, requisiti: { calmaMin: 60 },
  }),
  "fohn-furioso": M({
    id: "fohn-furioso", famiglia: "gira", nome: "Föhn Furioso", emoji: "🌬️", rarita: "leggendaria",
    desc: "Una girata così rapida che spettina pure i ghiacciai.",
    comeFunziona: "Leva +80% e confonde l'avversaria, ma −8 fiato extra. 1 uso per spinta.",
    mods: { spintaMult: 1.8, scrambleTell: true, fiatoDelta: -8 },
    usiMax: 1,
  }),

  // ── FAMIGLIA INCORAGGIA 💚 — la voce dell'allevatore: «conduce, non forza» ──
  "parola-buona": M({
    id: "parola-buona", famiglia: "incoraggia", nome: "La Parola Buona", emoji: "💚", rarita: "comune",
    desc: "Due parole in patois all'orecchio giusto.",
    comeFunziona: "Recupero standard: fiato e calma (di più se l'avversaria non attacca). Cedi 4 di barra.",
    mods: {},
    glossarioKey: "razza_valdostana",
  }),
  "ruminazione-zen": M({
    id: "ruminazione-zen", famiglia: "incoraggia", nome: "Ruminazione Zen", emoji: "🧘", rarita: "comune",
    desc: "Lei rumina. Il mondo può attendere.",
    comeFunziona: "Recupero mentale: +6 calma extra, −4 fiato recuperato.",
    mods: { calmaDelta: 6, fiatoDelta: -4 },
  }),
  "pisolino-pascolo": M({
    id: "pisolino-pascolo", famiglia: "incoraggia", nome: "Pisolino al Pascolo (finto)", emoji: "😴", rarita: "rara",
    desc: "Sembra che dorma. Sta solo facendo i conti.",
    comeFunziona: "Gran respiro: +8 fiato extra, ma cedi 7 di barra invece di 4.",
    mods: { fiatoDelta: 8, barraCost: 7 },
  }),
  "muggito-mandria": M({
    id: "muggito-mandria", famiglia: "incoraggia", nome: "Muggito della Mandria", emoji: "📣", rarita: "rara",
    desc: "Quando muggisce lei, rispondono tre alpeggi.",
    comeFunziona: "Recupero normale + l'avversaria perde 6 calma.",
    mods: { calmaAvv: 6 },
    glossarioKey: "reina_corne",
  }),
  "concerto-campanacci": M({
    id: "concerto-campanacci", famiglia: "incoraggia", nome: "Concerto di Campanacci", emoji: "🔔", rarita: "speciale",
    desc: "Tutta la valle suona per lei.",
    comeFunziona: "Secondo fiato: recupero doppio SENZA cedere terreno. 1 uso per spinta.",
    mods: { recuperoMult: 2, barraCost: 0 },
    usiMax: 1,
  }),
  "muggito-apocalisse": M({
    id: "muggito-apocalisse", famiglia: "incoraggia", nome: "Muggito dell'Apocalisse", emoji: "🔱", rarita: "leggendaria",
    desc: "Il muggito che nel '94 fece scendere la nebbia. Dicono.",
    comeFunziona: "L'avversaria perde 18 calma (agitata spinge il 25% in meno); tu recuperi senza cedere barra. 1 uso, dal turno 6.",
    mods: { calmaAvv: 18, barraCost: 0 },
    usiMax: 1, requisiti: { turnoMin: 6 },
  }),
};

/** La mossa "base" di ogni famiglia (il comportamento storico del motore). */
export const MOSSE_BASE: Record<AzioneId, string> = {
  incalza: "incornata-buongiorno",
  reggi: "zoccoli-radice",
  gira: "giro-di-leno",
  incoraggia: "parola-buona",
};

export const MOSSE_PER_FAMIGLIA: Record<AzioneId, Mossa[]> = {
  incalza: [], reggi: [], gira: [], incoraggia: [],
};
for (const m of Object.values(MOSSE)) MOSSE_PER_FAMIGLIA[m.famiglia].push(m);

const RARE_PER_FAMIGLIA: Record<AzioneId, Mossa[]> = {
  incalza: MOSSE_PER_FAMIGLIA.incalza.filter((m) => m.rarita === "rara"),
  reggi: MOSSE_PER_FAMIGLIA.reggi.filter((m) => m.rarita === "rara"),
  gira: MOSSE_PER_FAMIGLIA.gira.filter((m) => m.rarita === "rara"),
  incoraggia: MOSSE_PER_FAMIGLIA.incoraggia.filter((m) => m.rarita === "rara"),
};

export const FAMIGLIE: AzioneId[] = ["incalza", "reggi", "gira", "incoraggia"];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Le 4 famiglie in ordine di affinità con le stat reali della Reina
 *  (stazza→incalza, testa→reggi, corna→gira, grinta→incoraggia): deterministico. */
export function famigliePerPreferenza(cow: Pick<Vatsamon, "stats" | "stats4">): AzioneId[] {
  const s4 = cow.stats4 ?? {
    stazza: cow.stats.defense, corna: cow.stats.strength,
    testa: cow.stats.defense, grinta: cow.stats.agility,
  };
  const coppie: [AzioneId, number][] = [
    ["incalza", s4.stazza], ["reggi", s4.testa], ["gira", s4.corna], ["incoraggia", s4.grinta],
  ];
  coppie.sort((a, b) => b[1] - a[1]);
  return coppie.map(([fam]) => fam);
}

export function famigliaPreferita(cow: Pick<Vatsamon, "stats" | "stats4">): AzioneId {
  return famigliePerPreferenza(cow)[0];
}

const setBase = (): Record<AzioneId, Mossa> => ({
  incalza: MOSSE[MOSSE_BASE.incalza],
  reggi: MOSSE[MOSSE_BASE.reggi],
  gira: MOSSE[MOSSE_BASE.gira],
  incoraggia: MOSSE[MOSSE_BASE.incoraggia],
});

/**
 * Moveset equipaggiato di una Reina — SENZA migrazione dei salvataggi:
 * se `cow.mosse` manca (tutte le collezioni esistenti) il default è
 * deterministico: le 4 basi, e per le Epiche/Leggendarie la base della
 * famiglia preferita è sostituita da una rara (seed = id della cow).
 * Se `cow.mosse` è presente ma incompleto/corrotto, le famiglie mancanti
 * tornano alla base: mai uno slot vuoto (ogni postura ha una risposta).
 */
export function mosseEquipaggiate(cow: Vatsamon): Record<AzioneId, Mossa> {
  const set = setBase();
  if (cow.mosse?.length) {
    for (const id of cow.mosse) {
      const m = MOSSE[id];
      if (m) set[m.famiglia] = m;
    }
    return set;
  }
  if (cow.rarity === "Epica" || cow.rarity === "Leggendaria") {
    const fam = famigliaPreferita(cow);
    const rare = RARE_PER_FAMIGLIA[fam];
    if (rare.length) set[fam] = rare[hashStr(cow.id) % rare.length];
  }
  return set;
}

/** Moveset dell'avversaria: base per i Pastori; per boss/leggende una rara
 *  coerente con l'indole (seed dal nome — stessa avversaria, stesse mosse). */
export function mosseAvversaria(name: string, personalita: Personalita, boss = false): Record<AzioneId, Mossa> {
  const set = setBase();
  if (!boss) return set;
  const famPerIndole: Record<Personalita, AzioneId> = {
    focosa: "incalza", paziente: "reggi", astuta: "gira", nervosa: "incoraggia",
  };
  const fam = famPerIndole[personalita];
  const rare = RARE_PER_FAMIGLIA[fam];
  if (rare.length) set[fam] = rare[hashStr(name) % rare.length];
  return set;
}

/** Motivo per cui la mossa NON è giocabile ora (null = giocabile).
 *  I requisiti si leggono dal punto di vista di chi agisce. */
export function bloccoMossa(m: Mossa, st: SpintaState, side: "p" | "o"): string | null {
  if (m.usiMax !== undefined) {
    const usati = st.usiMosse?.[`${side}:${m.id}`] ?? 0;
    if (usati >= m.usiMax) return "usi esauriti";
  }
  const req = m.requisiti;
  if (!req) return null;
  const calma = side === "p" ? st.calma : (st.calmaO ?? 80);
  const fiato = side === "p" ? st.fiatoP : st.fiatoO;
  const barra = side === "p" ? st.barra : 100 - st.barra;
  const turno = st.turno ?? 0;
  if (req.calmaMin !== undefined && calma < req.calmaMin) return `serve calma ≥ ${req.calmaMin}`;
  if (req.fiatoMin !== undefined && fiato < req.fiatoMin) return `serve fiato ≥ ${req.fiatoMin}`;
  if (req.barraMax !== undefined && barra > req.barraMax) return `solo in svantaggio (barra ≤ ${req.barraMax})`;
  if (req.barraMin !== undefined && barra < req.barraMin) return `solo in vantaggio (barra ≥ ${req.barraMin})`;
  if (req.turnoMin !== undefined && turno < req.turnoMin) return `dal turno ${req.turnoMin}`;
  return null;
}

const toRef = (m: Mossa): MossaRef => ({ id: m.id, nome: m.nome, emoji: m.emoji, mods: m.mods });

/**
 * Wrapper unico per i 4 UI di battaglia: risolve la mossa, la applica al
 * motore e registra l'uso (per i limiti delle speciali). Se la mossa è
 * bloccata (l'AI non controlla i requisiti), ripiega sulla base di famiglia.
 */
export function eseguiMossa(side: "p" | "o", mossaId: string, st: SpintaState, A: Spintatore, B: Spintatore): TurnResult {
  let m = MOSSE[mossaId] ?? MOSSE[MOSSE_BASE.incalza];
  if (bloccoMossa(m, st, side)) m = MOSSE[MOSSE_BASE[m.famiglia]];
  const r = applyAzione(side, m.famiglia, st, A, B, { mossa: toRef(m) });
  if (m.usiMax !== undefined) {
    const key = `${side}:${m.id}`;
    r.state.usiMosse = { ...(r.state.usiMosse ?? {}), [key]: (r.state.usiMosse?.[key] ?? 0) + 1 };
  }
  return r;
}
