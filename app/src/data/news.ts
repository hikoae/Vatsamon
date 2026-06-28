/**
 * NOTIZIE — loader del feed aggregato. Nessun backend: un GitHub Action genera
 * `public/news_cache.json` (vedi .github/workflows/news.yml + scripts/build-news.mjs)
 * leggendo gli RSS reali e filtrando per "reines/bataille". L'app lo fetcha a
 * runtime (stessa origine, cache PWA) con fallback a un seed minimo offline.
 */

export interface NewsItem {
  id: string;
  titolo: string;
  fonte: string;
  url: string;
  data: string; // ISO
  estratto?: string;
}

const BASE = import.meta.env.BASE_URL;

/** Seed minimo: garantisce contenuto anche offline / se il fetch fallisce. */
export const NEWS_SEED: NewsItem[] = [
  {
    id: "seed-finale",
    titolo: "Finale regionale 2026: domenica 25 ottobre alla Croix-Noire",
    fonte: "Amis des Batailles de Reines",
    url: "https://www.amisdesreines.it/calendario-gare/",
    data: "2026-01-20",
    estratto: "La 69ª finale incorona le tre Reines des Reines della Valle d'Aosta.",
  },
];

/** Carica le notizie aggregate; ordina per data discendente. Mai lancia. */
export async function loadNews(): Promise<{ items: NewsItem[]; generato?: string }> {
  try {
    const res = await fetch(`${BASE}news_cache.json`, { cache: "no-cache" });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { items?: NewsItem[]; generato?: string };
    const items = (data.items ?? []).slice().sort((a, b) => (a.data < b.data ? 1 : -1));
    return { items: items.length ? items : NEWS_SEED, generato: data.generato };
  } catch {
    return { items: NEWS_SEED };
  }
}
