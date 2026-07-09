import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const APP_URL = process.env.URL ?? "http://localhost:5173/";
const OUT = "/tmp/vatsamon-shots";
mkdirSync(OUT, { recursive: true });

const data = JSON.parse(readFileSync(new URL("../src/data/vatsadex.json", import.meta.url)));
const target = data.bovine[0];

// PNG 1x1 per simulare un upload allo scanner
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const TABS = ["Alpeggio", "Scatta", "Stalla", "Libretto"];
const problems = [];
const note = (m) => console.log("  • " + m);

async function clickTab(page, label) {
  await page.locator("nav button", { hasText: label }).first().click();
  await page.waitForTimeout(500);
}

const vp = { name: "desktop", width: 1280, height: 900 };
console.log(`\n=== ${vp.name} ===`);
const browser = await chromium.launch({ executablePath: process.env.PW_EXEC || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({
  viewport: { width: vp.width, height: vp.height },
  permissions: ["geolocation"],
  // Vicino a un combattente sulla mappa (Pastore Marco Alpino · Valnontey),
  // così il pannello "Sfide nei dintorni" ha una sfida in raggio.
  geolocation: { latitude: 45.5971, longitude: 7.3185 },
});
const page = await ctx.newPage();
const errors = [];
// Le tile OSM non sono raggiungibili nella sandbox: ERR_CONNECTION_CLOSED /
// tile mancanti sono rumore ambientale, non errori dell'app. Li ignoriamo.
const isEnvNoise = (t) => /ERR_CONNECTION_CLOSED|ERR_NETWORK|Failed to load resource|tile\.openstreetmap|tile\.|favicon/i.test(t);
page.on("console", (m) => m.type() === "error" && !isEnvNoise(m.text()) && errors.push(m.text()));
page.on("pageerror", (e) => !isEnvNoise(e.message) && errors.push("PAGEERROR: " + e.message));

// In modalità locale i nuovi utenti vedono l'onboarding: per testare il gioco
// pre-segniamo lo storage come "onboardato" così App si carica direttamente.
await page.addInitScript(() => {
  localStorage.setItem("vatsamon_onboarded", JSON.stringify({ verify: true }));
});

await page.goto(APP_URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// header + tab
const header = await page.locator("header", { hasText: "VATSAMON" }).isVisible().catch(() => false);
const nNav = await page.locator("nav button").count();
note(`header VATSAMON GO: ${header} · tab: ${nNav}`);
if (!header) problems.push("header assente");
if (nNav < 5) problems.push(`nav ha ${nNav} tab`);

// mappa: bovine reali (con fog-of-war: marker reali + nebbia condividono la classe) + player
await page.waitForTimeout(800);
const reali = await page.locator(".cow-real-marker").count();
const player = await page.locator("text=🧑‍🌾").count();
note(`marker bovine reali (rivelate+nebbia): ${reali} · player: ${player}`);
if (reali < 10) problems.push(`poche bovine reali sulla mappa (${reali})`);
await page.screenshot({ path: `${OUT}/v2int-1-mappa.png` });

// Sentieri reali: seleziona un sentiero → pannello con consigli responsabili
const trailChip = page.locator("#trail-selector button", { hasText: "Val Ferret" }).first();
if (await trailChip.count()) {
  await trailChip.click();
  await page.waitForTimeout(700);
  const panel = await page.locator("#trail-panel").isVisible().catch(() => false);
  const tips = await page.locator("#trail-panel li").count();
  note(`sentiero selezionato · pannello: ${panel} · tips: ${tips}`);
  if (!panel) problems.push("pannello sentiero non compare");
  if (tips < 3) problems.push(`pochi consigli responsabili (${tips})`);
  await page.screenshot({ path: `${OUT}/v2int-1b-trail.png` });
  // torna a esplora libera per non alterare i check successivi
  await page.locator("#trail-selector button", { hasText: "Esplora libera" }).first().click();
  await page.waitForTimeout(400);
} else problems.push("selettore sentieri assente");

// GPS: qualità del segnale, guida del percorso, checkpoint e stop senza persistenza.
await page.locator("#gps-btn").click();
await page.waitForTimeout(1200);
const gpsActive = await page.locator('#gps-btn[aria-pressed="true"]').isVisible().catch(() => false);
const gpsPanel = await page.locator("#gps-explorer-panel").isVisible().catch(() => false);
const gpsQuality = await page.locator("#gps-explorer-panel", { hasText: /(Posizione precisa|Segnale buono|Segnale approssimato)/ }).isVisible().catch(() => false);
note(`GPS attivo: ${gpsActive} · guida: ${gpsPanel} · qualità: ${gpsQuality}`);
if (!gpsActive) problems.push("GPS non si attiva");
if (!gpsPanel || !gpsQuality) problems.push("pannello GPS con qualità del segnale assente");

// L'arrivo è disponibile vicino alla tappa, resta segnato localmente e non
// conserva coordinate. Un secondo contesto GPS, lontano dal tracciato, verifica
// che lo stesso controllo impedisca i timbri fuori raggio.
const checkpoint = page.locator("#gps-checkpoint-btn");
const checkpointReady = await checkpoint.isEnabled().catch(() => false);
note(`checkpoint vicino disponibile: ${checkpointReady}`);
if (!checkpointReady) problems.push("checkpoint GPS non disponibile in prossimità");
if (checkpointReady) {
  await checkpoint.click();
  await page.waitForTimeout(350);
  const stamped = await page.locator("#gps-checkpoint-btn", { hasText: "Timbro già registrato" }).isVisible().catch(() => false);
  note(`checkpoint timbrato: ${stamped}`);
  if (!stamped) problems.push("timbro checkpoint GPS non confermato");
}

await page.locator("#gps-btn").click();
await page.waitForTimeout(300);
const gpsStopped = await page.locator('#gps-btn[aria-pressed="false"]').isVisible().catch(() => false);
note(`GPS arrestato e posizione solo in memoria: ${gpsStopped}`);
if (!gpsStopped) problems.push("GPS non si arresta in modo esplicito");

const farCtx = await browser.newContext({
  viewport: { width: vp.width, height: vp.height },
  permissions: ["geolocation"],
  geolocation: { latitude: 45.5800, longitude: 7.3600 },
});
const farPage = await farCtx.newPage();
await farPage.addInitScript(() => {
  localStorage.setItem("vatsamon_onboarded", JSON.stringify({ verify: true }));
});
await farPage.goto(APP_URL, { waitUntil: "domcontentloaded" });
await farPage.waitForTimeout(700);
await farPage.locator("#gps-btn").click();
await farPage.waitForTimeout(800);
const checkpointBlocked = await farPage.locator("#gps-checkpoint-btn").isDisabled().catch(() => true);
const offRoute = await farPage.locator("#gps-explorer-panel", { hasText: "Fuori dal tracciato" }).isVisible().catch(() => false);
note(`checkpoint lontano bloccato: ${checkpointBlocked} · avviso fuori percorso: ${offRoute}`);
if (!checkpointBlocked || !offRoute) problems.push("GPS non blocca il checkpoint fuori percorso");
await farCtx.close();
await page.screenshot({ path: `${OUT}/v2int-2-gps.png` });

// giro tab
for (const t of TABS) {
  await clickTab(page, t);
  const ok = await page.locator("h2, h1").first().isVisible().catch(() => false);
  note(`tab ${t}: ${ok}`);
}

// Vatsadex: card catalogo reali X/73
await clickTab(page, "Libretto");
const cat = await page.locator("text=/Reines reali:\\s*\\d+\\/73/").isVisible().catch(() => false);
note(`catalogo reali X/73: ${cat}`);
if (!cat) problems.push("manca la card catalogo reali X/73");
await page.screenshot({ path: `${OUT}/v2int-3-dex.png` });

// Premi/Giro di Stalla: raggiungibile dal chip nell'HUD
await page.locator("#premi-chip").click();
await page.waitForTimeout(400);
const premiOpen = await page.locator("#premi-view").isVisible().catch(() => false);
note(`vista Premi dal chip HUD: ${premiOpen}`);
if (!premiOpen) problems.push("il chip Premi nell'HUD non apre la vista");

// Quiz "Scuola d'Alpeggio": ingresso dalla Stagione, poi flusso fino al risultato
await clickTab(page, "Stagione");
await page.locator("#quiz-entry").click();
await page.waitForTimeout(400);
let quizGuard = 0;
while (quizGuard++ < 15) {
  const finished = await page.locator("text=Scuola d'Alpeggio completata").isVisible().catch(() => false);
  if (finished) break;
  // scegli un'opzione (la prima disponibile) poi avanza
  await page.locator("#quiz-tab-view button.text-left").first().click().catch(() => {});
  await page.waitForTimeout(150);
  const nextBtn = page.locator("#quiz-next-btn");
  if (await nextBtn.isVisible().catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(150);
  }
}
const quizDone = await page.locator("text=Scuola d'Alpeggio completata").isVisible().catch(() => false);
note(`quiz completato: ${quizDone}`);
if (!quizDone) problems.push("quiz non arriva al risultato");
await page.screenshot({ path: `${OUT}/v2int-6-quiz.png` });

// Scatta la Reina → verifica on-device (COCO-SSD) → cattura interattiva
await clickTab(page, "Scatta");
await page.waitForTimeout(300);
const fileInput = page.locator('input[type="file"]').first();
if (await fileInput.count()) {
  // 1) NON-bovina: un PNG 1×1 deve essere rifiutato con cortesia
  //    (il primo riconoscimento include il caricamento del modello ~18MB)
  await fileInput.setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: PNG });
  const rejected = await page.locator("#sighting-rejected").waitFor({ state: "visible", timeout: 120000 }).then(() => true).catch(() => false);
  note(`scanner rifiuta ciò che non è bovina: ${rejected}`);
  if (!rejected) problems.push("il riconoscitore non rifiuta le foto senza bovine");
  await page.locator("#sighting-rejected button").click().catch(() => {});
  await page.waitForTimeout(300);

  // 2) foto VERA di una Reina → verificata → si apre la cattura
  await fileInput.setInputFiles(new URL("../public/photos/BESKIADA.jpg", import.meta.url).pathname);
  const confirmBtn = page.locator("#sighting-confirm");
  const verified = await confirmBtn.waitFor({ state: "visible", timeout: 60000 }).then(() => true).catch(() => false);
  note(`bovina reale verificata dal riconoscitore: ${verified}`);
  if (!verified) problems.push("il riconoscitore non verifica la foto reale della Reina");
  await page.screenshot({ path: `${OUT}/v2int-4a-verificata.png` });
  if (verified) await confirmBtn.click();
  await page.waitForTimeout(1200);
  const capturing = await page.locator("#throw-btn").isVisible().catch(() => false);
  note(`scanner → cattura aperta: ${capturing}`);
  if (!capturing) problems.push("scanner non porta alla cattura");
  await page.screenshot({ path: `${OUT}/v2int-4-cattura.png` });
  if (capturing) {
    // selettore Vatsa-ball in stile Poké Ball: scegli la Master (cattura garantita)
    const chanceVisible = await page.locator("#catch-chance").isVisible().catch(() => false);
    note(`indicatore probabilità cattura: ${chanceVisible}`);
    if (!chanceVisible) problems.push("manca l'indicatore di probabilità di cattura");
    await page.locator("#ball-item-bell-master").click().catch(() => {});
    await page.waitForTimeout(250);
    await page.locator("#throw-btn").click();
    await page.waitForTimeout(4200);
    const secured = await page.locator("text=CATTURATA").isVisible().catch(() => false);
    note(`cattura riuscita (master): ${secured}`);
    if (!secured) problems.push("cattura con master ball fallita");
    await page.screenshot({ path: `${OUT}/v2int-5-presa.png` });
  }
} else problems.push("scanner: input file assente");

// chiudi l'eventuale schermata d'incontro (modale post-cattura)
const encounter = page.locator("#encounter-screen");
if (await encounter.isVisible().catch(() => false)) {
  await encounter.locator("button").first().click().catch(() => {});
  await page.waitForTimeout(400);
}

// ===== BATTAGLIE SULLA MAPPA (scena stile Pokémon) =====
await clickTab(page, "Alpeggio");
await page.waitForTimeout(500);
// assicura GPS attivo (posizione mockata vicino al Pastore)
const gpsOnNow = await page.locator('#gps-btn[aria-pressed="true"]').isVisible().catch(() => false);
if (!gpsOnNow) { await page.locator("#gps-btn").click().catch(() => {}); await page.waitForTimeout(1000); }
else await page.waitForTimeout(800);
const nNear = await page.locator("#battle-nearby button").count();
note(`pannello 'Sfide nei dintorni': ${nNear} combattenti`);
const nearBtn = page.locator("#battle-nearby button", { hasText: "COMBATTI" }).first();
if (await nearBtn.count()) {
  await nearBtn.click();
  await page.waitForTimeout(500);
  const sceneOpen = await page.locator("#battle-scene").isVisible().catch(() => false);
  note(`scena di battaglia aperta: ${sceneOpen}`);
  if (!sceneOpen) problems.push("la scena di battaglia non si apre dal pannello sfide");
  if (sceneOpen) {
    // VIGILIA: porta una scorta nello Sac e compi il rito della limatura
    await page.locator("[data-sac]").first().click().catch(() => {});
    const startDisabledPrima = await page.locator("#battle-start").isDisabled().catch(() => false);
    note(`vigilia: ingaggio bloccato prima della limatura: ${startDisabledPrima}`);
    if (!startDisabledPrima) problems.push("la limatura delle corna non è obbligatoria");
    await page.locator("#rito-limatura").click();
    await page.waitForTimeout(250);
    await page.locator("#battle-start").click().catch(() => {});
    await page.waitForTimeout(500);
    // il tell dell'avversaria (lettura dell'animale) deve essere visibile
    const tellVisible = await page.locator("#battle-tell").isVisible().catch(() => false);
    note(`tell dell'avversaria visibile: ${tellVisible}`);
    if (!tellVisible) problems.push("manca il tell dell'avversaria nella Spinta");
    let bGuard = 0;
    while (bGuard++ < 80) {
      const ended = await page.locator("#battle-scene .font-mono.font-black", { hasText: /si ritira/ }).first().isVisible().catch(() => false);
      if (ended) break;
      const mv = page.locator("#battle-moves button:not([disabled])").first();
      if (await mv.count()) await mv.click().catch(() => {});
      await page.waitForTimeout(350);
    }
    const bDone = await page.locator("#battle-scene").getByText(/si ritira/).first().isVisible().catch(() => false);
    note(`battaglia sulla mappa conclusa: ${bDone}`);
    if (!bDone) problems.push("la battaglia sulla mappa non si conclude");
    await page.screenshot({ path: `${OUT}/v2int-7-battlescene.png` });
  }
} else problems.push("nessuna sfida disponibile nel pannello 'Sfide nei dintorni'");

if (errors.length) {
  console.log("  ! errori console:");
  errors.slice(0, 6).forEach((e) => console.log("    - " + e));
  problems.push(`${errors.length} errori console`);
} else note("nessun errore console");

await browser.close();

console.log("\n================ ESITO ================");
if (problems.length === 0) console.log("✅ TUTTO OK");
else { console.log(`❌ ${problems.length} problemi:`); problems.forEach((p) => console.log("  - " + p)); }
console.log(`\nScreenshot in ${OUT}`);
process.exit(problems.length ? 1 : 0);
