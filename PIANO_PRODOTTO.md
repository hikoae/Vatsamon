# Piano di prodotto — "Il centro del mondo Batailles de Reines (con il gioco dentro)"

> Obiettivo: trasformare Vatsamon da gioco a **hub ufficiale della stagione Batailles
> de Reines**, con il gioco come *layer di engagement* che si nutre degli stessi dati
> reali. Prodotto **proponibile e vendibile** agli *Amis des Batailles de Reines*.
> Dati di base verificati in [`materiali/BATAILLES_DOSSIER.md`](materiali/BATAILLES_DOSSIER.md).

---

## 1. Visione & posizionamento

**Una cosa sola, due registri.** Non un gioco con contorno informativo, né un sito con
un gioco appiccicato: un **hub ufficiale del campionato** (calendario, risultati,
anagrafe reine, albo d'oro, cultura, notizie) in cui il **gioco** (cattura, Dex, quiz,
arena, pronostici) rende collezionabile e vivo lo stesso dato reale.

**Principio-cardine (una sola fonte di verità):** ogni entità reale ha una controparte
ludica; ogni azione ludica riporta a un dato reale. La "carta" di una reina è una *vista*
gamificata della **stessa** scheda anagrafica che l'hub mostra in modo istituzionale.
→ Legittimità (dati veri) + coinvolgimento (collezione) senza dataset doppi.

**Perché è difendibile (vs CatchCat e vs i siti esistenti):** CatchCat ha contenuto
infinito ma generico; i siti VdA (lovevda.it, amisdesreines.it) hanno autenticità ma
sono frammentati (vetrina + PDF + news sparse). Noi uniamo **autenticità territoriale +
struttura dell'evento reale + engagement**. È esattamente il vuoto di mercato.

---

## 2. Decisioni da prendere (input del cliente)

1. **Naming/brand.** "Vatsamon" è un nome ludico (pastiche Pokémon): ottimo per il gioco,
   delicato per un ente ufficiale. **Proposta**: brand-ombrello istituzionale
   (es. *"Reines — Mondo Batailles de Reines / Vallée d'Aoste"*) con **"Vatsamon"** come
   nome della **modalità gioco** interna. → da confermare col cliente.
2. **Lingua di default**: IT con switch FR (la VdA è bilingue; il FR è la dicitura
   ufficiale dell'evento). Patois come *flavour* nei contenuti culturali.
3. **Ambizione del gioco-cattura reale** (foto in arena + anti-cheat tipo CatchCat):
   richiede un **backend leggero** (auth, storage, geofence). È in fase 3, opzionale e
   posteriore al prodotto vendibile.
4. **Diritti foto/marchi**: l'MVP usa foto fornite dall'associazione o proprie (vedi §9).

---

## 3. Architettura informativa (hub + gioco)

**Tab bar (5, mobile-first):**
```
[ Home/News ]  [ Stagione ]  [ GIOCO ]  [ Reines/Dex ]  [ Scopri ]
```
- **GIOCO** è il bottone centrale rialzato (cuore dell'engagement, cattura a un tocco).
- Le altre sezioni vivono dentro questi 5 hub + deep-link contestuali.

**Sezioni (L1) e cosa contengono:**

| Sezione | Scopo | Contenuti | Aggancio gioco |
|---|---|---|---|
| **Home/News** | "cosa succede ora" | prossima tappa (countdown), card LIVE, feed RSS (AostaSera/Gazzetta Matin) filtrato, reina del giorno, missione del giorno | cattura disponibile se in arena; carta sbloccabile |
| **Stagione** (✅ esiste, da potenziare) | spina dorsale sportiva | calendario 2026 reale, risultati per categoria, **tabellone** per categoria, **albo d'oro 2021-25**, sub-tab Espace Mont-Blanc | pronostici/fantasy; "tifa una reina"; carte Leggenda dall'albo |
| **Reines/Dex** | anagrafe + collezione | scheda reine (nome, n° gara, allevatore, comune, categoria, peso, palmares, foto), filtri, confronto, % collezione | "Catch la tua Reina" → carta con stats reali; scambio; arena |
| **Scopri** | cultura/regole | 6 schede cultura, regolamento (categorie per fase), glossario IT/FR/patois, schede razza, mappa eventi | ogni scheda → quiz a punti; "sapere = sbloccare" |
| **Gioco** | hub ludico | cattura, Dex/collezione, arena (battaglie con stats reali), quiz, pronostici, missioni/badge, classifiche | *è* l'integrazione |
| **Profilo** | identità/salvataggio | collezione, badge, follow (reine/allevatori/comuni), pronostici, lingua, privacy | il profilo è il salvataggio del gioco |
| **Allevatori** (fase 2) | volto umano | scheda azienda, reine possedute, palmares, mappa | badge "Mandria di X"; quiz "di chi è?" |
| **Sponsor/Ente** | sostenibilità | sponsor, chi è l'Association, contatti, credits/fonti | carta/missione sponsorizzata |

**Loop di engagement:** Home segnala tappa → vai in arena (Mappa) → catturi reina (Gioco)
→ pronostichi (Stagione) → segui il tabellone live → il risultato aggiorna carta + risolve
pronostico + popola Albo/Dex → push/condivisione → ritorno in Home.

---

## 4. Design system (sintesi — dettagli in dossier §9)

- **Palette**: nero `#0E0E0E` + rosso Reine `#C40000` + oro araldico `#C9A227` + carta
  alpina `#F4F0E8`; colori categoria 1/2/3 (`#9A1B2F`/`#1F6F8B`/`#4A6B3A`). Ancorata alla
  bandiera/araldica VdA → massima legittimità.
- **Tipografia**: Fraunces (display) + Inter (UI/dati con `tabular-nums`).
- **Doppio registro** con un solo data-attribute: `hub` (chiaro/sobrio) e `game`
  (scuro/energico). Stesso logo, stessi dati, due viste.
- **Tono**: hub = terza persona, sobrio; gioco = seconda persona, energico. Sempre
  rispettoso dell'animale (incruento, corna limate). Bilingue IT/FR.
- **Logo**: monogramma araldico (scudo + corna che suggeriscono una "V"), nero/rosso.

---

## 5. Modello dati (statico, no backend per fasi 0–2)

File JSON versionati in repo, serviti da GitHub Pages. Aggiornamento = commit (o CMS
git-based tipo Decap/TinaCMS per i volontari, interfaccia a form, zero codice).

```
app/src/data/batailles/
  meta.json        # versione, lastUpdated, stagione corrente
  rules.json       # categorie per fase, gravidanza, premi
  seasons/2026.json 2025.json   # tappe, sedi, date, categorie, risultati
  arenas.json      # sedi + lat/lng (mappa)
  reines.json      # anagrafe (id, nome, n°gara, breeder, comune, cat, palmares[], foto)
  breeders.json
  honors.json      # albo d'oro 2021-2025 + record
  glossary.json    # IT/FR/patois (i18n)
  sources.json     # feed RSS + url news + social
  news_cache.json  # GENERATO da GitHub Action (cron 2-4h), non a mano
i18n/it.json fr.json   # UI + schede cultura
```

**News senza backend:** GitHub Action schedulata → legge i feed RSS verificati → filtra
per keyword (`bataille|reines|reina|croix-noire|moudzon`) → scrive `news_cache.json`
(solo titolo/estratto/link, no ri-hosting) → commit → deploy. Validazione schema (AJV) in CI.

**Solo il gioco-cattura reale (fase 3)** introduce un backend leggero (auth/storage/geofence);
Firebase è già nel progetto e basta per quello.

---

## 6. Piano tecnico

1. **Refactor abilitante**: sciogliere `App.tsx` (~2900 righe) in moduli + store leggero
   (zustand) e un router di viste. *Prerequisito*: senza, ogni sezione nuova costa il doppio.
2. **Theming dual-mode**: token CSS + `data-mode`; migrare il tema scuro attuale ai token.
3. **i18n IT/FR** (`react-i18next` o soluzione leggera): estrarre le stringhe, importare
   glossario e schede cultura.
4. **Data layer**: i JSON di §5 + loader tipizzati (sul modello di `realCows.ts`).
5. **PWA/offline**: già presente; estendere la cache a contenuti hub (cultura, regolamento,
   glossario, calendario) → consultabili offline in arena.
6. **Verifica**: estendere lo script Playwright a tutte le sezioni nuove.

---

## 7. Roadmap a fasi

| Fase | Contenuto | Esito |
|---|---|---|
| **0 — Fondazioni** | refactor, token/dual-mode, i18n IT/FR, data layer, CI | base solida |
| **1 — MVP VENDIBILE** ⭐ | Home/News (RSS reali), Stagione potenziata (calendario 2026 reale + albo d'oro + tabellone), Scopri (cultura+regolamento+glossario), palette/brand istituzionale, 3 slot sponsor mockup | **demo per il cliente** |
| **2 — Anagrafe & risultati** | Dex/anagrafe reine completa + filtri, risultati per tappa/categoria, allevatori, classifiche, CMS git-based | prodotto utile tutto l'anno |
| **3 — Gioco "Catch la tua Reina"** | cattura foto in arena (anti-cheat), pronostici/fantasy live, mappa geofence, badge presenza, scambio carte (backend leggero) | engagement virale |
| **4 — Completo** | streaming overlay, iscrizioni/gestionale comitati, Espace Mont-Blanc, app nativa | piattaforma |

**Il valore vendibile è alla fine della Fase 1.** Tutto su stack statico, costo ~nullo.

---

## 8. La demo di vendita (= MVP Fase 1)

Cosa mostrare agli *Amis des Batailles*:
- Home brandizzata (nero/rosso/oro, dicitura ufficiale FR "Batailles de Reines").
- **Stagione 2026 reale**: 15 tappe + finale 25/10 Croix-Noire, su mappa.
- **Albo d'oro 2021-2025** con la storia di **Falchetta** (4 titoli) come gancio emotivo.
- Scheda reine completa + teaser "Segui/Adotta la tua reina".
- **Notizie live** dai RSS reali → prova che l'hub si aggiorna da solo.
- **3 slot sponsor** già posizionati (title, categoria, tappa) → inventario vendibile.
- Glossario IT/FR → bilinguismo nativo.
- Slide "prima/dopo": frammentazione attuale → hub unico.

---

## 9. Pacchetto commerciale (per l'associazione)

**Valore**: unico hub ufficiale, valorizza il patrimonio (cultura, albo, anagrafe),
digitalizza i risultati, bilingue IT/FR nativo, costo gestione bassissimo, abilita
sponsorizzazioni misurabili. Asset emotivo già validato ("Adotta una reina" a 149€).

**Ricavi**: title sponsor stagionale + sponsor di categoria (1/2/3) + sponsor della finale;
"adotta la tappa" (15 slot/anno); sponsor di scheda reine/allevatore; premium "Amis+"
(pronostici, notifiche live, carta della reina); merchandising/biglietteria; fondi
pubblici (Conseil de la Vallée, turismo/cultura, Interreg Espace Mont-Blanc).

## 10. Note legali (sintesi — dettagli in dossier §13)

Liberatorie foto; uso autorizzato di marchi/stemma; news solo aggregate con link-out;
disclaimer accuratezza dati + soglie per fase/anno; GDPR (analytics privacy-first,
geolocalizzazione opt-in, tutela minori). Pagina "Fonti e attribuzioni".

---

## 11. Da dove parto (proposta operativa)

Ordine consigliato per arrivare alla **demo vendibile** col minor rischio:
1. **Allineare la Stagione esistente ai dati reali verificati** (calendario 2026 reale,
   albo d'oro, categorie per fase, correzione razze) — *valore immediato, basso rischio*.
2. **Data layer + i18n IT/FR** (fondazioni).
3. **Scopri** (cultura + regolamento + glossario): contenuti già pronti.
4. **Home/News** con RSS reali + 3 slot sponsor.
5. **Refactor `App.tsx`** in parallelo dove serve.

→ A valle dell'approvazione di questo piano, eseguo per incrementi verificabili
(typecheck + build + Playwright + screenshot a ogni step) e committo sul branch.
