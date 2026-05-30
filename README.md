# 🐮 Vazzamon — la Vazzadex delle Reines valdostane

App **stile Pokémon GO** con le **mucche reali** delle Bataille de Reines della
Valle d'Aosta. Cammini (GPS reale o demo) lungo i sentieri, incontri le bovine
nei loro **comuni veri**, le catturi con un mini-gioco, le collezioni nel
Vazzadex e le fai sfidare nell'arena. Uno scanner IA conia inoltre Vazzamon
bonus dalle tue foto.

> Hackathon **BuildWithAI – GDG Valle d'Aosta**.
> Fusione del prototipo "dati reali" + del prototipo di gioco AI Studio (v2),
> in un'unica build web statica.

## Struttura della repo
```
.
├─ app/          ← LA build: PWA Vite + React + TS (questa è l'app)
└─ materiali/    ← sorgenti e riferimenti (kit dati, foto, v2 originale, challenge)
```

## Avvio
```bash
cd app
npm install
npm run dev       # http://localhost:5173
npm run build     # build statica in app/dist
npm run verify    # test automatico nel browser (Playwright)
```

## Cosa c'è dentro (il meglio dei due prototipi)
- **73 bovine reali** con 35 foto vere, geolocalizzate nei **comuni corretti**, 4 statistiche dai pesi reali.
- **Scanner IA** (simulato, offline) che genera Vazzamon **bonus** dalle foto.
- **Mappa Pokémon GO**: player + GPS reale + demo a piedi, raggio di cattura, sentiero reale, **Casere** (PokéStop) con ruota premi.
- **Cattura interattiva**: mira, campanacci/ball, mela, oscillazione.
- **Uova** che si schiudono camminando.
- **Bataille de Reines**: arena in tempo reale (attacca / schiva / super).
- **Allenatore**: livello, XP, monete, zaino; **audio** sintetizzato; animazioni.
- **PWA** installabile, build **statica** (niente server, niente chiavi).

Dettagli tecnici e deploy: vedi [app/README.md](app/README.md).
