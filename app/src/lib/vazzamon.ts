import type { Rarita, Stats, Vazzamon } from "../data/types";

// ===== Pool culturali (dal server v2, lato client) =====
export const ECO_TIPS = [
  "Resta sul sentiero: calpestare i pascoli danneggia i fiori d'alpeggio necessari alle api.",
  "Riporta sempre a valle i rifiuti. Un pascolo pulito dona erba fresca alle nostre Reines.",
  "Chiudi i recinti dietro di te per non far disperdere le bovine nei canaloni.",
  "Non spaventare le mucche al pascolo: mantieni la distanza e rispetta la loro quiete.",
  "Acquista la Fontina DOP dai piccoli produttori per sostenere gli alpeggi.",
  "Se incontri cani da guardiania, allontanati lentamente e non urlare.",
  "Pulisci gli scarponi cambiando vallata per non propagare spore infestanti.",
];

const BREED_NAMES = [
  "Mont-Blanc Colossus", "Reina di Valsavarenche", "Fontina Champion", "Pianeta Alpeggio",
  "Corno d'Acciaio", "Grolla Warrior", "Castor e Pollux", "Mocetta Ranger",
  "Valdostana Suprema", "Gran Paradiso Sentinel", "Fulmine Alpino", "Brezza d'Alpe",
  "Dama Bianca", "Fior di Fontina", "Rugiada Bianca", "Spirito dei Ghiacciai",
];

const BREEDS: { razza: Vazzamon["razza"]; tipo: string }[] = [
  { razza: "Castana", tipo: "Forza" },
  { razza: "Pezzata Rossa", tipo: "Latte" },
  { razza: "Pezzata Nera", tipo: "Resistenza" },
  { razza: "Evolène", tipo: "Agilità" },
];

const LORE_POOL = [
  "Una mucca fiera e regale: si dice che le sue corna riflettano la luce dorata del tramonto sul Cervino.",
  "Campionessa delle Batailles de Reines, la sua sola presenza fa tremare d'ammirazione le vette.",
  "Sviluppa una forza formidabile nutrendosi di trifoglio alpino d'oro e acqua di ghiacciaio.",
  "Ha un legame ancestrale con la regione: scorta i trekker offrendo silenziosi incoraggiamenti.",
  "Le leggende narrano che custodisca il segreto della marinatura perfetta della Mocetta.",
  "Leggera tra i banchi di nebbia, sorprende i trekker pigri con simpatici baccani.",
];

const RARITY_BONUS: Record<Rarita, number> = {
  Comune: 0,
  "Non comune": 0.1,
  Rara: 0.2,
  Epica: 0.5,
  Leggendaria: 1.0,
};

const STELLE: Record<Rarita, number> = {
  Comune: 1,
  "Non comune": 2,
  Rara: 3,
  Epica: 4,
  Leggendaria: 5,
};

/** Combat Power dalla potenza (somma 4 stat) + bonus rarità. */
export function deriveCp(potenza: number, rarita: Rarita): number {
  return Math.round(potenza * 5 * (1 + RARITY_BONUS[rarita]));
}

/** Livello indicativo dalla rarità + potenza. */
export function deriveLevel(potenza: number, rarita: Rarita): number {
  return Math.max(1, Math.round(STELLE[rarita] * 4 + (potenza - 250) / 25));
}

/** rng deterministico semplice da un seed numerico. */
function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/**
 * Genera un Vazzamon procedurale (scanner IA / uovo / selvatico).
 * `seed` rende il risultato riproducibile; `rarita` opzionale forza la rarità.
 */
export function generaVazzamon(opts: {
  seed: number;
  origine: Vazzamon["origine"];
  rarita?: Rarita;
  lat: number;
  lng: number;
  imageUrl?: string;
  comune?: string;
}): Vazzamon {
  const r = rng(opts.seed);
  const breed = BREEDS[Math.floor(r() * BREEDS.length)];
  const nome = BREED_NAMES[Math.floor(r() * BREED_NAMES.length)];

  const rarityPool: Rarita[] = ["Comune", "Comune", "Rara", "Rara", "Epica", "Leggendaria"];
  const rarita = opts.rarita ?? rarityPool[Math.floor(r() * rarityPool.length)];
  const boost = rarita === "Leggendaria" ? 25 : rarita === "Epica" ? 15 : rarita === "Rara" ? 6 : 0;

  const stats: Stats = {
    stazza: Math.min(120, 60 + Math.floor(r() * 40) + boost),
    corna: Math.min(120, 45 + Math.floor(r() * 45) + boost),
    testa: Math.min(120, 45 + Math.floor(r() * 45) + boost),
    grinta: Math.min(120, 40 + Math.floor(r() * 50) + boost),
  };
  const potenza = stats.stazza + stats.corna + stats.testa + stats.grinta;

  return {
    id: `${opts.origine}-${opts.seed}-${Math.floor(r() * 100000)}`,
    nome,
    razza: breed.razza,
    tipo: breed.tipo,
    categoria: "—",
    rarita,
    stelle: STELLE[rarita],
    riconoscimento: opts.origine === "schiusa" ? "Schiusa da uovo" : "Generata dall'IA",
    comune: opts.comune ?? "Vetta alpina",
    allevatore: "—",
    matricola: "",
    peso_kg: 500 + Math.floor(r() * 250),
    peso_stimato: true,
    stats,
    potenza,
    foto: null,
    imageUrl: opts.imageUrl,
    descrizione: LORE_POOL[Math.floor(r() * LORE_POOL.length)],
    lat: opts.lat,
    lng: opts.lng,
    zona_tipo: "generata",
    origine: opts.origine,
    cp: deriveCp(potenza, rarita),
    level: deriveLevel(potenza, rarita),
    eco_tip: ECO_TIPS[Math.floor(r() * ECO_TIPS.length)],
    lore: LORE_POOL[Math.floor(r() * LORE_POOL.length)],
    customColor: ["#8a6d4b", "#2e5d34", "#6b7280", "#a855f7", "#e0a82e"][Math.floor(r() * 5)],
    capturedAt: undefined,
  };
}
