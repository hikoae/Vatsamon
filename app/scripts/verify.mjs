import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const APP_URL = process.env.URL ?? "http://localhost:5173/";
const OUT = "/tmp/vazzamon-shots";
mkdirSync(OUT, { recursive: true });

const data = JSON.parse(readFileSync(new URL("../src/data/vazzadex.json", import.meta.url)));
const target = data.bovine[0]; // GPS qui per testare la prossimità

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
  await page.waitForTimeout(1000);

  // TrainerBar + BottomNav
  const trainer = await page.locator("header", { hasText: "Liv." }).isVisible();
  const navBtns = page.locator("nav button");
  const nNav = await navBtns.count();
  note(`TrainerBar: ${trainer} · tab nav: ${nNav}`);
  if (!trainer) problems.push(`[${vp.name}] TrainerBar assente`);
  if (nNav !== 5) problems.push(`[${vp.name}] nav ha ${nNav} tab (attesi 5)`);

  // Mappa
  const player = await page.locator(".player-dot").count();
  const pins = await page.locator(".leaflet-marker-icon .pin").count();
  const casere = await page.locator(".casera").count();
  note(`player: ${player} · pin bovine: ${pins} · casere: ${casere}`);
  if (!player) problems.push(`[${vp.name}] manca player marker`);
  if (pins < 10) problems.push(`[${vp.name}] poche bovine (${pins})`);
  if (!casere) problems.push(`[${vp.name}] mancano le Casere`);
  await page.screenshot({ path: `${OUT}/v2-${vp.name}-1-mappa.png` });

  // giro tab
  for (const [label, shot] of [["Scanner", "2-scanner"], ["Uova", "3-uova"], ["Vazzadex", "4-dex"], ["Bataille", "5-bataille"]]) {
    await page.locator("nav button", { hasText: label }).click();
    await page.waitForTimeout(450);
    const ok = await page.locator("h2, .glass").first().isVisible().catch(() => false);
    note(`tab ${label}: ${ok}`);
    if (!ok) problems.push(`[${vp.name}] tab ${label} vuoto`);
    await page.screenshot({ path: `${OUT}/v2-${vp.name}-${shot}.png` });
  }

  // Scanner: genera a sorpresa
  await page.locator("nav button", { hasText: "Scanner" }).click();
  await page.waitForTimeout(300);
  await page.locator("button", { hasText: "Genera a sorpresa" }).click();
  await page.waitForTimeout(1800);
  const scanOk = await page.locator("button", { hasText: "Analizza un'altra" }).isVisible();
  note(`scanner genera Vazzamon: ${scanOk}`);
  if (!scanOk) problems.push(`[${vp.name}] scanner non genera`);

  if (vp.name === "mobile") {
    // cattura interattiva: GPS -> in range -> tap bovina -> master ball -> lancia
    await page.locator("nav button", { hasText: "Mappa" }).click();
    await page.waitForTimeout(600);
    await page.locator("button", { hasText: "GPS reale" }).click();
    await page.waitForTimeout(1200);
    const pill = await page.locator(".absolute.top-2\\.5 span").first().innerText().catch(() => "");
    note(`HUD dopo GPS: ${pill.trim()}`);

    const nearPin = page.locator(".leaflet-marker-icon:has(.pin:not(.far))").first();
    if (await nearPin.count()) {
      await nearPin.click();
      await page.waitForTimeout(500);
      const capOpen = await page.locator("button", { hasText: "Lancia il campanaccio" }).isVisible();
      note(`overlay cattura aperto: ${capOpen}`);
      if (!capOpen) problems.push(`[${vp.name}] cattura non si apre`);
      await page.screenshot({ path: `${OUT}/v2-${vp.name}-6-cattura.png` });
      // Bell di Platino = cattura garantita
      await page.locator('[data-ball="ball-master"]').click();
      await page.locator("button", { hasText: "Lancia il campanaccio" }).click();
      await page.waitForTimeout(3400);
      const caught = await page.locator("button", { hasText: "Aggiungi al Vazzadex" }).isVisible();
      note(`cattura riuscita: ${caught}`);
      if (!caught) problems.push(`[${vp.name}] cattura non conclusa`);
      await page.screenshot({ path: `${OUT}/v2-${vp.name}-7-presa.png` });
      // chiudi l'overlay comunque
      await page.locator(".fixed.z-\\[4000\\] button", { hasText: caught ? "Aggiungi al Vazzadex" : "Chiudi" }).first().click().catch(() => {});
    } else problems.push(`[${vp.name}] nessuna bovina a portata dopo GPS`);

    // contatore reali (>=1) — abbiamo catturato 1 reale; lo scanner aggiunge bonus IA a parte
    await page.locator("nav button", { hasText: "Vazzadex" }).click();
    await page.waitForTimeout(500);
    const counter = await page.locator(".glass", { hasText: "Vazzadex:" }).first().innerText();
    note(`contatore: ${counter.replace(/\n/g, " ").trim()}`);
    if (!/Vazzadex:\s*1\s*\/\s*73/.test(counter)) problems.push(`[${vp.name}] contatore reali non 1/73 (${counter.replace(/\n/g, " ").trim()})`);
  }

  if (errors.length) {
    console.log("  ! errori console:");
    errors.slice(0, 6).forEach((e) => console.log("    - " + e));
    problems.push(`[${vp.name}] ${errors.length} errori console`);
  } else note("nessun errore console");

  await browser.close();
}

console.log("\n================ ESITO ================");
if (problems.length === 0) console.log("✅ TUTTO OK");
else { console.log(`❌ ${problems.length} problemi:`); problems.forEach((p) => console.log("  - " + p)); }
console.log(`\nScreenshot in ${OUT}`);
process.exit(problems.length ? 1 : 0);
