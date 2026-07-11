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
      registerType: "autoUpdate",
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
        // La nuova versione prende subito il controllo e pulisce le cache vecchie,
        // così un reload basta a vedere l'aggiornamento (niente blocchi infiniti).
        skipWaiting: true,
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
