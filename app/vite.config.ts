import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Versione letta da package.json a build-time (fonte unica, no drift manuale):
// iniettata come global __APP_VERSION__ (S19), usata dal sistema "Novità di
// versione" per capire se il changelog ha una entry per il build corrente.
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as { version: string };

export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // Base = nome del repo GitHub (il sito Pages vive su hikoae.github.io/<repo>/).
  // Il progetto si chiama "vatsamon": rinominare anche il repo GitHub in
  // Settings → General → Repository name (GitHub reindirizza il vecchio nome).
  // Netlify (sito live) ignora questo valore: builda con --base=/ da netlify.toml.
  base: mode === "development" ? "/" : "/vatsamon/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt" (non "autoUpdate"): un aggiornamento pronto NON ricarica più
      // la pagina da solo. main.tsx decide quando applicarlo (subito se non
      // c'è un'attività critica in corso — foto/battaglia — altrimenti al
      // ritorno in idle), per non perdere una cattura in "Scatta la Reina".
      registerType: "prompt",
      // Registriamo noi il SW (src/main.tsx via virtual:pwa-register) per avere
      // l'auto-reload quando esce una nuova versione: lo script iniettato di
      // default si limita a registrare, senza ricaricare la pagina.
      injectRegister: false,
      // photos/*.jpg e illustrations/*.png NON in includeAssets (S4 perf): stanno
      // fuori dal precache, vedi globIgnores + runtimeCaching CacheFirst sotto.
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "cow-silhouette.svg"],
      manifest: {
        name: "Vatsamon — la Vatsadex delle Reines",
        short_name: "Vatsamon",
        description: "Il gioco delle Batailles de Reines: le mucche reali della Valle d'Aosta.",
        lang: "it",
        theme_color: "#f5f3fb",
        background_color: "#f5f3fb",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,woff2}"],
        // Foto reali (35 file, ~4.3MB) e illustrazioni (5 file, ~470KB) fuori dal
        // precache install-time (S4 perf, target < 2.5MB totali): stesso pattern
        // già usato per /models/ssdlite/ — CacheFirst al primo uso runtime.
        globIgnores: ["photos/**", "illustrations/**", "assets/detector-tfjs-*.js"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // skipWaiting NON forzato (default false): con registerType "prompt" il
        // nuovo SW deve restare "in attesa" finché main.tsx non gli manda
        // esplicitamente il messaggio SKIP_WAITING (via updateSW(true)). Con
        // skipWaiting:true il SW generato salta quell'attesa a prescindere e
        // l'evento "waiting" da cui dipende onNeedRefresh non scatterebbe mai
        // (vedi workbox-build/templates/sw-template.js).
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.host.includes("tile.openstreetmap.org"),
            handler: "CacheFirst",
            options: {
              cacheName: "osm-tiles",
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Riconoscitore "Scatta la Reina" (~18MB): NON in precache, ma
            // cache-first al primo uso → poi funziona anche offline in alpeggio.
            urlPattern: ({ url }) => url.pathname.includes("/models/ssdlite/"),
            handler: "CacheFirst",
            options: {
              cacheName: "detector-model",
              expiration: { maxEntries: 8 },
            },
          },
          {
            // Foto reali delle bovine: stesso pattern del detector-model (S4 perf).
            urlPattern: ({ url }) => url.pathname.includes("/photos/"),
            handler: "CacheFirst",
            options: {
              cacheName: "cow-photos",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Illustrazioni di razza (Vatsadex): stesso pattern del detector-model.
            urlPattern: ({ url }) => url.pathname.includes("/illustrations/"),
            handler: "CacheFirst",
            options: {
              cacheName: "breed-illustrations",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Codice TF.js/coco-ssd (chunk "detector-tfjs-*", vedi manualChunks):
            // stesso pattern del detector-model, cache-first al primo "Scatta la Reina".
            urlPattern: ({ url }) => /\/assets\/detector-tfjs-.*\.js$/.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "detector-tfjs",
              expiration: { maxEntries: 4 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  build: {
    rollupOptions: {
      output: {
        // S4 perf: vendor pesanti in chunk separati, cachabili indipendentemente
        // dal codice applicativo (che cambia molto più spesso di React/Leaflet/
        // Firebase/Motion). Riduce anche il chunk principale del primo load.
        // Assegnazione per PATH del pacchetto, non per specifier: la forma a
        // oggetto di manualChunks tirava dentro al chunk anche le dipendenze
        // transitive, helper virtuali di Rollup compresi (commonjsHelpers).
        // Quell'helper è condiviso con il codice dell'app: finito dentro
        // "detector-tfjs", il chunk di App lo importava STATICAMENTE e i 1,9MB
        // di TF.js venivano scaricati alla prima schermata di gioco invece che
        // al primo "Scatta la Reina". Guardando solo i file reali di
        // node_modules, i moduli condivisi restano fuori dai chunk vendor.
        manualChunks(id) {
          if (!id.includes("/node_modules/")) return;
          // TF.js + coco-ssd sono dietro import() dinamico in lib/detector.ts,
          // ma senza un chunk-name stabile finirebbero nel precache PWA per via
          // del globPatterns generico. Nome fisso qui → escluso in globIgnores.
          if (id.includes("/node_modules/@tensorflow")) return "detector-tfjs";
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "vendor-react";
          if (id.includes("/node_modules/leaflet/")) return "vendor-leaflet";
          if (/\/node_modules\/(firebase|@firebase)\//.test(id)) return "vendor-firebase";
          if (/\/node_modules\/(motion|motion-dom|motion-utils|framer-motion)\//.test(id)) return "vendor-motion";
        },
      },
    },
  },
}));
