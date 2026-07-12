import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
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
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "cow-silhouette.svg", "photos/*.jpg"],
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
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
}));
