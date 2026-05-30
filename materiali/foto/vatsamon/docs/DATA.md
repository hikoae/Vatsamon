# Dati — schema, formule, provenienza

## Fonte
Calendario **Batailles de Reines 2026**, Association régionale Amis des Batailles de Reines
(stampato da Tipografia Duc). Dati estratti: nome bovina, proprietario, comune, categoria,
piazzamento/premio, peso della "vacca più pesante", matricole IT/CH dagli alberi genealogici.

## Privacy
I nomi dei **proprietari** sono ridotti a **iniziali** (es. "BUSSO PIERO" → "B.P.").

## Campi (`data/vatsadex.json` → `bovine[]`)
| Campo | Origine | Note |
|---|---|---|
| id | generato | VZ001… |
| nome | reale | nome della Reine |
| razza | **default** | "Castana" per le combattenti; "Pezzata Rossa" se premio latte. Da verificare. |
| tipo | derivato | Forza / Resistenza / Latte (dalla razza) |
| categoria | reale | 1ª / 2ª / 3ª |
| rarita, stelle | derivato | da riconoscimento (vedi sotto) |
| riconoscimento | reale | Reine Régionale, 2ª class., Più combattiva, ecc. |
| comune | reale | comune di provenienza |
| allevatore | reale→iniziali | privacy |
| matricola | reale (parziale) | solo per i finalisti regionali |
| peso_kg | reale o **stimato** | vedi `peso_stimato` |
| peso_stimato | flag | true = stima per categoria |
| stats | derivato | STAZZA, CORNA, TESTA, GRINTA |
| potenza | derivato | somma delle 4 stat |

## Stima del peso (quando mancante)
Base per categoria: 1ª = 705 kg, 2ª = 648 kg, 3ª = 585 kg, ± variazione deterministica dal nome.

## Formule statistiche (semplificate, stile Pokémon)
- **STAZZA** (≈HP) = mappa peso 380–820 kg → 55–120
- **CORNA** (≈Attacco) = (peso−450)/3 + bonus categoria (1ª +12, 2ª +6) + bonus combattività + bonus rarità
- **TESTA** (≈Difesa) = (peso−450)/3.4 + bonus categoria + bonus rarità
- **GRINTA** (≈Velocità) = 95 − (peso−560)/4 + bonus per categorie leggere
Tutte limitate a 45–120 e calcolate in modo **deterministico** (riproducibile) in `scripts`.

## Rarità
| Riconoscimento | Rarità | ★ |
|---|---|---|
| Reine Régionale / Nationale | Leggendaria | 5 |
| Vacca più pesante / Più combattiva / Regina del latte | Epica | 4 |
| 2ª class. / 3ª-4ª / 4ª / 5ª-8ª / Migliore 2º parto | Rara | 3 |
| Finalista regionale | Non comune | 2 |

Distribuzione attuale: 11 Leggendarie, 11 Epiche, 31 Rare.

## Pascoli (`pascoli[]`)
6 pascoli reali in Valle d'Aosta con coordinate (Cogne, Valtournenche, Gressan, Fénis, Nus,
Donnas). Ogni bovina è assegnata al pascolo del proprio comune (fallback round-robin).

## Limiti noti (è una demo)
- Categoria/piazzamento per bovina: estratti dal testo, possono avere imprecisioni.
- Razza: assegnata di default, va verificata con foto reali.
- Per il dataset completo e validato serve la lettura visiva pagina-per-pagina del calendario.

## Foto reali (cartella `photos/`)
35 bovine hanno la foto reale ritagliata dalle pagine del calendario (le vincitrici di categoria
di ogni bataille locale + alcune finaliste). File nominati per bovina, es. `photos/GLORIEUSE.jpg`.
Nel JSON il campo `foto` punta al file relativo; le altre usano la silhouette.

**Crediti / diritti:** foto dei fotografi ufficiali dell'Association (Iole Artaz, Ilenia Noussan,
Mauro Pallais, Luciano Ramires, Mélanie Ronco, Clelia Tucci). Uso interno/demo ok; per la
pubblicazione pubblica dell'app vanno autorizzate da Association / fotografi.
