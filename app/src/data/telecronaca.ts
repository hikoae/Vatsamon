import { AzioneId, TurnResult } from "../lib/spinta";
import { MOSSE } from "./mosse";

/**
 * LA TELECRONACA DEL PASTORE — il colore comico della piazza.
 *
 * Livello puramente testuale: zero meccanica. Registro: sagra di paese.
 * Le battute che citano fatti veri (giuria, condotta, pesa, categorie)
 * restano fedeli al dossier; quelle assurde sono iperboli evidenti.
 * Prefisso 🎙️ nel log, pesca casuale (~40% dei turni per non intasare).
 */

export type EventoCronaca =
  | { tipo: "counter"; famiglia: AzioneId; vittima: "p" | "o" }
  | { tipo: "speciale"; mossaId: string }
  | { tipo: "barra"; sopra85: boolean }
  | { tipo: "fiatoBasso"; side: "p" | "o" }
  | { tipo: "vittoria" }
  | { tipo: "sconfitta" }
  | { tipo: "condotta" };

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
const sost = (s: string, nomi: { p: string; o: string }) => s.replace(/\{p\}/g, nomi.p).replace(/\{o\}/g, nomi.o);

/** Battute per counter riuscito, indicizzate per famiglia dell'azione VINCENTE. */
const COUNTER: Record<AzioneId, string[]> = {
  // il reggi ha fermato un'incalzata
  reggi: [
    "Il pastore in tribuna posa la grolla: «Eh no, cara. Quella lì è una fontina stagionata: non si sposta.»",
    "«Ha spinto contro la montagna. La montagna non l'ha presa sul personale.»",
    "Dalla piazza: «L'ho vista io piantarsi così anche davanti al veterinario.»",
    "«Zoccoli piantati e conto in sospeso: qui non passa nessuno.»",
  ],
  // l'incalzata ha travolto chi girava o rifiatava
  incalza: [
    "«Girava, girava… e ha trovato il frontale. Come mia zia col trattore.»",
    "«Ha scelto il momento del caffè per distrarsi. Il caffè lo pagherà caro.»",
    "Un anziano annuisce: «Frontale onesto. Si faceva così anche nel '72.»",
  ],
  // il gira ha aggirato chi reggeva
  gira: [
    "«Il muro era perfetto. Peccato che la porta fosse aperta di fianco.»",
    "«Un giro di leno così pulito che qualcuno ha applaudito il vento.»",
    "«Lei regge, l'altra gira: geometria d'alpeggio.»",
  ],
  // l'incoraggia indovinato (recupero pieno)
  incoraggia: [
    "«Due parole all'orecchio e la Reina torna nuova. Il patois fa miracoli.»",
    "«Respira, rumina, riparte. Le fretta non è mai stata di montagna.»",
  ],
};

const SPECIALI: Record<string, string[]> = {
  "incornata-suocera": [
    "Un boato dalla piazza: qualcuno giura di aver sentito la suocera approvare.",
    "«Quella spinta lì ha una storia dietro. Meglio non chiedere quale.»",
  ],
  "spinta-slavina": [
    "«L'hanno sentita fino a Pont-Saint-Martin. Una slavina regolamentare, signori: nessuna si è fatta male, ma che slavina.»",
    "«Quando parte la Slavina non si discute: si prende nota e ci si sposta.»",
  ],
  "fortezza-di-bard": [
    "«Il Forte di Bard, versione bovina. Napoleone, se ci ascolti: prendi nota.»",
    "«Due settimane aspettò l'imperatore. L'avversaria, a occhio, non ne ha.»",
  ],
  "piroetta-genepy": [
    "«Che giro, signori. Il pastore ha già stappato il genepy per la commozione.»",
  ],
  "fohn-furioso": [
    "«Un föhn così non si vedeva da marzo: ha spettinato tre parrucchieri a valle.»",
  ],
  "concerto-campanacci": [
    "«Tutta la valle suona. Persino le campane della parrocchia tengono il tempo.»",
  ],
  "muggito-gransanbernardo": [
    "«Quel muggito ha passato il colle, signori. I cani del Gran San Bernardo hanno risposto: presente.»",
  ],
  "finta-del-casaro": [
    "«Ha finto di andare alla fontina. Ci sarei cascato anch'io, per la fontina.»",
  ],
};

const BARRA_ALTA = [
  "I campanacci suonano già la festa. Prematuro? Forse. Bello? Sì.",
  "«Ancora due passi e la giuria può andare a pranzo.»",
];
const BARRA_BASSA = [
  "«Situazione difficile. Ma le rimonte migliori nascono così, davanti alla polenta.»",
  "«Terreno in salita. D'altra parte qui è tutto in salita.»",
];
const FIATO_BASSO = [
  "{nome} soffia come il föhn di marzo. Serve la parola buona.",
  "«{nome} ha il fiato corto. Il pastore lo sa: adesso si conduce, non si forza.»",
];
const VITTORIA = [
  "«La rivale cede! La piazza è sua, e stasera in stalla si racconta.»",
  "«Vittoria di condotta e di cuore. La fontina stasera ha un altro sapore.»",
];
const SCONFITTA = [
  "«Si ritira a testa alta. In piazza si perde solo se non si impara.»",
  "«Oggi no. Ma le Reines vere tornano: chiedete a chiunque, qui.»",
];
const CONDOTTA = [
  "Sedici azioni e nessuna cede: decide la giuria. Vince chi ha condotto meglio, dice il regolamento. E il regolamento ha ragione.",
];

/** Una battuta di telecronaca per l'evento (o null: non ogni turno merita il microfono). */
export function commenta(e: EventoCronaca, nomi: { p: string; o: string }, sempre = false): string | null {
  // esiti e speciali si commentano sempre; il resto ~40% delle volte
  const importante = e.tipo === "vittoria" || e.tipo === "sconfitta" || e.tipo === "condotta" || e.tipo === "speciale";
  if (!importante && !sempre && Math.random() > 0.4) return null;
  let line: string | null = null;
  switch (e.tipo) {
    case "counter": line = pick(COUNTER[e.famiglia]); break;
    case "speciale": line = SPECIALI[e.mossaId] ? pick(SPECIALI[e.mossaId]) : null; break;
    case "barra": line = pick(e.sopra85 ? BARRA_ALTA : BARRA_BASSA); break;
    case "fiatoBasso": line = pick(FIATO_BASSO).replace(/\{nome\}/g, e.side === "p" ? nomi.p : nomi.o); break;
    case "vittoria": line = pick(VITTORIA); break;
    case "sconfitta": line = pick(SCONFITTA); break;
    case "condotta": line = pick(CONDOTTA); break;
  }
  return line ? `🎙️ ${sost(line, nomi)}` : null;
}

/**
 * Un solo commento (al massimo) per turno, in ordine di priorità:
 * speciale > counter > barra estrema > fiato basso. Helper unico per i 4 UI.
 */
export function cronacaTurno(r: TurnResult, nomi: { p: string; o: string }): string | null {
  const d = r.dettaglio;
  const st = r.state;
  const mossa = d?.mossa ? MOSSE[d.mossa.id] : undefined;
  if (mossa && (mossa.rarita === "speciale" || mossa.rarita === "leggendaria")) {
    return commenta({ tipo: "speciale", mossaId: mossa.id }, nomi);
  }
  if (d && r.counter) {
    // la famiglia che ha VINTO lo scambio: l'azione (counter A) o la postura (counter B)
    const famiglia: AzioneId = r.counter === "A" ? d.famiglia : d.famiglia === "incalza" ? "reggi" : "incalza";
    return commenta({ tipo: "counter", famiglia, vittima: r.counter === "A" ? "o" : "p" }, nomi);
  }
  if (st.esito === "corso") {
    if (st.barra >= 85) return commenta({ tipo: "barra", sopra85: true }, nomi);
    if (st.barra <= 15) return commenta({ tipo: "barra", sopra85: false }, nomi);
    if (st.fiatoP < 30) return commenta({ tipo: "fiatoBasso", side: "p" }, nomi);
  }
  return null;
}

/** Il commento di chiusura (sempre presente): vittoria, sconfitta o giudizio di condotta. */
export function cronacaEsito(won: boolean, condotta: boolean, nomi: { p: string; o: string }): string {
  if (condotta) return commenta({ tipo: "condotta" }, nomi)!;
  return commenta({ tipo: won ? "vittoria" : "sconfitta" }, nomi)!;
}

/**
 * La riga di spiegazione post-turno: COSA è successo e PERCHÉ, coi numeri.
 * Sostituisce il log grezzo quando c'è un counter o una mossa con nome
 * (è il fix del «non spiegate correttamente»). Null = usa il log del motore.
 */
export function spiegaEsito(r: TurnResult): string | null {
  const d = r.dettaglio;
  if (!d) return null;
  const m = d.mossa;
  const avv = d.mossaAvv;
  const nomeM = m ? `${m.emoji} ${m.nome}` : null;
  const nomeAvv = avv ? `${avv.emoji} ${avv.nome}` : null;
  const shift = d.shift !== undefined ? Math.abs(Math.round(d.shift * 10) / 10) : null;

  if (d.counter === "B") {
    // l'azione è stata punita dalla postura avversaria
    if (d.famiglia === "incalza") {
      return `${nomeAvv ?? "🪨 La postura piantata"} ferma ${nomeM ?? "l'incalzata"}: l'urto si spegne${shift !== null ? ` (rimbalzo ${shift})` : ""}.`;
    }
    return `${nomeM ?? "Il giro"} trova il frontale: la postura d'incalzo lo travolge${shift !== null ? ` (terreno −${shift})` : ""}.`;
  }
  if (d.counter === "A") {
    if (d.famiglia === "incalza") return `${nomeM ?? "🐂 L'incalzata"} coglie l'avversaria scoperta: terreno +${shift ?? "…"}!`;
    if (d.famiglia === "gira") return `${nomeM ?? "🌀 Il giro"} aggira la postura piantata: leva di fianco, +${shift ?? "…"}!`;
  }
  // nessun counter: vale la pena nominare solo le mosse non-base
  if (m && MOSSE[m.id] && MOSSE[m.id].rarita !== "comune") {
    if (d.famiglia === "incalza" || d.famiglia === "gira") return `${nomeM}: spinta da ${shift ?? "…"} di terreno.`;
    return `${nomeM}: la Reina ritrova fiato e calma.`;
  }
  return null;
}
