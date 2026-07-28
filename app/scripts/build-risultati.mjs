/**
 * build-risultati.mjs — pre-compilazione risultati Batailles (G5), SENZA backend.
 *
 * Per ogni tappa PASSATA (data <= oggi) del calendario reale (fonte unica:
 * data/season.ts, CALENDAR — parsata via regex qui sotto per non duplicare
 * il dato altrove), prova a leggere il risultato pubblicato sul sito
 * ufficiale amisdesreines.it (WP REST API, custom post type "gara"). Il
 * contenuto del post è un tabellone bracket HTML per le 3 categorie: la
 * vincitrice di ogni categoria è l'unica bovina rimasta nell'ULTIMA colonna
 * del tabellone (i turni sono colonne annidate, non righe).
 *
 * Latenza di pubblicazione reale sul sito: da +1 a +15 giorni dopo la tappa,
 * a volte mai. Questo output è SEMPRE e SOLO una pre-compilazione
 * (`confidence: "ufficiale-web"` = letto dal sito ufficiale, MAI confermato
 * da un admin) — non è mai un sostituto del dato confermato su Firestore
 * (`risultati/{eventId}`, vedi src/lib/risultati.ts): l'admin conferma con
 * un tap nel form (RisultatiAdmin) prima che conti per pronostici/premi.
 *
 * Robusto: un fetch/parsing fallito per una tappa NON cancella un risultato
 * già in cache da un run precedente (skip + log, mai svuotare dati buoni).
 * Idempotente: se il contenuto risolto (a parità di eventId) non cambia
 * rispetto al file esistente, il file non viene riscritto (e il vecchio
 * `fetchedAt` di quell'evento viene preservato).
 *
 * Eseguito da .github/workflows/risultati.yml su cron + on-demand.
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "risultati_cache.json");
const SEASON_SRC = join(__dirname, "..", "src", "data", "season.ts");

const WP_BASE = "https://www.amisdesreines.it/wp-json/wp/v2/gara";
const UA = { "user-agent": "vatsamon-risultati/1.0" };
const FETCH_TIMEOUT = 15000;

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const GIORNI = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];

// Stessi feed di build-news.mjs (solo AostaSera, per i pressHints — niente
// estrazione nomi qui, solo link agli articoli che parlano della tappa).
const NEWS_FEEDS = [
  { url: "https://aostasera.it/notizie/societa/feed/" },
  { url: "https://aostasera.it/feed/" },
];
const NEWS_KEYWORDS = /bataille|\breines?\b|\breina\b|croix[- ]noire|moudzon|amis des reines|reine des reines/i;

const strip = (s) => (s || "").replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, " ").trim();
const tagRss = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? strip(m[1]) : "";
};
const isoDate = (d) => { const t = Date.parse(d); return Number.isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10); };

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Legge le tappe "bataille" dal CALENDAR di data/season.ts senza duplicarne
 * i dati altrove: parsing per-riga (il file scrive un evento per riga — se
 * il formato cambia, il regex semplicemente non estrae nulla per quella
 * riga: fail loud via array vuoto, mai un crash silenzioso su dati sbagliati).
 */
function parseCalendarEvents() {
  const src = readFileSync(SEASON_SRC, "utf8");
  const block = src.match(/CALENDAR:\s*SeasonEvent\[\]\s*=\s*\[([\s\S]*?)\n\];/);
  if (!block) throw new Error("CALENDAR non trovato in data/season.ts — formato del file cambiato?");
  const events = [];
  for (const line of block[1].split("\n")) {
    if (!/\bkind:\s*"bataille"/.test(line)) continue;
    const id = line.match(/\bid:\s*"([^"]+)"/)?.[1];
    const data = line.match(/\bdata:\s*"([^"]+)"/)?.[1];
    const comune = line.match(/\bcomune:\s*"([^"]+)"/)?.[1];
    const finale = /\bfinale:\s*true\b/.test(line);
    if (id && data && comune) events.push({ id, data, comune, finale });
  }
  return events;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(FETCH_TIMEOUT) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Slug prevedibili per una tappa. Il giorno della settimana NON è indovinato:
 * è calcolato dalla data (es. Saint-Marcel 2026-04-06 è lunedì di Pasquetta —
 * il calcolo lo scopre da solo, senza bisogno di un caso speciale). Provo sia
 * il giorno con zero iniziale (formato usato dal sito per la stagione 2026,
 * es. "06-aprile") sia senza, per compatibilità con stagioni precedenti. */
function slugCandidates(ev) {
  const [y, mo, d] = ev.data.split("-").map(Number);
  const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  const giorno = GIORNI[dow];
  const mese = MESI[mo - 1];
  const dayPad = String(d).padStart(2, "0");
  if (ev.finale) {
    return [...new Set([
      `finale-regionale-${giorno}-${dayPad}-${mese}-${y}`,
      `finale-regionale-${giorno}-${d}-${mese}-${y}`,
    ])];
  }
  const comune = slugify(ev.comune);
  return [...new Set([
    `eliminatoria-di-${comune}-${giorno}-${dayPad}-${mese}-${y}`,
    `eliminatoria-di-${comune}-${giorno}-${d}-${mese}-${y}`,
  ])];
}

function parseDateFromText(text) {
  const m = text.match(/(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i);
  if (!m) return null;
  const monthIdx = MESI.indexOf(m[2].toLowerCase());
  if (monthIdx < 0) return null;
  return `${m[3]}-${String(monthIdx + 1).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
}

/**
 * Trova il post "gara" di una tappa: prova prima gli slug prevedibili, poi
 * in fallback una search per comune con match sulla data nel titolo. Il
 * fallback copre i casi in cui il sito accoppia due nomi di comune nello
 * slug (es. tappe future "avise-vertosan", "doues-champillon") — non
 * deducibili dal solo campo `comune` del calendario.
 */
async function findGaraPost(ev) {
  for (const slug of slugCandidates(ev)) {
    try {
      const json = await fetchJson(`${WP_BASE}?slug=${slug}`);
      if (Array.isArray(json) && json.length) return { post: json[0], method: `slug:${slug}` };
    } catch (err) {
      console.warn(`[risultati] ${ev.id}: slug "${slug}" fallito — ${err.message}`);
    }
  }
  try {
    const token = slugify(ev.comune).split("-")[0];
    const json = await fetchJson(`${WP_BASE}?search=${encodeURIComponent(token)}&per_page=10`);
    if (Array.isArray(json)) {
      const match = json.find((p) => parseDateFromText(strip(p.title?.rendered ?? "")) === ev.data);
      if (match) return { post: match, method: `search:${token}` };
    }
  } catch (err) {
    console.warn(`[risultati] ${ev.id}: search fallback fallita — ${err.message}`);
  }
  return null;
}

const CATS = [
  { re: /prima/i, field: "cat1" },
  { re: /second/i, field: "cat2" },
  { re: /terza/i, field: "cat3" },
];

/**
 * Estrae le colonne di primo livello di un tabellone bracket: ogni colonna è
 * un <td style="vertical-align: top;"> che contiene una tabella annidata con
 * le bovine ancora in gara in quel turno. Scansione a profondità (nessuna
 * libreria HTML): i <td> annidati dentro una colonna hanno sempre
 * "vertical-align: middle" nel markup del sito, mai "top" — questo distingue
 * in modo affidabile una colonna-turno da una riga-bovina al suo interno.
 */
function extractTopColumns(html) {
  const tokenRe = /<td\b([^>]*)>|<\/td>/gi;
  let depth = 0;
  let capturing = false;
  let start = -1;
  const cols = [];
  let m;
  while ((m = tokenRe.exec(html))) {
    const isOpen = m[0][1] !== "/";
    if (isOpen) {
      if (depth === 0 && /vertical-align:\s*top/i.test(m[1] || "")) {
        capturing = true;
        start = tokenRe.lastIndex;
      }
      depth++;
    } else {
      depth--;
      if (depth === 0 && capturing) {
        cols.push(html.slice(start, m.index));
        capturing = false;
      }
    }
  }
  return cols;
}

/** Decodifica le entity HTML più comuni nei nomi (es. "Negro&#8217;" →
 * "Negro'" — il sito le usa per apostrofi/accenti dentro i nomi bovine). */
function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function winnerFromCell(cell) {
  const m = cell.match(/<b>([^<]+)<\/b>/);
  return m ? decodeEntities(m[1].trim()) : null;
}

/** Vincitrice per categoria: l'unica bovina rimasta nell'ultima colonna del
 * tabellone di quella categoria (Prima/Seconda/Terza → cat1/cat2/cat3). */
function parseBracket(html) {
  const out = {};
  const sections = html.split(/<h2[^>]*>/i).slice(1);
  for (const section of sections) {
    const headerEnd = section.indexOf("</h2>");
    if (headerEnd < 0) continue;
    const header = section.slice(0, headerEnd);
    const cat = CATS.find((c) => c.re.test(header));
    if (!cat) continue;
    const cols = extractTopColumns(section.slice(headerEnd));
    const last = cols[cols.length - 1];
    const nome = last ? winnerFromCell(last) : null;
    if (nome) out[cat.field] = { nome };
  }
  return out;
}

async function fetchNewsItems() {
  const all = [];
  for (const feed of NEWS_FEEDS) {
    try {
      const res = await fetch(feed.url, { headers: UA, signal: AbortSignal.timeout(FETCH_TIMEOUT) });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map((mm) => mm[0]);
      for (const b of items) {
        const titolo = tagRss(b, "title");
        const url = tagRss(b, "link") || (b.match(/<link[^>]*>([^<]+)<\/link>/i)?.[1] ?? "").trim();
        const data = isoDate(tagRss(b, "pubDate"));
        const estratto = strip(tagRss(b, "description"));
        if (titolo && url) all.push({ titolo, url, data, estratto });
      }
    } catch (err) {
      console.warn(`[risultati] feed news ${feed.url} fallito — ${err.message}`);
    }
  }
  return all;
}

/** Articoli del feed AostaSera che parlano (con buona probabilità) di questa
 * tappa: match su keyword del mondo Batailles o sul comune, entro 15 giorni
 * dalla data della tappa (copre pre-articoli e cronache post-gara). Solo
 * link — nessuna estrazione di nomi/vincitrici da qui (V1 senza LLM). */
function pressHintsFor(ev, newsItems) {
  const evTime = Date.parse(ev.data);
  const token = slugify(ev.comune).split("-")[0];
  const hits = newsItems.filter((it) => {
    const text = `${it.titolo} ${it.estratto}`.toLowerCase();
    const relevant = NEWS_KEYWORDS.test(text) || text.includes(token);
    if (!relevant) return false;
    if (!it.data) return NEWS_KEYWORDS.test(text); // niente data nel feed: accetta solo se il testo è già inequivocabile
    return Math.abs(Date.parse(it.data) - evTime) / 86400000 <= 15;
  });
  return [...new Set(hits.map((it) => it.url))];
}

// ---------------------------------------------------------------------------

const todayISO = new Date().toISOString().slice(0, 10);
const events = parseCalendarEvents();
const passate = events.filter((e) => e.data <= todayISO);

const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { generatedAt: "", results: {}, pressHints: {} };
const results = { ...prev.results };

console.log(`Tappe totali nel calendario: ${events.length}. Passate (data <= ${todayISO}): ${passate.length}.`);

for (const ev of passate) {
  try {
    const found = await findGaraPost(ev);
    if (!found) {
      console.log(`[risultati] ${ev.id} (${ev.comune}, ${ev.data}): nessun post trovato su amisdesreines.it — non ancora pubblicato o slug non previsto. Cache invariata per questo evento.`);
      continue;
    }
    const html = found.post.content?.rendered ?? "";
    const parsed = parseBracket(html);
    if (!parsed.cat1 && !parsed.cat2 && !parsed.cat3) {
      console.log(`[risultati] ${ev.id}: post trovato (${found.method}, ${found.post.link}) ma nessuna categoria estratta dal tabellone — pagina probabilmente non ancora compilata. Cache invariata.`);
      continue;
    }
    const prevEntry = prev.results[ev.id];
    const prevComparable = prevEntry ? JSON.stringify({ cat1: prevEntry.cat1, cat2: prevEntry.cat2, cat3: prevEntry.cat3, sourceUrl: prevEntry.sourceUrl }) : null;
    const nextComparable = JSON.stringify({ cat1: parsed.cat1, cat2: parsed.cat2, cat3: parsed.cat3, sourceUrl: found.post.link });
    const unchanged = prevComparable === nextComparable;
    results[ev.id] = {
      ...parsed,
      confidence: "ufficiale-web",
      sourceUrl: found.post.link,
      fetchedAt: unchanged ? prevEntry.fetchedAt : new Date().toISOString(),
    };
    const riepilogo = ["cat1", "cat2", "cat3"].map((f) => (parsed[f] ? `${f}=${parsed[f].nome}` : `${f}=?`)).join(", ");
    console.log(`[risultati] ${ev.id} (${ev.comune}, ${ev.data}): OK via ${found.method} — ${riepilogo}`);
  } catch (err) {
    console.warn(`[risultati] ${ev.id}: errore inatteso, salto (cache invariata per questo evento) — ${err.message}`);
  }
}

const newsItems = await fetchNewsItems();
const pressHints = { ...prev.pressHints };
if (newsItems.length) {
  for (const ev of passate) {
    const hints = pressHintsFor(ev, newsItems);
    if (hints.length) pressHints[ev.id] = hints;
  }
  console.log(`Press hints calcolati da ${newsItems.length} articoli del feed.`);
} else {
  console.log("[risultati] feed news AostaSera non disponibile in questo run — pressHints precedenti mantenuti invariati.");
}

const results_and_hints_now = JSON.stringify({ results, pressHints });
const results_and_hints_prev = JSON.stringify({ results: prev.results, pressHints: prev.pressHints });

if (existsSync(OUT) && results_and_hints_now === results_and_hints_prev) {
  console.log("Nessuna variazione nei risultati rispetto alla cache esistente: file non riscritto.");
} else {
  const payload = { generatedAt: new Date().toISOString(), results, pressHints };
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(`Scritto ${OUT} — ${Object.keys(results).length} eventi con risultato, ${Object.keys(pressHints).length} con press hints.`);
}
