# 🐮 Vazzamon — la Vazzadex delle Reines valdostane

Demo per l'hackathon **BuildWithAI – GDG Valle d'Aosta**.
App web (PWA) stile Pokémon GO basata sulle **mucche reali** delle Bataille de Reines:
fotografi una bovina, Gemini ne riconosce la razza, la aggiungi alla tua **Vazzadex**,
la trovi nei pascoli sulla mappa e la fai sfidare in battaglie amichevoli.

> Differenziale: NON è un database inventato. Le ~53 schede vengono dal calendario reale
> 2026 dell'Association régionale Amis des Batailles de Reines (nomi proprietari anonimizzati).

## Struttura repo
```
vazzamon/
├─ README.md
├─ data/
│  ├─ vazzadex.json          ← dataset pronto per l'app (53 bovine + 6 pascoli)
│  └─ Vazzadex_DB_v0.2.xlsx  ← stesso dato in Excel, editabile a mano
├─ docs/
│  ├─ ARCHITECTURE.md        ← stack, flusso utente, scelte tecniche
│  ├─ ROADMAP.md             ← piano operativo 4 ore (da solo)
│  └─ DATA.md                ← schema dati, formule statistiche, provenienza
├─ prompts/
│  ├─ recognition.md         ← prompt Gemini per il riconoscimento razza (JSON)
│  └─ ai-studio-build-prompt.md ← prompt unico da incollare in Google AI Studio (Build)
└─ assets/
   └─ cow-silhouette.svg     ← segnaposto quando non c'è foto reale
```

## Avvio rapido (4 ore, da solo)
1. Apri **Google AI Studio → Build**.
2. Incolla il contenuto di `prompts/ai-studio-build-prompt.md`.
3. Carica `data/vazzadex.json` come dato dell'app.
4. Itera sezione per sezione seguendo `docs/ROADMAP.md`.

## Stato
Prototipo / MVP demo. Molti dettagli volutamente simulati (passi, multiplayer, battaglia).
Vedi `docs/ROADMAP.md` → "Prossimi passi".
