import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const APP_URL = process.env.URL ?? "http://localhost:5173/";
const OUT = "/tmp/vazzamon-shots";
mkdirSync(OUT, { recursive: true });

const data = JSON.parse(readFileSync(new URL("../src/data/vazzadex.json", import.meta.url)));
const target = data.bovine[0];

// PNG 1x1 per simulare un upload allo scanner
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const TABS = ["Mappa", "AR Scan", "Vitelli", "Vazzadex", "Gym"];
const problems = [];
const note = (m) => console.log("  • " + m);

async function clickTab(page, label) {
  await page.locator("nav button", { hasText: label }).first().click();
  await page.waitForTimeout(500);
}

const vp = { name: "desktop", width: 1280, height: 900 };
console.log(`\n=== ${vp.name} ===`);
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: vp.width, height: vp.height },
  permissions: ["geolocation"],
  geolocation: { latitude: target.lat + 0.0006, longitude: target.lng + 0.0006 },
});
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

await page.goto(APP_URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// header + tab
const header = await page.locator("header", { hasText: "VAZZAMON" }).isVisible().catch(() => false);
const nNav = await page.locator("nav button").count();
note(`header VAZZAMON GO: ${header} · tab: ${nNav}`);
if (!header) problems.push("header assente");
if (nNav < 5) problems.push(`nav ha ${nNav} tab`);

// mappa: bovine reali + casere + player
await page.waitForTimeout(800);
const reali = await page.locator("text=REALE").count();
const player = await page.locator("text=🧑‍🌾").count();
note(`marker REALE: ${reali} · player: ${player}`);
if (reali < 10) problems.push(`poche bovine reali sulla mappa (${reali})`);
await page.screenshot({ path: `${OUT}/v2int-1-mappa.png` });

// GPS reale (geolocation mockata vicino a una bovina reale)
await page.locator("#gps-btn").click();
await page.waitForTimeout(1200);
const gpsActive = await page.locator("#gps-btn", { hasText: "GPS attivo" }).isVisible().catch(() => false);
note(`GPS attivo: ${gpsActive}`);
if (!gpsActive) problems.push("GPS non si attiva");
await page.screenshot({ path: `${OUT}/v2int-2-gps.png` });

// giro tab
for (const t of TABS) {
  await clickTab(page, t);
  const ok = await page.locator("h2, h1").first().isVisible().catch(() => false);
  note(`tab ${t}: ${ok}`);
}

// Vazzadex: card catalogo reali X/73
await clickTab(page, "Vazzadex");
const cat = await page.locator("text=/Reines reali:\\s*0\\/73/").isVisible().catch(() => false);
note(`catalogo reali 0/73: ${cat}`);
if (!cat) problems.push("manca la card catalogo reali X/73");
await page.screenshot({ path: `${OUT}/v2int-3-dex.png` });

// AR Scan → upload → cattura interattiva (master ball garantita)
await clickTab(page, "AR Scan");
await page.waitForTimeout(300);
const fileInput = page.locator('input[type="file"]').first();
if (await fileInput.count()) {
  await fileInput.setInputFiles({ name: "mucca.png", mimeType: "image/png", buffer: PNG });
  await page.waitForTimeout(3500); // analisi → entra in cattura
  const capturing = await page.locator("#throw-btn").isVisible().catch(() => false);
  note(`scanner → cattura aperta: ${capturing}`);
  if (!capturing) problems.push("scanner non porta alla cattura");
  await page.screenshot({ path: `${OUT}/v2int-4-cattura.png` });
  if (capturing) {
    await page.locator("select").first().selectOption("item-bell-master").catch(() => {});
    await page.waitForTimeout(200);
    await page.locator("#throw-btn").click();
    await page.waitForTimeout(4200);
    const secured = await page.locator("text=CATTURATA").isVisible().catch(() => false);
    note(`cattura riuscita (master): ${secured}`);
    if (!secured) problems.push("cattura con master ball fallita");
    await page.screenshot({ path: `${OUT}/v2int-5-presa.png` });
  }
} else problems.push("scanner: input file assente");

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
