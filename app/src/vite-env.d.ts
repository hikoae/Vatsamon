/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Versione da package.json, iniettata a build-time (vite.config.ts define). */
declare const __APP_VERSION__: string;

/** Badge API (S14) — pallino sull'icona PWA/home-screen. Non è nel lib DOM
 * di TypeScript (feature ancora sperimentale, Chromium-only): metodi opzionali,
 * feature-detect a runtime via optional chaining in App.tsx. */
interface Navigator {
  setAppBadge?(contents?: number): Promise<void>;
  clearAppBadge?(): Promise<void>;
}
