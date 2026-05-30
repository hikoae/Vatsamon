import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// base = "/vazzamon/" for GitHub Pages project site; override with VITE_BASE if needed.
export default defineConfig(({ mode }) => ({
  base: mode === "development" ? "/" : "/vazzamon/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "cow-silhouette.svg",
        "photos/*.jpg",
      ],
      manifest: {
        name: "Vazzamon — la Vazzadex delle Reines",
        short_name: "Vazzamon",
        description:
          "Cattura le mucche reali delle Bataille de Reines valdostane e completa la tua Vazzadex.",
        lang: "it",
        theme_color: "#2E5D34",
        background_color: "#eef3ec",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,woff2}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.host.includes("tile.openstreetmap.org"),
            handler: "CacheFirst",
            options: {
              cacheName: "osm-tiles",
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
}));
