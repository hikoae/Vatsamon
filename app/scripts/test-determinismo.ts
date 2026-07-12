/**
 * TEST-DETERMINISMO — verifica che il motore "la spinta" sia riproducibile
 * quando gli si passa un rng seedabile (mulberry32).
 *
 * Metodo: per N seed fissi, esegue la STESSA sequenza fissa di azioni (p/o)
 * due volte con due generatori mulberry32(seed) indipendenti (stesso seed,
 * istanze diverse — nessuno stato condiviso). Se il motore è deterministico,
 * gli stati finali delle due run devono essere deep-equal.
 *
 * Esecuzione:
 *   cd app && npx tsx scripts/test-determinismo.ts
 */
import {
  AzioneId, Spintatore, SpintaState, applyAzione, initSpinta, mulberry32,
} from "../src/lib/spinta";

const N_SEED = 50;

const spintatore = (name: string): Spintatore => ({
  name, breed: "Castana", massa: 55, presa: 55, volonta: 55, fiatoMax: 155,
  visual: { name, breed: "Castana", rarity: "Rara", realPhoto: null },
});

/** Sequenza fissa di azioni (side, azione): identica per ogni run, indipendente
 *  dall'esito — serve solo a esercitare tutti i rami RNG del motore (varia(),
 *  guardie di prepareIntent, tell veritiero/fuorviante, confusaP/O). */
const SEQUENZA: { side: "p" | "o"; azione: AzioneId }[] = [
  { side: "p", azione: "incalza" }, { side: "o", azione: "reggi" },
  { side: "p", azione: "gira" },    { side: "o", azione: "incalza" },
  { side: "p", azione: "reggi" },   { side: "o", azione: "gira" },
  { side: "p", azione: "incoraggia" }, { side: "o", azione: "incoraggia" },
  { side: "p", azione: "incalza" }, { side: "o", azione: "incalza" },
  { side: "p", azione: "gira" },    { side: "o", azione: "reggi" },
  { side: "p", azione: "incoraggia" }, { side: "o", azione: "gira" },
  { side: "p", azione: "incalza" }, { side: "o", azione: "incoraggia" },
  { side: "p", azione: "reggi" },   { side: "o", azione: "incalza" },
  { side: "p", azione: "gira" },    { side: "o", azione: "reggi" },
];

/** Esegue la sequenza fissa con un dato rng e ritorna lo stato finale
 *  (esclusa la funzione `rng` stessa: due closure diverse non sono mai
 *  reference-equal anche a parità di comportamento). */
function run(seed: number): Omit<SpintaState, "rng"> {
  const rng = mulberry32(seed);
  const P = spintatore("P"), O = spintatore("O");
  let st = initSpinta(P, O, { personalita: "focosa", tellAccuracy: 0.75, rng });
  for (const { side, azione } of SEQUENZA) {
    const A = side === "p" ? P : O;
    const B = side === "p" ? O : P;
    st = applyAzione(side, azione, st, A, B).state;
  }
  const { rng: _omit, ...rest } = st;
  return rest;
}

let fallite = 0;
for (let seed = 1; seed <= N_SEED; seed++) {
  const run1 = run(seed);
  const run2 = run(seed);
  const s1 = JSON.stringify(run1);
  const s2 = JSON.stringify(run2);
  if (s1 !== s2) {
    fallite++;
    console.log(`❌ seed ${seed}: stati finali NON deep-equal`);
    console.log(`   run1: ${s1}`);
    console.log(`   run2: ${s2}`);
  }
}

// Sanity check inversa: seed diversi devono (quasi sempre) produrre stati
// diversi — se collassassero tutti sullo stesso risultato, rng non starebbe
// davvero pilotando il motore (falso positivo del test sopra).
const distinti = new Set(
  Array.from({ length: N_SEED }, (_, i) => JSON.stringify(run(i + 1))),
);

console.log(`\nSeed testati: ${N_SEED}`);
console.log(`Determinismo (stesso seed → stesso stato finale): ${fallite === 0 ? "✅ PASS" : `❌ FAIL (${fallite}/${N_SEED})`}`);
console.log(`Varietà (seed diversi → stati diversi): ${distinti.size > 1 ? `✅ PASS (${distinti.size}/${N_SEED} stati unici)` : "❌ FAIL (tutti i seed collassano sullo stesso stato)"}`);

process.exitCode = fallite === 0 && distinti.size > 1 ? 0 : 1;
