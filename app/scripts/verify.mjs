import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const APP_URL = process.env.URL ?? "http://localhost:5173/";
const OUT = "/tmp/vazzamon-shots";
mkdirSync(OUT, { recursive: true });

// una bovina reale su cui posizionare il "GPS" per testare la cattura di prossimità
const data = JSON.parse(readFileSync(new URL("../src/data/vazzadex.json", import.meta.url)));
const target = data.bovine[0];

const viewports = [
  { name: "desktop", width: 1280, height: 832, isMobile: false },
  { name: "mobile", width: 390, height: 844, isMobile: true },
];

const problems = [];
const note = (m) => console.log("  • " + m);

for (const vp of viewports) {
  console.log(`\n=== ${vp.name} (${vp.width}x${vp.height}) ===`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
    deviceScaleFactor: vp.isMobile ? 2 : 1,
    permissions: ["geolocation"],
    geolocation: { latitude: target.lat, longitude: target.lng },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto(APP_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  // --- Topbar + navbar ---
  const navVisible = await page.locator(".navbar").isVisible();
  const nBtns = await page.locator(".navbar button").count();
  note(`navbar visibile: ${navVisible} · pulsanti: ${nBtns}`);
  if (!navVisible) problems.push(`[${vp.name}] navbar non visibile`);
  if (nBtns !== 4) problems.push(`[${vp.name}] navbar ha ${nBtns} pulsanti`);

  // --- Mappa: player + bovine + HUD ---
  const player = await page.locator(".player-dot").count();
  const cows = await page.locator(".leaflet-marker-icon").count();
  const hud = await page.locator(".map-hud-top .hud-pill").isVisible();
  note(`player marker: ${player} · marker totali: ${cows} · HUD: ${hud}`);
  if (player < 1) problems.push(`[${vp.name}] manca il marker del giocatore`);
  if (cows < 10) problems.push(`[${vp.name}] poche bovine sulla mappa (${cows})`);
  if (!hud) problems.push(`[${vp.name}] HUD di stato non visibile`);
  await page.screenshot({ path: `${OUT}/${vp.name}-1-mappa.png` });

  // --- Giro dei tab ---
  for (const [label, shot] of [
    ["Vazzadex", "2-vazzadex"],
    ["Bataille", "3-bataille"],
    ["Profilo", "4-profilo"],
  ]) {
    await page.locator(".navbar button", { hasText: label }).click();
    await page.waitForTimeout(450);
    const ok = await page.locator(".screen h2, .card").first().isVisible().catch(() => false);
    note(`tab ${label}: contenuto = ${ok}`);
    if (!ok) problems.push(`[${vp.name}] tab ${label} vuoto`);
    await page.screenshot({ path: `${OUT}/${vp.name}-${shot}.png` });
  }

  // --- Flusso Pokémon GO: GPS → prossimità → cattura (solo mobile) ---
  if (vp.name === "mobile") {
    await page.locator(".navbar button", { hasText: "Mappa" }).click();
    await page.waitForTimeout(700);

    // attiva il GPS (geolocation mockata sulla bovina target → entriamo nel raggio)
    await page.locator(".hud-btn", { hasText: "GPS reale" }).click();
    await page.waitForTimeout(1200);
    const pill = await page.locator(".map-hud-top .hud-pill").innerText();
    note(`HUD dopo GPS: ${pill.trim()}`);
    const inRange = /a portata|tocca per catturare/i.test(pill);
    if (!inRange) problems.push(`[${vp.name}] GPS non porta in raggio di cattura (${pill.trim()})`);
    await page.screenshot({ path: `${OUT}/${vp.name}-5-inrange.png` });

    // tocca una bovina a portata (pin non "far")
    const nearPin = page.locator(".leaflet-marker-icon:has(.pin:not(.far))").first();
    if (await nearPin.count()) {
      await nearPin.click();
      await page.waitForTimeout(400);
      const sheet = await page.locator(".sheet").isVisible();
      note(`sheet incontro aperta: ${sheet}`);
      if (!sheet) problems.push(`[${vp.name}] tap su bovina a portata non apre l'incontro`);
      await page.screenshot({ path: `${OUT}/${vp.name}-6-incontro.png` });

      const demo = page.locator("button", { hasText: "Usa mucca demo" });
      if (await demo.isVisible()) {
        await demo.click();
        await page.waitForTimeout(2600);
        const reveal = await page.locator("button", { hasText: "Aggiungi alla Vazzadex" }).isVisible();
        note(`reveal scheda: ${reveal}`);
        if (!reveal) problems.push(`[${vp.name}] scheda non rivelata`);
        await page.screenshot({ path: `${OUT}/${vp.name}-7-reveal.png` });
        if (reveal) await page.locator("button", { hasText: "Aggiungi alla Vazzadex" }).click();
      } else problems.push(`[${vp.name}] bottone demo assente`);
    } else problems.push(`[${vp.name}] nessuna bovina a portata dopo il GPS`);

    // contatore aggiornato
    await page.locator(".navbar button", { hasText: "Vazzadex" }).click();
    await page.waitForTimeout(450);
    const counter = await page.locator(".card", { hasText: "Vazzadex:" }).first().innerText();
    note(`contatore: ${counter.replace(/\n/g, " ")}`);
    if (!/Vazzadex:\s*1\s*\/\s*73/.test(counter))
      problems.push(`[${vp.name}] contatore non 1/73 (${counter.replace(/\n/g, " ")})`);
  }

  if (errors.length) {
    console.log("  ! errori:");
    errors.forEach((e) => console.log("    - " + e));
    problems.push(`[${vp.name}] ${errors.length} errori console`);
  } else note("nessun errore console");

  await browser.close();
}

console.log("\n================ ESITO ================");
if (problems.length === 0) console.log("✅ TUTTO OK");
else {
  console.log(`❌ ${problems.length} problemi:`);
  problems.forEach((p) => console.log("  - " + p));
}
console.log(`\nScreenshot in ${OUT}`);
process.exit(problems.length ? 1 : 0);
