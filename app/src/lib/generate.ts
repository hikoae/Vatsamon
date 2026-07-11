import { Vatsamon } from "../types";
import { resolveIllustration } from "../data/illustrations";
import { faseCorrente } from "../data/fase";
import { faseGaraCorrente, categoriaAllaPesa } from "../data/pesa";

/**
 * RICONOSCIMENTO D'ALPEGGIO (client, niente rete) — sostituisce il vecchio
 * "DNA scanner" sci-fi. Genera un AVVISTAMENTO onesto e coerente col mondo
 * Batailles: razze da combattimento corrette (Castana / Pezzata Nera / Hérens,
 * MAI Pezzata Rossa che è da latte), nomi patois reali, 4 statistiche reali
 * (stazza/corna/testa/grinta) e categoria di peso. È dichiarato come
 * avvistamento (isReal:false), non spacciato per Reina ufficiale.
 */

const COMBAT_BREEDS = ["Castana", "Pezzata Nera", "Hérens"];

const PATOIS_NAMES = [
  "Caprice", "Malice", "Vipère", "Briganda", "Guerra", "Victoire", "Papillon", "Baronne",
  "Amoureuse", "Gitane", "Strega", "Difesa", "Revenge", "Bambola", "Reinette", "Sauvage",
  "Tempête", "Étoile", "Rebelle", "Mésange", "Bergère", "Fleur", "Moureun", "Peloria",
];

const ECO_TIPS = [
  "Rispetta i sentieri segnalati per proteggere i pascoli alpini dal calpestio.",
  "Riporta sempre a valle i tuoi rifiuti: un pascolo pulito dona erba fresca alle Reines.",
  "Mantieni la distanza: avvicìnati con calma, l'allevatore conduce ma non forza.",
  "Acquista la Fontina DOP dai piccoli produttori per sostenere gli alpeggi.",
];

function rnd<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(n: number) { return Math.max(10, Math.min(100, Math.round(n))); }

function simulate(): Omit<Vatsamon, "cp" | "level"> {
  const breed = rnd(COMBAT_BREEDS);
  const name = rnd(PATOIS_NAMES);
  // gli avvistamenti sono per lo più "comuni": le Reines ufficiali si verificano alle gare.
  const rarityPool: Vatsamon["rarity"][] = ["Comune", "Comune", "Comune", "Rara", "Rara", "Epica"];
  const rarity = rnd(rarityPool);

  // 4 statistiche reali
  const stazza = 50 + Math.floor(Math.random() * 40);
  const corna = 45 + Math.floor(Math.random() * 45);
  const testa = 45 + Math.floor(Math.random() * 40);
  const grinta = 45 + Math.floor(Math.random() * 45);
  // peso e categoria di peso coerenti — con le soglie DELLA FASE CORRENTE
  // (dossier §0.3: le soglie non sono fisse, salgono di fase in fase)
  const peso_kg = 480 + Math.floor(Math.random() * 180); // ~480–660 kg
  const oggi = new Date().toISOString().slice(0, 10);
  const categoria = categoriaAllaPesa(peso_kg, faseGaraCorrente(faseCorrente(oggi).id)).cat;

  return {
    id: "avvist-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    breed,
    name,
    stats: { strength: clamp(corna), defense: clamp(testa), agility: clamp(grinta) },
    rarity,
    eco_tip: rnd(ECO_TIPS),
    lore: `Avvistamento d'alpeggio: una ${breed} dal carattere deciso, incrociata sui pascoli. Verifica alle gare per la scheda anagrafe ufficiale.`,
    capturedAt: new Date().toISOString(),
    isReal: false,
    realPhoto: null,
    stats4: { stazza, corna, testa, grinta },
    potenza: stazza + corna + testa + grinta,
    peso_kg,
    categoria,
    riconoscimento: "Avvistamento d'alpeggio",
    illustration: resolveIllustration(name, breed),
  };
}

/** Stessa firma del vecchio handler, ma produce un avvistamento coerente. */
export async function generateVatsamonClient(
  imageBase64: string | null,
  _isDemo = false,
): Promise<Vatsamon> {
  await new Promise((r) => setTimeout(r, 400)); // breve latenza percepita
  const base = simulate();
  return { ...base, imageUrl: imageBase64 ?? undefined, cp: 0, level: 8 } as Vatsamon;
}
