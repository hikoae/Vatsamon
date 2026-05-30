# Audit Root Attuale E Piano Per Claude Code

## Summary

- Root pulita al momento dell'audit: `git status --short` non mostrava modifiche pendenti.
- Branch attuale: `main`.
- Nessun remote Git configurato al momento dell'audit.
- Ultimo commit osservato: `0fb5609 Riparti da v2: base AI Studio statica + database reale innestato`.
- App principale: `app/`, basata su AI Studio v2 statica con React 19, Vite 6 e Tailwind v4.
- La shell Codex non aveva `node` e `npm` disponibili, quindi build e verify devono essere eseguiti in un ambiente Node funzionante.

## Findings Prioritari

- `app/.vite/` era tracciata ma e cache locale Vite: va rimossa da Git e ignorata.
- `.claude/settings.local.json` era tracciato: non conteneva segreti, ma e configurazione locale e va esclusa dal backup pubblico.
- `app/scripts/scripts/` conteneva duplicati sospetti:
  - `place_bovine.py` era duplicato identico di `app/scripts/place_bovine.py`;
  - `verify.mjs` era una vecchia versione non allineata.
- `README.md` root descriveva ancora parte della fusione precedente; andava riallineato alla base v2 + dati reali.
- `npm run build` eseguiva solo `vite build`; mancava un controllo TypeScript esplicito.
- `app/src/App.tsx` e un monolite da circa 2584 righe: accettabile come snapshot, ma da non espandere ulteriormente senza refactor guidato.
- Nessun segreto reale rilevato; solo placeholder `GEMINI_API_KEY` in `materiali/vazzamon_v2/.env.example`.

## Piano Operativo Applicato

1. Creare questo file in root come checklist per Claude Code.
2. Pulire file locali tracciati:
   - rimuovere dal tracking `app/.vite/`;
   - rimuovere dal tracking `.claude/settings.local.json`;
   - aggiungere a `.gitignore` `app/.vite/`, `.claude/`, `.env`, `.env.local`, `app/.env`, `app/.env.local`.
3. Pulire script duplicati:
   - eliminare `app/scripts/scripts/`;
   - mantenere solo `app/scripts/place_bovine.py` e `app/scripts/verify.mjs`.
4. Allineare documentazione:
   - aggiornare `README.md` root per dire chiaramente che la versione attuale riparte da v2 + dati reali;
   - lasciare `app/README.md` come riferimento tecnico principale;
   - chiarire che `materiali/` e archivio sorgenti, non app attiva.
5. Rafforzare verifica:
   - aggiungere script `typecheck`: `tsc --noEmit`;
   - aggiornare `build` a `tsc --noEmit && vite build`.

## Comandi Di Verifica

Da eseguire in un ambiente con Node/npm disponibili:

```bash
cd app
npm ci
npm run typecheck
npm run build
npm run dev
npm run verify
```

Controlli Git:

```bash
git status --short
git ls-files app/.vite app/scripts/scripts .claude/settings.local.json
git remote -v
```

Il secondo comando non deve stampare file dopo la pulizia.

## Regole Per Il Prossimo Lavoro

- Non fare merge della nuova repo esterna finche il backup GitHub non e completato.
- Prima di ogni merge: branch dedicato, commit pulito, build verificata.
- Ogni conflitto su UX, dati, routing, salvataggio localStorage o PWA va deciso manualmente.
- Non sostituire `app/` in blocco: confrontare feature per feature contro la base v2 attuale.
- Evitare di ampliare ulteriormente `app/src/App.tsx`; il prossimo lavoro strutturale dovrebbe estrarre componenti e logica in moduli piccoli.
