import { Vatsamon } from "../types";

/**
 * Generazione CLIENT del Vatsamon (sostituisce il server /api/generate-vatsamon).
 * Build statica, niente rete: stesso schema di risposta del server v2.
 */

const AUTUMN_BREEDS = [
  "Castana Valdostana",
  "Pezzata Rossa",
  "Pezzata Nera",
  "Evolène",
];

const FUN_COW_NAMES = [
  "Mont-Blanc Colossus", "Reina di Valsavarenche", "Fontina Champion", "Pianeta Alpeggio",
  "Corno d'Acciaio", "Grolla Warrior", "Castor e Pollux", "Mocetta Ranger",
  "Valdostana Suprema", "Gran Paradiso Sentinel", "Mamma Fontina", "Trekking Boss",
  "Fulmine Alpino", "Brezza d'Alpe", "Dama Bianca", "Fior di Fontina",
];

const ECO_TIPS = [
  "Rispetta i sentieri segnalati per proteggere i pascoli alpini dal calpestio.",
  "Riporta sempre a valle i tuoi rifiuti: un pascolo pulito dona erba fresca alle Reines.",
  "Chiedi il permesso prima di entrare nelle stalle e rispetta il silenzio dei boschi.",
  "Non spaventare le mucche: mantieni una distanza di sicurezza per la loro quiete.",
  "Acquista la Fontina DOP dai piccoli produttori per sostenere gli alpeggi.",
];

const LORE_SNIPPETS = [
  "Una mucca fiera e regale: le sue corna riflettono la luce dorata del tramonto sul Cervino.",
  "Campionessa indiscussa delle Batailles de Reines, fa tremare d'ammirazione le vette.",
  "Sviluppa una forza formidabile nutrendosi di trifoglio alpino d'oro e acqua di ghiacciaio.",
  "Ha un legame ancestrale con la regione: scorta i trekker con silenziosi incoraggiamenti.",
  "Le leggende narrano che custodisca il segreto della marinatura perfetta della Mocetta.",
];

function rnd<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function simulate(): Omit<Vatsamon, "cp" | "level"> {
  const breed = rnd(AUTUMN_BREEDS);
  const name = rnd(FUN_COW_NAMES);
  const rarityPool: Vatsamon["rarity"][] = ["Comune", "Comune", "Rara", "Rara", "Epica", "Leggendaria"];
  const rarity = rnd(rarityPool);

  let st = 30 + Math.floor(Math.random() * 40);
  let df = 35 + Math.floor(Math.random() * 45);
  let ag = 20 + Math.floor(Math.random() * 50);
  if (rarity === "Leggendaria") { st += 25; df += 20; ag += 15; }
  else if (rarity === "Epica") { st += 15; df += 15; ag += 10; }

  return {
    id: "gen-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    breed,
    name,
    stats: { strength: Math.min(st, 100), defense: Math.min(df, 100), agility: Math.min(ag, 100) },
    rarity,
    eco_tip: rnd(ECO_TIPS),
    lore: rnd(LORE_SNIPPETS),
    capturedAt: new Date().toISOString(),
  };
}

/** Stessa firma di una risposta del server, ma calcolata in locale. */
export async function generateVatsamonClient(
  imageBase64: string | null,
  _isDemo = false,
): Promise<Vatsamon> {
  // piccola latenza per far percepire l'analisi
  await new Promise((r) => setTimeout(r, 400));
  const base = simulate();
  const cp = 0; // calcolato dal chiamante
  return { ...base, imageUrl: imageBase64 ?? undefined, cp, level: 15 } as Vatsamon;
}
