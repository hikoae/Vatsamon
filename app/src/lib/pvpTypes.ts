import type { Timestamp } from "firebase/firestore";
import { AzioneId } from "./spinta";

/**
 * Tipi PvP live a turni — specchiano 1:1 lo schema Firestore validato da
 * `../../firestore.rules` (S8, 2026-07-12). Solo forme di dato: nessuna
 * logica qui. Il motore di risoluzione resta "La Spinta" (lib/spinta.ts);
 * questo file esiste per far concordare client e regole sul contratto dei
 * documenti `pvpChallenges`, `pvpMatches` e la subcollection `moves`.
 *
 * LEVEL CAP UFFICIALE: 60 (decisione operatore). Sanity-cap fighterSnapshot:
 * stat 5-105, peso 300-850 kg — vedi `validFighterSnapshot` nelle rules.
 */

export type PvpMode = "live" | "corrispondenza";
export type PvpChallengeStatus = "open" | "accepted" | "cancelled" | "expired";
export type PvpMatchStatus = "active" | "finished" | "abandoned";
export type PvpPlayerSlot = "p1" | "p2";

/** Istantanea congelata di un combattente al momento della sfida (sottoinsieme
 *  di Fighter, lib/battle.ts): solo i campi che la Spinta usa davvero. */
export interface PvpFighterSnapshot {
  name: string;
  breed: string;
  level: number; // int, 1..60
  atk: number;   // 5..105 — presa (leva di corna)
  def: number;   // 5..105 — piccolo bonus di massa
  agi: number;   // 5..105 — volontà/fiato
  peso: number;  // kg reali, 300..850 — massa nella Spinta
}

/** Moveset congelato: esattamente 4 id di mosse (data/mosse.ts), una per
 *  famiglia (FAMIGLIE = incalza/reggi/gira/incoraggia, ordine libero: il
 *  motore risolve per famiglia della mossa, non per posizione nell'array). */
export type PvpMoveset = [string, string, string, string];

export interface PvpPlayerRef {
  uid: string;
  nickname: string;
}

/** pvpChallenges/{code} — codice di invito. Lettura per-id "a capability"
 *  (chi conosce il codice legge), mai list. */
export interface PvpChallenge {
  creatorUid: string;
  creatorNickname: string;
  mode: PvpMode;
  turnDurationMs: number; // 5_000..259_200_000 (5s..3gg)
  fighterSnapshot: PvpFighterSnapshot;
  moveset: PvpMoveset;
  status: PvpChallengeStatus;
  expiresAt: Timestamp; // < createdAt + 8gg
  matchId?: string; // scritto solo alla transizione open -> accepted
}

/**
 * SpintaState serializzato per Firestore. Mapping FISSO per l'intera
 * partita: p1 = sempre il lato "P" del motore, p2 = sempre il lato "O".
 * Sottoinsieme di SpintaState (lib/spinta.ts:125-147): solo i campi che le
 * regole validano e che servono al replay/alla UI del match.
 */
export interface PvpSpintaState {
  barra: number;                 // 0..100
  fiatoP: number;                // 0..fiatoMax(fighters.p1.agi)
  fiatoO: number;                // 0..fiatoMax(fighters.p2.agi)
  calma: number;                  // 0..100
  calmaO: number;                 // 0..100
  stanceP: AzioneId | null;
  stanceO: AzioneId | null;
  turno: number;                  // 0..MAX_TURNI (16)
  esito: "corso" | "vinto" | "perso";
}

export interface PvpLastMove {
  by: PvpPlayerSlot;
  azione: AzioneId;
  mossaId: string | null;
  log: string;
}

/** pvpMatches/{matchId} — partita live/per corrispondenza. Leggibile SOLO
 *  dai due uid in `playerUids` (query sempre con
 *  where('playerUids','array-contains', uid)). */
export interface PvpMatch {
  status: PvpMatchStatus;
  mode: PvpMode;
  players: { p1: PvpPlayerRef; p2: PvpPlayerRef };
  playerUids: [string, string]; // = [players.p1.uid, players.p2.uid]
  fighters: { p1: PvpFighterSnapshot; p2: PvpFighterSnapshot }; // immutabili post-create
  moveset: { p1: PvpMoveset; p2: PvpMoveset };                   // immutabili post-create
  usiMosse: Record<string, number>; // specchia SpintaState.usiMosse (usi per spinta)
  state: PvpSpintaState;
  turnOf: PvpPlayerSlot;
  turnNumber: number; // == state.turno; avanza di 1 esatto per mossa accettata
  turnDeadline: Timestamp;
  lastMove?: PvpLastMove;
  winnerUid?: string;
  forfeitedBy?: string;
  rematchOf?: string; // matchId della partita precedente, se rivincita
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * pvpMatches/{matchId}/moves/{turnNumber} — log append-only, immutabile
 * (nessun update/delete concesso dalle rules). `turnNumber` nel path = il
 * turno PRIMA che questa mossa venga applicata (0 per la prima mossa): vedi
 * il commento sul mapping in firestore.rules per il perché di questa scelta.
 */
export interface PvpMove {
  by: string; // uid di chi ha giocato la mossa
  azione: AzioneId;
  mossaId: string | null;
  stateAfter: PvpSpintaState;
  log: string;
  at: Timestamp;
}
