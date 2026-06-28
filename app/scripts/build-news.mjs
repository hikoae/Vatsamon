/**
 * build-news.mjs — aggregatore notizie SENZA backend.
 * Legge i feed RSS reali, filtra per parole chiave del mondo Batailles, e scrive
 * app/public/news_cache.json (solo titolo + estratto + link alla fonte: nessun
 * articolo/foto ri-ospitato). Eseguito da .github/workflows/news.yml su schedule.
 *
 * Robusto: se un feed è giù, lo salta; non sovrascrive con risultati vuoti.
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "news_cache.json");

const FEEDS = [
  { fonte: "AostaSera", url: "https://aostasera.it/notizie/societa/feed/" },
  { fonte: "AostaSera", url: "https://aostasera.it/feed/" },
  { fonte: "Gazzetta Matin", url: "https://www.gazzettamatin.com/feed/" },
];

// Solo termini specifici del mondo Batailles (evita falsi positivi tipo
// "valdostana"/"alpeggio" generici che catturano notizie non pertinenti).
const KEYWORDS = /bataille|\breines?\b|\breina\b|croix[- ]noire|moudzon|amis des reines|reine des reines/i;
const MAX_ITEMS = 12;

const strip = (s) => (s || "").replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, " ").trim();
const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? strip(m[1]) : "";
};
const isoDate = (d) => { const t = Date.parse(d); return Number.isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10); };
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, { headers: { "user-agent": "vatsamon-news/1.0" }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map((m) => m[0]);
    return items.map((b) => {
      const titolo = tag(b, "title");
      const url = tag(b, "link") || (b.match(/<link[^>]*>([^<]+)<\/link>/i)?.[1] ?? "").trim();
      const data = isoDate(tag(b, "pubDate"));
      const estratto = strip(tag(b, "description")).slice(0, 160);
      return { id: `${slug(feed.fonte)}-${slug(titolo)}`, titolo, fonte: feed.fonte, url, data, estratto };
    }).filter((it) => it.titolo && it.url);
  } catch {
    return [];
  }
}

const all = (await Promise.all(FEEDS.map(fetchFeed))).flat();
const filtered = all.filter((it) => KEYWORDS.test(`${it.titolo} ${it.estratto}`));

// dedup per url, ordina per data desc, taglia
const seen = new Set();
const items = filtered
  .filter((it) => (seen.has(it.url) ? false : (seen.add(it.url), true)))
  .sort((a, b) => (a.data < b.data ? 1 : -1))
  .slice(0, MAX_ITEMS);

if (items.length === 0) {
  console.log("Nessuna notizia pertinente trovata: mantengo il file esistente.");
  if (existsSync(OUT)) process.exit(0);
}

const payload = {
  generato: new Date().toISOString().slice(0, 10),
  fonte: "Aggregatore RSS (AostaSera, Gazzetta Matin) — solo titolo, estratto e link alla fonte.",
  items: items.length ? items : JSON.parse(readFileSync(OUT, "utf8")).items,
};
writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
console.log(`Scritte ${payload.items.length} notizie in ${OUT}`);
