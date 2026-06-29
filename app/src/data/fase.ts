/**
 * MOTORE DI FASE — `faseCorrente(oggi, CALENDAR)`.
 *
 * Un'unica fonte di verità sul "dove siamo" nella stagione reale 2026, derivata
 * dal calendario ufficiale. Alimenta l'hub (cosa sta succedendo ora), l'HUD
 * (banda stagione) e — a regime — le soglie di categoria per fase.
 */
import { CALENDAR, SEASON_META, SeasonEvent } from "./season";

export type FaseId = "preseason" | "primavera" | "inalpa" | "estate" | "autunno" | "finale" | "postseason";

export interface FaseStato {
  id: FaseId;
  label: string;
  labelFr: string;
  emoji: string;
  nota: string;
  notaFr: string;
  prossimo: SeasonEvent | null; // prossima bataille in calendario
  giorniAllaFinale: number;     // <0 = finale passata
}

const META: Record<FaseId, { label: string; labelFr: string; emoji: string; nota: string; notaFr: string }> = {
  preseason:  { label: "Pre-stagione",  labelFr: "Avant-saison",   emoji: "🌱", nota: "Le mandrie si preparano: la stagione deve ancora cominciare.", notaFr: "Les troupeaux se préparent : la saison n'a pas encore commencé." },
  primavera:  { label: "Primaverili",   labelFr: "Printanières",   emoji: "🌸", nota: "Eliminatorie di primavera in corso nei comuni della Valle.",   notaFr: "Éliminatoires de printemps en cours dans les communes." },
  inalpa:     { label: "Inalpa",        labelFr: "Inalpe",         emoji: "⛰️", nota: "Le mandrie sono all'alpeggio: pausa estiva, si riprende ad agosto.", notaFr: "Les troupeaux sont à l'alpage : pause estivale jusqu'en août." },
  estate:     { label: "Estive",        labelFr: "Estivales",      emoji: "☀️", nota: "Eliminatorie estive: la corsa alla Croix-Noire entra nel vivo.",  notaFr: "Éliminatoires d'été : la course à la Croix-Noire s'intensifie." },
  autunno:    { label: "Autunnali",     labelFr: "Automnales",     emoji: "🍂", nota: "Ultime eliminatorie: si decidono le qualificate alla finale.",    notaFr: "Dernières éliminatoires : on décide les qualifiées pour la finale." },
  finale:     { label: "Finale",        labelFr: "Finale",         emoji: "👑", nota: "Finale regionale alla Croix-Noire: si incoronano le Reines des Reines!", notaFr: "Finale régionale à la Croix-Noire : on couronne les Reines des Reines !" },
  postseason: { label: "Post-stagione", labelFr: "Après-saison",   emoji: "🏅", nota: "Stagione conclusa: la Désarpa e l'Albo d'Onore. Ci si rivede l'anno prossimo.", notaFr: "Saison terminée : la Désarpe et le Livre d'Honneur. À l'année prochaine." },
};

function daysBetween(aISO: string, bISO: string): number {
  const a = Date.parse(aISO + "T00:00:00Z");
  const b = Date.parse(bISO + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}

/** Mappa la fase di un SeasonEvent (granulare) sulla macro-fase dell'HUD. */
function macroFromEvent(f: SeasonEvent["fase"]): FaseId {
  if (f === "primavera") return "primavera";
  if (f === "estate") return "estate";
  if (f === "autunno" || f === "autunno-finale") return "autunno";
  if (f === "finale") return "finale";
  return "estate";
}

/** Determina la fase corrente della stagione dato il giorno (ISO yyyy-mm-dd). */
export function faseCorrente(todayISO: string, calendar: SeasonEvent[] = CALENDAR): FaseStato {
  const finaleISO = SEASON_META.finale.data;
  const batailles = calendar.filter((e) => e.kind === "bataille").sort((a, b) => a.data.localeCompare(b.data));
  const pausa = calendar.find((e) => e.kind === "pausa");
  const firstISO = batailles[0]?.data ?? finaleISO;

  const prossimo = batailles.find((e) => e.data >= todayISO) ?? null;
  const giorniAllaFinale = daysBetween(todayISO, finaleISO);

  let id: FaseId;
  if (todayISO < firstISO) id = "preseason";
  else if (todayISO > finaleISO) id = "postseason";
  else if (todayISO === finaleISO) id = "finale";
  else if (pausa && pausa.dataFine && todayISO >= pausa.data && todayISO < pausa.dataFine) id = "inalpa";
  else {
    // fase dell'ultima bataille disputata/iniziata entro oggi (o della prossima)
    const passate = batailles.filter((e) => e.data <= todayISO);
    const rif = passate.length ? passate[passate.length - 1] : batailles[0];
    id = macroFromEvent(rif.fase);
  }

  return { id, ...META[id], prossimo, giorniAllaFinale };
}
