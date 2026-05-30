import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.URL ?? "http://localhost:5173/";
const OUT = "/tmp/vazzamon-shots";
mkdirSync(OUT, { recursive: true });

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
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // --- Topbar + navbar visibili ---
  const topbar = page.locator(".topbar");
  const navbar = page.locator(".navbar");
  const navBtns = page.locator(".navbar button");
  const topVisible = await topbar.isVisible();
  const navVisible = await navbar.isVisible();
  const nBtns = await navBtns.count();
  note(`topbar visibile: ${topVisible}`);
  note(`navbar visibile: ${navVisible} · pulsanti: ${nBtns}`);
  if (!topVisible) problems.push(`[${vp.name}] topbar non visibile`);
  if (!navVisible) problems.push(`[${vp.name}] navbar non visibile`);
  if (nBtns !== 4) problems.push(`[${vp.name}] navbar ha ${nBtns} pulsanti (attesi 4)`);

  // navbar dentro il viewport?
  const navBox = await navbar.boundingBox();
  if (navBox) {
    const bottom = navBox.y + navBox.height;
    note(`navbar bottom=${Math.round(bottom)} (viewport h=${vp.height})`);
    if (bottom > vp.height + 2)
      problems.push(`[${vp.name}] navbar sotto il viewport (bottom ${Math.round(bottom)} > ${vp.height})`);
  }

  await page.screenshot({ path: `${OUT}/${vp.name}-1-mappa.png` });

  // --- Giro dei tab ---
  for (const [label, shot] of [
    ["Vazzadex", "2-vazzadex"],
    ["Bataille", "3-bataille"],
    ["Profilo", "4-profilo"],
  ]) {
    await page.locator(".navbar button", { hasText: label }).click();
    await page.waitForTimeout(500);
    const heading = await page.locator(".screen h2, .card").first().isVisible().catch(() => false);
    note(`tab ${label}: contenuto visibile = ${heading}`);
    if (!heading) problems.push(`[${vp.name}] tab ${label} senza contenuto visibile`);
    await page.screenshot({ path: `${OUT}/${vp.name}-${shot}.png` });
  }

  // --- Flusso incontro completo (solo su mobile per brevità) ---
  if (vp.name === "mobile") {
    await page.locator(".navbar button", { hasText: "Mappa" }).click();
    await page.waitForTimeout(800);
    const markers = page.locator(".leaflet-marker-icon");
    const mCount = await markers.count();
    note(`marker sulla mappa: ${mCount}`);
    if (mCount < 6) problems.push(`[${vp.name}] solo ${mCount} marker (attesi 6)`);

    await markers.first().click();
    await page.waitForTimeout(400);
    const cerca = page.locator(".leaflet-popup button", { hasText: "Cerca una Reina" });
    if (await cerca.isVisible()) {
      await cerca.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/${vp.name}-5-incontro.png` });

      // l'overlay deve coprire il viewport ed essere l'elemento in cima al centro
      const topAtCenter = await page.evaluate(() => {
        const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        return !!el?.closest(".overlay");
      });
      note(`overlay copre il centro schermo: ${topAtCenter}`);
      if (!topAtCenter) problems.push(`[${vp.name}] overlay incontro coperta da altro (z-index)`);
      const demo = page.locator("button", { hasText: "Usa mucca demo" });
      if (await demo.isVisible()) {
        await demo.click();
        await page.waitForTimeout(2600); // attesa riconoscimento simulato
        const reveal = page.locator("button", { hasText: "Aggiungi alla Vazzadex" });
        const ok = await reveal.isVisible();
        note(`reveal scheda dopo cattura: ${ok}`);
        if (!ok) problems.push(`[${vp.name}] scheda non rivelata dopo la cattura`);
        await page.screenshot({ path: `${OUT}/${vp.name}-6-reveal.png` });
        if (ok) await reveal.click();
      } else problems.push(`[${vp.name}] bottone 'Usa mucca demo' non trovato`);
    } else problems.push(`[${vp.name}] popup 'Cerca una Reina' non trovato`);

    // verifica contatore Vazzadex aggiornato
    await page.locator(".navbar button", { hasText: "Vazzadex" }).click();
    await page.waitForTimeout(500);
    const counter = await page.locator(".card", { hasText: "Vazzadex:" }).first().innerText().catch(() => "");
    note(`contatore: ${counter.replace(/\n/g, " ")}`);
    if (!/Vazzadex:\s*1\s*\/\s*73/.test(counter))
      problems.push(`[${vp.name}] contatore non a 1/73 dopo cattura (${counter.replace(/\n/g, " ")})`);
    await page.screenshot({ path: `${OUT}/${vp.name}-7-dex-dopo.png` });
  }

  if (errors.length) {
    console.log("  ! console/page errors:");
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
