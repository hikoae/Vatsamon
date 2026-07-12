/**
 * SIM-SPINTA — harness di bilanciamento delle mosse (AI vs AI).
 *
 * Esecuzione (esbuild risolve gli import senza estensione, poi node esegue):
 *   cd app
 *   node_modules/.bin/esbuild scripts/sim-spinta.ts --bundle --format=esm \
 *     --platform=node --outfile=node_modules/.cache/sim-spinta.mjs && \
 *   node node_modules/.cache/sim-spinta.mjs
 *
 * Metodo: due Spintatrici identiche e medie (massa/presa/volontà 55). La
 * baseline è moveset base vs moveset base. Ogni VARIANTE sostituisce la base
 * della sua famiglia nel moveset del lato P; 1000 duelli × 4 indoli.
 * Entrambi i lati decidono con la STESSA politica (specchio di prepareIntent),
 * quindi lo scostamento dal 50% misura solo la forza della mossa.
 *
 * CRITERI (piano §A7): comuni/rare entro ±8 punti dal 50%; speciali e
 * leggendarie entro ±15 (hanno usi contati e requisiti di condizione).
 */
import {
  AzioneId, Personalita, Spintatore, SpintaState, TerrainEffect, initSpinta, MAX_TURNI,
} from "../src/lib/spinta";
import { MOSSE, MOSSE_BASE, Mossa, bloccoMossa, eseguiMossa } from "../src/data/mosse";

const INDOLI: Personalita[] = ["focosa", "paziente", "astuta", "nervosa"];
// 4000 (era 1000): alcune varianti pre-esistenti (es. concerto-campanacci) vivono a
// ~2pt dalla soglia già SENZA terreno — con 1000 duelli/indole il rumore Monte Carlo
// (Math.random non seedato) da solo basta a farle oscillare oltre soglia da una run
// all'altra. 4x campioni dimezza abbondantemente la deviazione standard (S16).
const N_DUELLI = 4000;

const media = (): Spintatore => ({
  name: "Media", breed: "Castana", massa: 55, presa: 55, volonta: 55, fiatoMax: 155,
  visual: { name: "Media", breed: "Castana", rarity: "Rara", realPhoto: null },
});

/** Politica del lato P: specchio delle guardie+pesi di prepareIntent (equità). */
function pickPlayer(st: SpintaState, pers: Personalita): AzioneId {
  const r = Math.random();
  if (st.fiatoP < 25) return r < 0.7 ? "incoraggia" : "reggi";
  if (st.calma < 28 && r < 0.6) return "incoraggia";
  if (st.stanceO === "reggi" && (pers === "astuta" || pers === "paziente") && r < 0.6) return "gira";
  if (st.barra < 28 && r < 0.5) return "incalza";
  const W: Record<Personalita, [number, number, number, number]> = {
    focosa: [0.62, 0.12, 0.18, 0.08],
    paziente: [0.22, 0.38, 0.20, 0.20],
    astuta: [0.30, 0.22, 0.38, 0.10],
    nervosa: [0.30, 0.25, 0.25, 0.20],
  };
  const w = W[pers];
  const x = Math.random();
  return x < w[0] ? "incalza" : x < w[0] + w[1] ? "reggi" : x < w[0] + w[1] + w[2] ? "gira" : "incoraggia";
}

/** Se la famiglia scelta ha una variante equipaggiata e giocabile, usala; se no base. */
function mossaPer(set: Record<AzioneId, string>, fam: AzioneId, st: SpintaState, side: "p" | "o"): string {
  const id = set[fam];
  const m = MOSSE[id];
  if (m && !bloccoMossa(m, st, side)) return id;
  return MOSSE_BASE[fam];
}

function duello(setP: Record<AzioneId, string>, indole: Personalita, terrain?: TerrainEffect): boolean {
  const P = media(), O = media();
  let st = initSpinta(P, O, { personalita: indole, tellAccuracy: 0.75, terrain });
  const setO = { ...MOSSE_BASE };
  for (let t = 0; t < MAX_TURNI * 2 + 4 && st.esito === "corso"; t++) {
    const famP = pickPlayer(st, indole);
    st = eseguiMossa("p", mossaPer(setP, famP, st, "p"), st, P, O, terrain).state;
    if (st.esito !== "corso") break;
    const famO = st.intentO ?? "incalza";
    st = eseguiMossa("o", mossaPer(setO, famO, st, "o"), st, O, P, terrain).state;
  }
  if (st.esito === "corso") {
    // non dovrebbe accadere (MAX_TURNI risolve), guardia di sicurezza
    return st.barra >= 50;
  }
  return st.esito === "vinto";
}

function winRate(setP: Record<AzioneId, string>, terrain?: TerrainEffect): number {
  let w = 0, n = 0;
  for (const indole of INDOLI) {
    for (let i = 0; i < N_DUELLI; i++) { if (duello(setP, indole, terrain)) w++; n++; }
  }
  return (100 * w) / n;
}

function soglia(m: Mossa): number { return m.rarita === "comune" || m.rarita === "rara" ? 8 : 15; }

// ── run ────────────────────────────────────────────────────────────────
const baseline = winRate({ ...MOSSE_BASE });
console.log(`Baseline (base vs base): ${baseline.toFixed(1)}%  su ${N_DUELLI * 4} duelli\n`);
console.log("variante".padEnd(26) + "famiglia".padEnd(12) + "rarità".padEnd(14) + "win%   Δ vs baseline   verdetto");

let fuori = 0;
const varianti = (Object.values(MOSSE) as Mossa[]).filter((m) => !Object.values(MOSSE_BASE).includes(m.id));
for (const m of varianti) {
  const set = { ...MOSSE_BASE, [m.famiglia]: m.id };
  const wr = winRate(set);
  const delta = wr - baseline;
  const limite = soglia(m);
  const ok = Math.abs(delta) <= limite;
  if (!ok) fuori++;
  console.log(
    m.id.padEnd(26) + m.famiglia.padEnd(12) + m.rarita.padEnd(14) +
    wr.toFixed(1).padStart(5) + "  " + (delta >= 0 ? "+" : "") + delta.toFixed(1).padStart(5) +
    `  (±${limite})  ` + (ok ? "OK" : "⚠️ FUORI SOGLIA"),
  );
}
console.log(`\n${fuori === 0 ? "✅ Tutte le mosse entro soglia." : `⚠️ ${fuori} mosse fuori soglia: ritoccare i numeri in data/mosse.ts.`}`);

// ── S16: dimensione TERRENO ──────────────────────────────────────────────
// Il terreno è SIMMETRICO (si applica a entrambi i lati): la baseline per
// terreno deve restare vicina al 50% (nessun vantaggio strutturale), e ogni
// combo terreno×variante deve restare entro la STESSA soglia ±8/±15 rispetto
// alla baseline DI QUEL TERRENO (non quella globale, per isolare l'effetto
// del terreno da quello della variante).
const TERRAINS: TerrainEffect[] = ["prato", "latte", "tempesta", "roccia", "corna"];
console.log("\n── Terreni (S16) ──────────────────────────────────────────────────────");
console.log("terreno".padEnd(12) + "base vs base win%   Δ vs baseline globale   verdetto");
let fuoriTerrainBase = 0;
const baselinePerTerrain: Record<TerrainEffect, number> = {} as Record<TerrainEffect, number>;
for (const terrain of TERRAINS) {
  const wr = winRate({ ...MOSSE_BASE }, terrain);
  baselinePerTerrain[terrain] = wr;
  const delta = wr - baseline;
  const ok = Math.abs(delta) <= 8; // terreno "neutro" di famiglia base: stessa soglia comune/rara
  if (!ok) fuoriTerrainBase++;
  console.log(
    terrain.padEnd(12) + wr.toFixed(1).padStart(11) + "        " + (delta >= 0 ? "+" : "") + delta.toFixed(1).padStart(5) +
    "  (±8)  " + (ok ? "OK" : "⚠️ FUORI SOGLIA"),
  );
}

console.log("\nterreno×variante".padEnd(30) + "famiglia".padEnd(12) + "win%   Δ vs baseline terreno   verdetto");
let fuoriTerrainCombo = 0;
for (const terrain of TERRAINS) {
  for (const m of varianti) {
    const set = { ...MOSSE_BASE, [m.famiglia]: m.id };
    const wr = winRate(set, terrain);
    const delta = wr - baselinePerTerrain[terrain];
    const limite = soglia(m);
    const ok = Math.abs(delta) <= limite;
    if (!ok) fuoriTerrainCombo++;
    console.log(
      `${terrain}×${m.id}`.padEnd(30) + m.famiglia.padEnd(12) +
      wr.toFixed(1).padStart(5) + "  " + (delta >= 0 ? "+" : "") + delta.toFixed(1).padStart(5) +
      `  (±${limite})  ` + (ok ? "OK" : "⚠️ FUORI SOGLIA"),
    );
  }
}
const fuoriTotale = fuori + fuoriTerrainBase + fuoriTerrainCombo;
console.log(`\n${fuoriTerrainBase === 0 && fuoriTerrainCombo === 0 ? "✅ Tutti i terreni e le combo terreno×mossa entro soglia." : `⚠️ ${fuoriTerrainBase} baseline-terreno + ${fuoriTerrainCombo} combo terreno×mossa fuori soglia: ritoccare TERRAIN_MODS in lib/spinta.ts.`}`);
process.exitCode = fuoriTotale === 0 ? 0 : 1;
