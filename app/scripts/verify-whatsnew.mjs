import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const APP_URL = process.env.URL ?? "http://localhost:5173/";
const OUT = "/tmp/vatsamon-shots";
mkdirSync(OUT, { recursive: true });

// Versione attesa letta da package.json (stessa fonte di __APP_VERSION__ in
// vite.config.ts e di verify.mjs) — mai hardcodata, così il check resta
// valido a ogni release.
const APP_PKG_VERSION = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8")).version;

const problems = [];
const note = (m) => console.log("  • " + m);

const browser = await chromium.launch({ executablePath: process.env.PW_EXEC });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await ctx.newPage();
const errors = [];
const isEnvNoise = (t) => /ERR_CONNECTION_CLOSED|ERR_NETWORK|Failed to load resource|tile\.openstreetmap|tile\.|favicon/i.test(t);
page.on("console", (m) => m.type() === "error" && !isEnvNoise(m.text()) && errors.push(m.text()));
page.on("pageerror", (e) => !isEnvNoise(e.message) && errors.push("PAGEERROR: " + e.message));

// Stesso bypass onboarding del verify.mjs esistente: storage "grandfathered",
// nessuna chiave vatsamon_tutorial → tutorialAttivo=false, niente vatsamon_versione_vista.
await page.addInitScript(() => {
  localStorage.setItem("vatsamon_onboarded", JSON.stringify({ verify: true }));
});

await page.goto(APP_URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// 1) PRIMA APERTURA: il modale deve apparire da solo.
const modalVisible1 = await page.locator("#whats-new-modal").isVisible().catch(() => false);
note(`1) prima apertura → modal visibile: ${modalVisible1}`);
if (!modalVisible1) problems.push("modal NON appare alla prima apertura");
await page.screenshot({ path: `${OUT}/whatsnew-1-auto-open.png` });

const titoloCorrente = await page.locator("#whats-new-modal").locator(`text=v${APP_PKG_VERSION}`).first().isVisible().catch(() => false);
note(`   versione corrente mostrata: ${titoloCorrente}`);
if (!titoloCorrente) problems.push("versione corrente non mostrata nel modal");

// 2) CHIUDI col bottone "Fatto".
await page.locator("#whats-new-modal button", { hasText: "Fatto" }).click();
await page.waitForTimeout(300);
const closedAfterClick = !(await page.locator("#whats-new-modal").isVisible().catch(() => false));
note(`2) chiuso con 'Fatto': ${closedAfterClick}`);
if (!closedAfterClick) problems.push("modal non si chiude col bottone Fatto");

const seenValue = await page.evaluate(() => localStorage.getItem("vatsamon_versione_vista"));
note(`   vatsamon_versione_vista in localStorage: ${seenValue}`);
if (seenValue !== APP_PKG_VERSION) problems.push(`versione vista non salvata correttamente (letto: ${seenValue})`);

// 3) RELOAD → NON deve riapparire.
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const modalAfterReload = await page.locator("#whats-new-modal").isVisible().catch(() => false);
note(`3) dopo reload → modal visibile: ${modalAfterReload} (atteso: false)`);
if (modalAfterReload) problems.push("modal riappare dopo reload nonostante versione già vista");
await page.screenshot({ path: `${OUT}/whatsnew-2-no-reappear-after-reload.png` });

// 4) FOOTER PROFILO → riapre con lo storico.
await page.locator('[aria-label="Profilo e salvataggio"]').click();
await page.waitForTimeout(300);
const profileVisible = await page.locator("#profile-modal").isVisible().catch(() => false);
note(`4a) #profile-modal visibile dopo click header: ${profileVisible}`);
if (!profileVisible) problems.push("impossibile aprire ProfileModal per testare il link Novità");

if (profileVisible) {
  await page.screenshot({ path: `${OUT}/whatsnew-3-profile-footer.png` });
  const linkVisible = await page.locator("#show-whats-new").isVisible().catch(() => false);
  note(`4b) link 'Novità di versione' nel footer profilo: ${linkVisible}`);
  if (!linkVisible) problems.push("link Novità di versione assente nel footer del ProfileModal");
  if (linkVisible) {
    await page.locator("#show-whats-new").click();
    await page.waitForTimeout(300);
    const reopened = await page.locator("#whats-new-modal").isVisible().catch(() => false);
    note(`4c) riapertura manuale dal Profilo: ${reopened}`);
    if (!reopened) problems.push("il link del footer non riapre WhatsNewModal");
    await page.screenshot({ path: `${OUT}/whatsnew-4-manual-reopen.png` });
  }
}

note(`console errors: ${errors.length}`);
errors.forEach((e) => note("   ERR: " + e));
if (errors.length) problems.push(`${errors.length} errori console`);

await browser.close();

console.log("\n=== RISULTATO ===");
if (problems.length === 0) {
  console.log("TUTTO OK — 0 problemi");
  process.exit(0);
} else {
  problems.forEach((p) => console.log("PROBLEMA: " + p));
  process.exit(1);
}
