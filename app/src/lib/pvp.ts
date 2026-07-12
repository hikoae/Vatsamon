/**
 * PvP live a turni — livello dati (S9). Nessuna modifica al motore
 * "La Spinta" (lib/spinta.ts): questo file prepara Fighter/Spintatore
 * congelati, chiama applyAzione/eseguiMossa esistenti, e traduce lo stato
 * da/verso i documenti Firestore descritti in `pvpTypes.ts` e vincolati da
 * `../../firestore.rules` (piano Spark, niente Cloud Functions — esiti
 * client-trusted, le rules sono la sola difesa contro un client modificato).
 *
 * DECISIONE DI GIOCO (non imposta dalle rules, solo da `turnOf in [p1,p2]`):
 * il CREATOR della sfida (p1) gioca sempre per primo. Scelta arbitraria ma
 * deterministica — un'alternativa ragionevole sarebbe "chi ha più presa",
 * ma avrebbe reso l'ingaggio meno prevedibile per l'UI senza vantaggio reale.
 */
import {
  collection, doc, getDoc, getDocs, onSnapshot, query, runTransaction,
  serverTimestamp, setDoc, updateDoc, where, orderBy, Timestamp,
  type UpdateData,
} from "firebase/firestore";
import { db } from "./firebase";
import { Fighter } from "./battle";
import {
  AzioneId, SpintaState, Spintatore, initSpinta, spintatoreFromFighter,
} from "./spinta";
import { Mossa, MOSSE, MOSSE_BASE, eseguiMossa } from "../data/mosse";
import {
  PvpChallenge, PvpFighterSnapshot, PvpMatch, PvpMode, PvpMoveset,
  PvpPlayerSlot, PvpSpintaState,
} from "./pvpTypes";

// ─── Errori ────────────────────────────────────────────────────────────────

export class PvpError extends Error {}
/** Doppio tap / race innocua: la UI la ignora in silenzio (niente toast). */
export class PvpNotYourTurnError extends PvpError {}
/** Firestore ha risposto permission-denied: rules non ancora attive in prod,
 *  o il client ha provato una transizione non concessa. Messaggio dedicato
 *  per il caso "rules non ancora pubblicate" (S9 istruzioni, punto c). */
export class PvpPermissionDeniedError extends PvpError {}

function wrapPvpError(err: unknown): PvpError {
  if (err instanceof PvpError) return err;
  const code = (err as { code?: string } | undefined)?.code;
  if (code === "permission-denied") {
    return new PvpPermissionDeniedError("Le sfide online sono in attivazione — riprova tra poco.");
  }
  const msg = (err as Error | undefined)?.message;
  return new PvpError(msg || "Errore sconosciuto nella sfida online.");
}

function requireDb() {
  if (!db) throw new PvpError("Firebase non configurato — le sfide online non sono disponibili offline.");
  return db;
}

// ─── Fighter/snapshot ────────────────────────────────────────────────────

function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

/** Fighter (lib/battle.ts) → istantanea congelata pronta per Firestore.
 *  Cap PvP (decisione operatore, vedi firestore.rules): stat 5..105, livello
 *  1..60, peso 300..850 kg — più stretto del clamp generico di battle.ts. */
export function toFighterSnapshot(f: Fighter): PvpFighterSnapshot {
  return {
    name: (f.name || "Reina").slice(0, 60),
    breed: (f.breed || "?").slice(0, 60),
    level: clampInt(f.level, 1, 60),
    atk: clampInt(f.atk, 5, 105),
    def: clampInt(f.def, 5, 105),
    agi: clampInt(f.agi, 5, 105),
    peso: Math.max(300, Math.min(850, Math.round(f.peso))),
  };
}

/** Istantanea congelata → Fighter per il motore. Nessuna `visual` reale è
 *  persistita nello snapshot (S8, di proposito — niente foto nei documenti
 *  PvP): il combattente avversario mostra un'illustrazione generica per
 *  razza via CowVisual, la propria Reina resta quella vera lato client. */
export function fighterFromSnapshot(snap: PvpFighterSnapshot): Fighter {
  return {
    name: snap.name, breed: snap.breed, level: snap.level,
    atk: snap.atk, def: snap.def, agi: snap.agi, peso: snap.peso,
    visual: { name: snap.name, breed: snap.breed, rarity: "Comune", realPhoto: null },
  };
}

export function spintatoreFromSnapshot(snap: PvpFighterSnapshot): Spintatore {
  return spintatoreFromFighter(fighterFromSnapshot(snap));
}

/** Moveset equipaggiato (Record) → 4 id nell'ordine delle famiglie (l'ordine
 *  non conta per il motore, ma teniamolo stabile per leggibilità). */
export function movesetIdsFromEquipped(mosse: Record<AzioneId, Mossa>): PvpMoveset {
  return [mosse.incalza.id, mosse.reggi.id, mosse.gira.id, mosse.incoraggia.id];
}

/** 4 id congelati → Record<AzioneId,Mossa> per MossePanel/eseguiMossa.
 *  Id sconosciuti/corrotti ricadono sulla base di famiglia (mai uno slot
 *  vuoto) — stesso principio difensivo di mosseEquipaggiate (data/mosse.ts). */
export function mosseFromMoveset(ids: readonly string[]): Record<AzioneId, Mossa> {
  const set: Record<AzioneId, Mossa> = {
    incalza: MOSSE[MOSSE_BASE.incalza], reggi: MOSSE[MOSSE_BASE.reggi],
    gira: MOSSE[MOSSE_BASE.gira], incoraggia: MOSSE[MOSSE_BASE.incoraggia],
  };
  for (const id of ids) {
    const m = MOSSE[id];
    if (m) set[m.famiglia] = m;
  }
  return set;
}

// ─── Stato: SpintaState (motore) <-> PvpSpintaState (Firestore) ───────────

/** Solo i campi del contratto pvpTypes.ts — mai `rng`/`personalita`/`tell*`
 *  (non serializzabili o irrilevanti in PvP: niente lettura/tell tra umani). */
export function toPvpState(s: SpintaState): PvpSpintaState {
  return {
    barra: s.barra, fiatoP: s.fiatoP, fiatoO: s.fiatoO,
    calma: s.calma, calmaO: s.calmaO ?? 80,
    stanceP: s.stanceP, stanceO: s.stanceO,
    turno: s.turno ?? 0, esito: s.esito,
  };
}

/** PvpSpintaState + usiMosse (campo separato sul documento match, vedi
 *  pvpTypes.ts) → SpintaState pronto per applyAzione/eseguiMossa. */
function fromPvpState(st: PvpSpintaState, usiMosse: Record<string, number>): SpintaState {
  return {
    barra: st.barra, fiatoP: st.fiatoP, fiatoO: st.fiatoO,
    calma: st.calma, calmaO: st.calmaO,
    stanceP: st.stanceP, stanceO: st.stanceO,
    turno: st.turno, esito: st.esito,
    usiMosse: { ...usiMosse },
  };
}

/**
 * IL PUNTO PIÙ FACILE DA SBAGLIARE (istruzioni S9): p1 è SEMPRE "P" e p2 è
 * SEMPRE "O" nel documento canonico — ma la UI di p2 deve vedersi come se
 * FOSSE "P" (stessi componenti MossePanel/Combatant di BattleScene, che
 * assumono side="p" = "io"). Questa funzione produce quella vista invertita:
 *   • barraDisplay = 100 - barra (la barra è sempre "vantaggio di P" a 100)
 *   • fiato/calma: swap P<->O
 *   • stance: swap P<->O (la MIA postura in campo diventa stanceP)
 *   • usiMosse: swap dei prefissi "p:"/"o:" (bloccoMossa legge SEMPRE "p:")
 *   • esito: "vinto" (P ha vinto) diventa "perso" per p2 e viceversa
 * NON tocca `turno` (condiviso, non ha lato).
 */
function mirrorSpintaStateForO(s: SpintaState): SpintaState {
  const usi: Record<string, number> = {};
  for (const [k, v] of Object.entries(s.usiMosse ?? {})) {
    if (k.startsWith("p:")) usi["o:" + k.slice(2)] = v;
    else if (k.startsWith("o:")) usi["p:" + k.slice(2)] = v;
    else usi[k] = v;
  }
  return {
    barra: 100 - s.barra,
    fiatoP: s.fiatoO, fiatoO: s.fiatoP,
    calma: s.calmaO ?? 80, calmaO: s.calma,
    stanceP: s.stanceO, stanceO: s.stanceP,
    turno: s.turno,
    usiMosse: usi,
    esito: s.esito === "vinto" ? "perso" : s.esito === "perso" ? "vinto" : "corso",
  };
}

export function slotForUid(match: Pick<PvpMatch, "players">, uid: string): PvpPlayerSlot | null {
  if (match.players.p1.uid === uid) return "p1";
  if (match.players.p2.uid === uid) return "p2";
  return null;
}

/** Tutto ciò che serve a PvpBattleScene per renderizzare la partita dal
 *  punto di vista di `myUid`, con la vista GIÀ invertita per p2. */
export interface PvpView {
  mySlot: PvpPlayerSlot;
  oppSlot: PvpPlayerSlot;
  engineSide: "p" | "o";
  isMyTurn: boolean;
  /** Stato pronto per MossePanel/bloccoMossa (side "p" = sempre "io"). */
  displayState: SpintaState;
  myMoveset: Record<AzioneId, Mossa>;
  oppMoveset: Record<AzioneId, Mossa>;
  myFighter: PvpFighterSnapshot;
  oppFighter: PvpFighterSnapshot;
  myNickname: string;
  oppNickname: string;
  myFiatoMax: number;
  oppFiatoMax: number;
  /** null finché `status==="active"`; altrimenti true/false rispetto a me. */
  amWinner: boolean | null;
}

export function buildPvpView(match: PvpMatch, myUid: string): PvpView {
  const mySlot = slotForUid(match, myUid);
  if (!mySlot) throw new PvpError("Non fai parte di questa partita.");
  const oppSlot: PvpPlayerSlot = mySlot === "p1" ? "p2" : "p1";
  const engineSide: "p" | "o" = mySlot === "p1" ? "p" : "o";
  const raw = fromPvpState(match.state, match.usiMosse ?? {});
  const displayState = mySlot === "p1" ? raw : mirrorSpintaStateForO(raw);
  const myFighter = match.fighters[mySlot];
  const oppFighter = match.fighters[oppSlot];
  return {
    mySlot, oppSlot, engineSide,
    isMyTurn: match.status === "active" && match.turnOf === mySlot,
    displayState,
    myMoveset: mosseFromMoveset(match.moveset[mySlot]),
    oppMoveset: mosseFromMoveset(match.moveset[oppSlot]),
    myFighter, oppFighter,
    myNickname: match.players[mySlot].nickname,
    oppNickname: match.players[oppSlot].nickname,
    myFiatoMax: spintatoreFromSnapshot(myFighter).fiatoMax,
    oppFiatoMax: spintatoreFromSnapshot(oppFighter).fiatoMax,
    amWinner: (match.status === "finished" || match.status === "abandoned")
      ? match.winnerUid === myUid
      : null,
  };
}

// ─── Codice sfida (capability) ─────────────────────────────────────────────

// Crockford base32 senza caratteri ambigui (0/O, 1/I/L) — leggibile a voce
// e via Web Share tra due allevatori.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LEN = 7;

export function generateChallengeCode(): string {
  const bytes = new Uint8Array(CODE_LEN);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < CODE_LEN; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

// ─── Challenge ──────────────────────────────────────────────────────────

export interface CreateChallengeParams {
  creatorUid: string;
  creatorNickname: string;
  mode: PvpMode;
  turnDurationMs: number;
  fighter: Fighter;
  moveset: PvpMoveset;
}

/** Crea `pvpChallenges/{code}` con un codice ad alta entropia generato lato
 *  client (il codice È la capability, vedi firestore.rules). Retry su
 *  collisione (probabilità trascurabile: 30^7 ≈ 2.2×10^10 combinazioni). */
export async function createChallenge(params: CreateChallengeParams): Promise<string> {
  const database = requireDb();
  const fighterSnapshot = toFighterSnapshot(params.fighter);
  const expiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 3600 * 1000);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateChallengeCode();
    const ref = doc(database, "pvpChallenges", code);
    try {
      await runTransaction(database, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) throw new PvpError("__collision__");
        tx.set(ref, {
          creatorUid: params.creatorUid,
          creatorNickname: params.creatorNickname.slice(0, 40) || "Allevatore",
          mode: params.mode,
          turnDurationMs: Math.round(params.turnDurationMs),
          fighterSnapshot,
          moveset: params.moveset,
          status: "open",
          expiresAt,
        });
      });
      return code;
    } catch (err) {
      if (err instanceof PvpError && err.message === "__collision__") continue;
      throw wrapPvpError(err);
    }
  }
  throw new PvpError("Impossibile generare un codice sfida univoco. Riprova.");
}

export async function getChallengePreview(code: string): Promise<(PvpChallenge & { id: string }) | null> {
  const database = requireDb();
  try {
    const snap = await getDoc(doc(database, "pvpChallenges", code.toUpperCase()));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as PvpChallenge) };
  } catch (err) {
    throw wrapPvpError(err);
  }
}

export async function cancelChallenge(code: string): Promise<void> {
  const database = requireDb();
  try {
    await updateDoc(doc(database, "pvpChallenges", code), { status: "cancelled" });
  } catch (err) {
    throw wrapPvpError(err);
  }
}

export interface AcceptChallengeParams {
  code: string;
  acceptorUid: string;
  acceptorNickname: string;
  fighter: Fighter;
  moveset: PvpMoveset;
}

/**
 * Accetta una sfida e crea la partita. DUE WRITE SEQUENZIALI E SEPARATE
 * (mai in una singola transazione/batch): le rules di create su
 * `pvpMatches/{matchId}` leggono la challenge con `get()`, che vede SOLO
 * l'ultimo stato COMMESSO — se accept+create fossero nella stessa
 * transazione, il `get()` vedrebbe ancora la challenge "open" e il create
 * verrebbe respinto (vedi commento in firestore.rules su `chal()`).
 */
export async function acceptChallenge(params: AcceptChallengeParams): Promise<string> {
  const database = requireDb();
  const challengeRef = doc(database, "pvpChallenges", params.code);
  const matchId = doc(collection(database, "pvpMatches")).id;

  let challenge: PvpChallenge;
  try {
    challenge = await runTransaction(database, async (tx) => {
      const snap = await tx.get(challengeRef);
      if (!snap.exists()) throw new PvpError("Codice sfida non trovato.");
      const c = snap.data() as PvpChallenge;
      if (c.status !== "open") throw new PvpError("Questa sfida non è più disponibile.");
      if (c.creatorUid === params.acceptorUid) throw new PvpError("Non puoi accettare la tua stessa sfida.");
      if (c.expiresAt.toMillis() < Date.now()) throw new PvpError("Questa sfida è scaduta.");
      tx.update(challengeRef, { status: "accepted", matchId, acceptorUid: params.acceptorUid });
      return c;
    });
  } catch (err) {
    throw wrapPvpError(err);
  }

  const p1Fighter = fighterFromSnapshot(challenge.fighterSnapshot);
  const p2Snapshot = toFighterSnapshot(params.fighter);
  const p2Fighter = fighterFromSnapshot(p2Snapshot);
  const initial = toPvpState(initSpinta(spintatoreFromFighter(p1Fighter), spintatoreFromFighter(p2Fighter)));
  const now = Date.now();

  try {
    await setDoc(doc(database, "pvpMatches", matchId), {
      status: "active",
      mode: challenge.mode,
      challengeCode: params.code,
      turnDurationMs: challenge.turnDurationMs,
      players: {
        p1: { uid: challenge.creatorUid, nickname: challenge.creatorNickname },
        p2: { uid: params.acceptorUid, nickname: params.acceptorNickname.slice(0, 40) || "Allevatore" },
      },
      playerUids: [challenge.creatorUid, params.acceptorUid],
      fighters: { p1: challenge.fighterSnapshot, p2: p2Snapshot },
      moveset: { p1: challenge.moveset, p2: params.moveset },
      usiMosse: {},
      state: initial,
      turnOf: "p1" as PvpPlayerSlot, // il creator apre la spinta (decisione di gioco, vedi header file)
      turnNumber: 0,
      turnDeadline: Timestamp.fromMillis(now + challenge.turnDurationMs),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    // La sfida è già "accepted" con questo matchId: un retry di questa stessa
    // funzione con lo stesso `code` fallirebbe su `status!=="open"`. Il
    // chiamante deve invece riprovare SOLO il create leggendo la challenge
    // già accettata — la UI espone questo come "riprova ad aprire il codice".
    throw wrapPvpError(err);
  }
  return matchId;
}

// ─── Mossa ─────────────────────────────────────────────────────────────

/**
 * Gioca una mossa. `runTransaction` rilegge SEMPRE turnNumber/turnOf freschi
 * (rilegge lo stato dal server, non da uno snapshot locale stale) — così un
 * doppio tap ravvicinato non produce due scritture: il secondo tentativo
 * vede `turnOf` già toccato e lancia `PvpNotYourTurnError` (la UI lo ignora
 * in silenzio, il primo tap ha già vinto la corsa).
 */
export async function submitMove(matchId: string, myUid: string, mossaId: string): Promise<void> {
  const database = requireDb();
  const matchRef = doc(database, "pvpMatches", matchId);
  try {
    await runTransaction(database, async (tx) => {
      const snap = await tx.get(matchRef);
      if (!snap.exists()) throw new PvpError("Partita non trovata.");
      const match = snap.data() as PvpMatch;
      if (match.status !== "active") throw new PvpError("La partita è già conclusa.");
      const mySlot = slotForUid(match, myUid);
      if (!mySlot) throw new PvpError("Non fai parte di questa partita.");
      if (match.turnOf !== mySlot) throw new PvpNotYourTurnError("Non è il tuo turno.");
      const oppSlot: PvpPlayerSlot = mySlot === "p1" ? "p2" : "p1";
      const engineSide: "p" | "o" = mySlot === "p1" ? "p" : "o";
      if (!match.moveset[mySlot].includes(mossaId)) throw new PvpError("Questa mossa non è nel tuo corredo.");

      const A = spintatoreFromSnapshot(match.fighters[mySlot]);
      const B = spintatoreFromSnapshot(match.fighters[oppSlot]);
      const stateIn = fromPvpState(match.state, match.usiMosse ?? {});
      const r = eseguiMossa(engineSide, mossaId, stateIn, A, B);
      const newState = toPvpState(r.state);
      const newUsiMosse = r.state.usiMosse ?? {};
      const finished = newState.esito !== "corso";
      const appliedMossaId = r.dettaglio?.mossa?.id ?? mossaId;
      const famiglia = r.dettaglio?.famiglia ?? "incalza";

      const payload: UpdateData<PvpMatch> = {
        state: newState,
        usiMosse: newUsiMosse,
        turnNumber: newState.turno,
        lastMove: { by: mySlot, azione: famiglia, mossaId: appliedMossaId, log: r.log },
        updatedAt: serverTimestamp(),
      };
      if (finished) {
        payload.status = "finished";
        payload.winnerUid = newState.esito === "vinto" ? match.players.p1.uid : match.players.p2.uid;
      } else {
        payload.status = "active";
        payload.turnOf = oppSlot;
        payload.turnDeadline = Timestamp.fromMillis(Date.now() + match.turnDurationMs);
      }
      tx.update(matchRef, payload);

      const moveRef = doc(database, "pvpMatches", matchId, "moves", String(match.turnNumber));
      tx.set(moveRef, {
        by: myUid, azione: famiglia, mossaId: appliedMossaId,
        stateAfter: newState, log: r.log, at: serverTimestamp(),
      });
    });
  } catch (err) {
    throw wrapPvpError(err);
  }
}

// ─── Timeout / abbandono ────────────────────────────────────────────────

export async function claimTimeout(matchId: string, myUid: string): Promise<void> {
  const database = requireDb();
  const matchRef = doc(database, "pvpMatches", matchId);
  try {
    const snap = await getDoc(matchRef);
    if (!snap.exists()) throw new PvpError("Partita non trovata.");
    const match = snap.data() as PvpMatch;
    if (match.status !== "active") throw new PvpError("La partita è già conclusa.");
    if (match.turnDeadline.toMillis() > Date.now()) throw new PvpError("Il turno dell'avversario non è ancora scaduto.");
    const turnOfUid = match.players[match.turnOf].uid;
    if (turnOfUid === myUid) throw new PvpError("Tocca a te: non puoi reclamare il timeout sul tuo turno.");
    await updateDoc(matchRef, {
      status: "finished", winnerUid: myUid, forfeitedBy: turnOfUid, updatedAt: serverTimestamp(),
    });
  } catch (err) {
    throw wrapPvpError(err);
  }
}

/** Ritiro volontario (mirror del bottone "Ritìrati" di BattleScene). */
export async function abandonMatch(matchId: string, myUid: string): Promise<void> {
  const database = requireDb();
  const matchRef = doc(database, "pvpMatches", matchId);
  try {
    const snap = await getDoc(matchRef);
    if (!snap.exists()) throw new PvpError("Partita non trovata.");
    const match = snap.data() as PvpMatch;
    if (match.status !== "active") throw new PvpError("La partita è già conclusa.");
    const mySlot = slotForUid(match, myUid);
    if (!mySlot) throw new PvpError("Non fai parte di questa partita.");
    const winnerUid = mySlot === "p1" ? match.players.p2.uid : match.players.p1.uid;
    await updateDoc(matchRef, {
      status: "abandoned", forfeitedBy: myUid, winnerUid, updatedAt: serverTimestamp(),
    });
  } catch (err) {
    throw wrapPvpError(err);
  }
}

// ─── Liste / sottoscrizioni ─────────────────────────────────────────────

/** One-shot (mai un listener persistente in idle, vedi istruzioni S9 punto
 *  d): usata all'apertura dell'hub per popolare la lista partite + il
 *  conteggio "tocca a te in N partite" di corrispondenza. */
export async function listMyMatches(uid: string): Promise<(PvpMatch & { id: string })[]> {
  const database = requireDb();
  try {
    const q = query(
      collection(database, "pvpMatches"),
      where("playerUids", "array-contains", uid),
      orderBy("updatedAt", "desc"),
    );
    const snaps = await getDocs(q);
    return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as PvpMatch) }));
  } catch (err) {
    throw wrapPvpError(err);
  }
}

/** Listener live — SOLO mentre una partita è effettivamente aperta a schermo
 *  (PvpBattleScene), mai mentre si è fermi nell'hub. */
export function subscribeMatch(
  matchId: string,
  onChange: (m: (PvpMatch & { id: string }) | null) => void,
  onError: (err: PvpError) => void,
): () => void {
  let database;
  try {
    database = requireDb();
  } catch (err) {
    onError(wrapPvpError(err));
    return () => {};
  }
  const ref = doc(database, "pvpMatches", matchId);
  return onSnapshot(
    ref,
    (snap) => onChange(snap.exists() ? { id: snap.id, ...(snap.data() as PvpMatch) } : null),
    (err) => onError(wrapPvpError(err)),
  );
}
