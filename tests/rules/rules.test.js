// Test suite per firestore.rules (Vatsamon GO).
// Esegue contro il Firestore Emulator via @firebase/rules-unit-testing.
// Vedi README.md in questa cartella per come lanciarli.

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = join(__dirname, '..', '..', 'firestore.rules');

/** @type {import('@firebase/rules-unit-testing').RulesTestEnvironment} */
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'vatsamon-rules-test',
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

const OWNER_UID = 'owner-uid';
const OTHER_UID = 'other-uid';

function asOwner() {
  return testEnv.authenticatedContext(OWNER_UID).firestore();
}
function asOther() {
  return testEnv.authenticatedContext(OTHER_UID).firestore();
}
function asAnon() {
  return testEnv.unauthenticatedContext().firestore();
}

async function seedAsAdmin(path, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
}

// --- saves/{uid} ---------------------------------------------------------

test('saves/{uid}: owner può leggere il proprio salvataggio', async () => {
  await seedAsAdmin(`saves/${OWNER_UID}`, { level: 1 });
  await assertSucceeds(getDoc(doc(asOwner(), `saves/${OWNER_UID}`)));
});

test('saves/{uid}: owner può scrivere il proprio salvataggio', async () => {
  await assertSucceeds(setDoc(doc(asOwner(), `saves/${OWNER_UID}`), { level: 2 }));
});

test('saves/{uid}: un altro utente autenticato NON può leggere il salvataggio altrui', async () => {
  await seedAsAdmin(`saves/${OWNER_UID}`, { level: 1 });
  await assertFails(getDoc(doc(asOther(), `saves/${OWNER_UID}`)));
});

test('saves/{uid}: un altro utente autenticato NON può scrivere sul salvataggio altrui', async () => {
  await assertFails(setDoc(doc(asOther(), `saves/${OWNER_UID}`), { level: 999 }));
});

test('saves/{uid}: utente anonimo NON può leggere', async () => {
  await seedAsAdmin(`saves/${OWNER_UID}`, { level: 1 });
  await assertFails(getDoc(doc(asAnon(), `saves/${OWNER_UID}`)));
});

// --- users/{uid} -----------------------------------------------------------

test('users/{uid}: owner può leggere/scrivere il proprio profilo', async () => {
  await assertSucceeds(setDoc(doc(asOwner(), `users/${OWNER_UID}`), { name: 'Test' }));
  await assertSucceeds(getDoc(doc(asOwner(), `users/${OWNER_UID}`)));
});

test('users/{uid}: un altro utente NON può scrivere sul profilo altrui', async () => {
  await assertFails(setDoc(doc(asOther(), `users/${OWNER_UID}`), { name: 'Hacked' }));
});

// --- leaderboard/{uid} ------------------------------------------------------

test('leaderboard/{uid}: qualunque utente autenticato può leggere la riga di un altro', async () => {
  await seedAsAdmin(`leaderboard/${OWNER_UID}`, { score: 100 });
  await assertSucceeds(getDoc(doc(asOther(), `leaderboard/${OWNER_UID}`)));
});

test('leaderboard/{uid}: owner può scrivere la propria riga', async () => {
  await assertSucceeds(setDoc(doc(asOwner(), `leaderboard/${OWNER_UID}`), { score: 100 }));
});

test('leaderboard/{uid}: un altro utente NON può scrivere la riga altrui', async () => {
  await assertFails(setDoc(doc(asOther(), `leaderboard/${OWNER_UID}`), { score: 99999 }));
});

test('leaderboard/{uid}: utente anonimo NON può leggere', async () => {
  await seedAsAdmin(`leaderboard/${OWNER_UID}`, { score: 100 });
  await assertFails(getDoc(doc(asAnon(), `leaderboard/${OWNER_UID}`)));
});

// --- collection sconosciute / battles (deny-by-default) --------------------

test('battles/{id}: NON esiste una rule dedicata -> deny anche per utente autenticato (lettura)', async () => {
  await seedAsAdmin('battles/some-battle', { p1: OWNER_UID, p2: OTHER_UID });
  await assertFails(getDoc(doc(asOwner(), 'battles/some-battle')));
});

test('battles/{id}: deny anche in scrittura per utente autenticato', async () => {
  await assertFails(setDoc(doc(asOwner(), 'battles/some-battle'), { p1: OWNER_UID }));
});

test('collection arbitraria non mappata: deny totale (lettura e scrittura)', async () => {
  await assertFails(getDoc(doc(asOwner(), 'totally-unknown-collection/doc1')));
  await assertFails(setDoc(doc(asOwner(), 'totally-unknown-collection/doc1'), { x: 1 }));
});

// --- PvP (S8) --------------------------------------------------------------
// Copre pvpChallenges/{code}, pvpMatches/{matchId} e pvpMatches/{matchId}/moves/{turnNumber}.
// Vedi firestore.rules per il commento sul mapping p1="P"/p2="O" e sul
// significato di `turnNumber` nel path delle mosse (= turno PRIMA della mossa).

const P1_UID = 'pvp-p1-uid';
const P2_UID = 'pvp-p2-uid';
const P3_UID = 'pvp-p3-uid'; // terzo utente, mai parte della partita

function asP1() { return testEnv.authenticatedContext(P1_UID).firestore(); }
function asP2() { return testEnv.authenticatedContext(P2_UID).firestore(); }
function asP3() { return testEnv.authenticatedContext(P3_UID).firestore(); }

const VALID_FIGHTER = { name: 'Test Reina', breed: 'Valdostana', level: 10, atk: 50, def: 50, agi: 60, peso: 500 };
const VALID_MOVESET = ['m1', 'm2', 'm3', 'm4'];

function futureTs(msFromNow) { return Timestamp.fromMillis(Date.now() + msFromNow); }
function pastTs(msAgo = 60_000) { return Timestamp.fromMillis(Date.now() - msAgo); }

function baseChallenge(overrides = {}) {
  return {
    creatorUid: P1_UID,
    creatorNickname: 'Meme',
    mode: 'live',
    turnDurationMs: 60_000,
    fighterSnapshot: VALID_FIGHTER,
    moveset: VALID_MOVESET,
    status: 'open',
    expiresAt: futureTs(24 * 60 * 60 * 1000),
    ...overrides,
  };
}

function baseState(overrides = {}) {
  return {
    barra: 50, fiatoP: 160, fiatoO: 160, calma: 80, calmaO: 80,
    stanceP: null, stanceO: null, turno: 0, esito: 'corso',
    ...overrides,
  };
}

function baseMatch(overrides = {}) {
  return {
    status: 'active',
    mode: 'live',
    players: { p1: { uid: P1_UID, nickname: 'P1' }, p2: { uid: P2_UID, nickname: 'P2' } },
    playerUids: [P1_UID, P2_UID],
    fighters: { p1: VALID_FIGHTER, p2: VALID_FIGHTER },
    moveset: { p1: VALID_MOVESET, p2: VALID_MOVESET },
    usiMosse: {},
    state: baseState(),
    turnOf: 'p1',
    turnNumber: 0,
    turnDeadline: futureTs(5 * 60 * 1000),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

// --- pvpChallenges/{code} ---------------------------------------------------

test('pvpChallenges: create valido dal creator riesce', async () => {
  await assertSucceeds(setDoc(doc(asP1(), 'pvpChallenges/code1'), baseChallenge()));
});

test('pvpChallenges: create fallisce se creatorUid non è request.auth.uid', async () => {
  await assertFails(setDoc(doc(asP1(), 'pvpChallenges/code2'), baseChallenge({ creatorUid: P2_UID })));
});

test('pvpChallenges: create fallisce con stat oltre il cap (agi 110 > 105)', async () => {
  const f = { ...VALID_FIGHTER, agi: 110 };
  await assertFails(setDoc(doc(asP1(), 'pvpChallenges/code3'), baseChallenge({ fighterSnapshot: f })));
});

test('pvpChallenges: create fallisce con level oltre il cap (65 > 60)', async () => {
  const f = { ...VALID_FIGHTER, level: 65 };
  await assertFails(setDoc(doc(asP1(), 'pvpChallenges/code4'), baseChallenge({ fighterSnapshot: f })));
});

test('pvpChallenges: create fallisce con peso fuori range (900 > 850)', async () => {
  const f = { ...VALID_FIGHTER, peso: 900 };
  await assertFails(setDoc(doc(asP1(), 'pvpChallenges/code5'), baseChallenge({ fighterSnapshot: f })));
});

test('pvpChallenges: create fallisce con moveset di size diversa da 4', async () => {
  await assertFails(setDoc(doc(asP1(), 'pvpChallenges/code6'), baseChallenge({ moveset: ['m1', 'm2', 'm3'] })));
});

test('pvpChallenges: create fallisce con expiresAt oltre 8 giorni', async () => {
  await assertFails(setDoc(doc(asP1(), 'pvpChallenges/code7'),
    baseChallenge({ expiresAt: futureTs(9 * 24 * 60 * 60 * 1000) })));
});

test('pvpChallenges: get libero a qualunque autenticato che conosce il codice', async () => {
  await seedAsAdmin('pvpChallenges/code8', baseChallenge());
  await assertSucceeds(getDoc(doc(asP3(), 'pvpChallenges/code8')));
});

test('pvpChallenges: accept dal non-creator riesce e scrive solo status+matchId', async () => {
  await seedAsAdmin('pvpChallenges/code9', baseChallenge());
  await assertSucceeds(updateDoc(doc(asP2(), 'pvpChallenges/code9'), { status: 'accepted', matchId: 'match-1' }));
});

test('pvpChallenges: accept dal creator stesso fallisce', async () => {
  await seedAsAdmin('pvpChallenges/code10', baseChallenge());
  await assertFails(updateDoc(doc(asP1(), 'pvpChallenges/code10'), { status: 'accepted', matchId: 'match-2' }));
});

test('pvpChallenges: accept che tocca anche fighterSnapshot fallisce (fuori da hasOnly)', async () => {
  await seedAsAdmin('pvpChallenges/code11', baseChallenge());
  await assertFails(updateDoc(doc(asP2(), 'pvpChallenges/code11'),
    { status: 'accepted', matchId: 'match-3', fighterSnapshot: { ...VALID_FIGHTER, level: 1 } }));
});

test('pvpChallenges: cancel dal creator su open riesce', async () => {
  await seedAsAdmin('pvpChallenges/code12', baseChallenge());
  await assertSucceeds(updateDoc(doc(asP1(), 'pvpChallenges/code12'), { status: 'cancelled' }));
});

test('pvpChallenges: cancel da un non-creator fallisce', async () => {
  await seedAsAdmin('pvpChallenges/code13', baseChallenge());
  await assertFails(updateDoc(doc(asP2(), 'pvpChallenges/code13'), { status: 'cancelled' }));
});

test('pvpChallenges: marcatura expired fallisce se expiresAt non è ancora passato', async () => {
  await seedAsAdmin('pvpChallenges/code14', baseChallenge({ expiresAt: futureTs(60_000) }));
  await assertFails(updateDoc(doc(asP3(), 'pvpChallenges/code14'), { status: 'expired' }));
});

test('pvpChallenges: marcatura expired riesce (da chiunque autenticato) se expiresAt è passato', async () => {
  await seedAsAdmin('pvpChallenges/code15', baseChallenge({ expiresAt: pastTs() }));
  await assertSucceeds(updateDoc(doc(asP3(), 'pvpChallenges/code15'), { status: 'expired' }));
});

// --- pvpMatches/{matchId} ---------------------------------------------------

test('pvpMatches: create valido da uno dei due players riesce', async () => {
  await assertSucceeds(setDoc(doc(asP1(), 'pvpMatches/m1'), baseMatch()));
});

test('pvpMatches: create fallisce se request.auth.uid non è tra i playerUids', async () => {
  await assertFails(setDoc(doc(asP3(), 'pvpMatches/m2'), baseMatch()));
});

test('pvpMatches: create fallisce con stat fighters.p2 oltre il cap', async () => {
  const bad = { ...VALID_FIGHTER, atk: 200 };
  await assertFails(setDoc(doc(asP1(), 'pvpMatches/m3'),
    baseMatch({ fighters: { p1: VALID_FIGHTER, p2: bad } })));
});

test('pvpMatches: create fallisce con turnNumber diverso da 0', async () => {
  await assertFails(setDoc(doc(asP1(), 'pvpMatches/m4'), baseMatch({ turnNumber: 3 })));
});

test('pvpMatches: lettura da un terzo utente NON in playerUids fallisce', async () => {
  await seedAsAdmin('pvpMatches/m5', baseMatch());
  await assertFails(getDoc(doc(asP3(), 'pvpMatches/m5')));
});

test('pvpMatches: lettura da uno dei due players riesce', async () => {
  await seedAsAdmin('pvpMatches/m6', baseMatch());
  await assertSucceeds(getDoc(doc(asP1(), 'pvpMatches/m6')));
  await assertSucceeds(getDoc(doc(asP2(), 'pvpMatches/m6')));
});

test('pvpMatches: mossa regolare del giocatore di turno (p1) riesce e passa il turno a p2', async () => {
  await seedAsAdmin('pvpMatches/m7', baseMatch());
  await assertSucceeds(updateDoc(doc(asP1(), 'pvpMatches/m7'), {
    state: baseState({ barra: 55, turno: 1 }),
    turnOf: 'p2',
    turnNumber: 1,
    turnDeadline: futureTs(5 * 60 * 1000),
    usiMosse: {},
  }));
});

test('pvpMatches: mossa fuori turno (p2 gioca mentre turnOf è p1) fallisce', async () => {
  await seedAsAdmin('pvpMatches/m8', baseMatch());
  await assertFails(updateDoc(doc(asP2(), 'pvpMatches/m8'), {
    state: baseState({ barra: 55, turno: 1 }),
    turnOf: 'p1',
    turnNumber: 1,
    turnDeadline: futureTs(5 * 60 * 1000),
    usiMosse: {},
  }));
});

test('pvpMatches: doppia mossa dello stesso turno (turnNumber non avanza) fallisce', async () => {
  await seedAsAdmin('pvpMatches/m9', baseMatch());
  await assertFails(updateDoc(doc(asP1(), 'pvpMatches/m9'), {
    state: baseState({ barra: 55, turno: 0 }),
    turnOf: 'p2',
    turnNumber: 0, // doveva essere 1
    turnDeadline: futureTs(5 * 60 * 1000),
    usiMosse: {},
  }));
});

test('pvpMatches: seconda mossa consecutiva dello stesso giocatore (turno già passato a p2) fallisce', async () => {
  await seedAsAdmin('pvpMatches/m10', baseMatch({ turnOf: 'p2', turnNumber: 1, state: baseState({ turno: 1 }) }));
  await assertFails(updateDoc(doc(asP1(), 'pvpMatches/m10'), {
    state: baseState({ barra: 60, turno: 2 }),
    turnOf: 'p1',
    turnNumber: 2,
    turnDeadline: futureTs(5 * 60 * 1000),
    usiMosse: {},
  }));
});

test('pvpMatches: vittoria finta (esito "vinto" con stato non terminale) fallisce', async () => {
  await seedAsAdmin('pvpMatches/m11', baseMatch());
  await assertFails(updateDoc(doc(asP1(), 'pvpMatches/m11'), {
    state: baseState({ barra: 55, turno: 1, esito: 'vinto' }), // barra 55: non terminale
    status: 'finished',
    winnerUid: P1_UID,
    turnOf: 'p2',
    turnNumber: 1,
    turnDeadline: futureTs(5 * 60 * 1000),
    usiMosse: {},
  }));
});

test('pvpMatches: vittoria reale (barra >= 100, esito "vinto") riesce e chiude la partita su p1', async () => {
  await seedAsAdmin('pvpMatches/m12', baseMatch());
  await assertSucceeds(updateDoc(doc(asP1(), 'pvpMatches/m12'), {
    state: baseState({ barra: 100, turno: 1, esito: 'vinto' }),
    status: 'finished',
    winnerUid: P1_UID,
    turnOf: 'p2',
    turnNumber: 1,
    turnDeadline: futureTs(5 * 60 * 1000),
    usiMosse: {},
  }));
});

test('pvpMatches: vittoria reale con winnerUid sbagliato (non il vincitore atteso) fallisce', async () => {
  await seedAsAdmin('pvpMatches/m13', baseMatch());
  await assertFails(updateDoc(doc(asP1(), 'pvpMatches/m13'), {
    state: baseState({ barra: 100, turno: 1, esito: 'vinto' }),
    status: 'finished',
    winnerUid: P2_UID, // sbagliato: barra>=100 => vince p1
    turnOf: 'p2',
    turnNumber: 1,
    turnDeadline: futureTs(5 * 60 * 1000),
    usiMosse: {},
  }));
});

test('pvpMatches: mossa che tocca players/fighters/moveset fallisce (fuori da hasOnly)', async () => {
  await seedAsAdmin('pvpMatches/m14', baseMatch());
  await assertFails(updateDoc(doc(asP1(), 'pvpMatches/m14'), {
    state: baseState({ barra: 55, turno: 1 }),
    turnOf: 'p2',
    turnNumber: 1,
    turnDeadline: futureTs(5 * 60 * 1000),
    usiMosse: {},
    fighters: { p1: { ...VALID_FIGHTER, atk: 999 }, p2: VALID_FIGHTER },
  }));
});

test('pvpMatches: claim-timeout PRIMA della deadline fallisce', async () => {
  await seedAsAdmin('pvpMatches/m15', baseMatch({ turnDeadline: futureTs(5 * 60 * 1000) }));
  await assertFails(updateDoc(doc(asP2(), 'pvpMatches/m15'), {
    status: 'finished', winnerUid: P2_UID, forfeitedBy: P1_UID,
  }));
});

test('pvpMatches: claim-timeout DOPO la deadline riesce a favore di chi NON era di turno', async () => {
  await seedAsAdmin('pvpMatches/m16', baseMatch({ turnDeadline: pastTs() }));
  await assertSucceeds(updateDoc(doc(asP2(), 'pvpMatches/m16'), {
    status: 'finished', winnerUid: P2_UID, forfeitedBy: P1_UID,
  }));
});

test('pvpMatches: claim-timeout dal giocatore di turno stesso (non dal claimant) fallisce', async () => {
  await seedAsAdmin('pvpMatches/m17', baseMatch({ turnDeadline: pastTs() }));
  await assertFails(updateDoc(doc(asP1(), 'pvpMatches/m17'), {
    status: 'finished', winnerUid: P1_UID, forfeitedBy: P1_UID,
  }));
});

test('pvpMatches: abbandono volontario riesce e assegna la vittoria all\'altro player', async () => {
  await seedAsAdmin('pvpMatches/m18', baseMatch());
  await assertSucceeds(updateDoc(doc(asP1(), 'pvpMatches/m18'), {
    status: 'abandoned', forfeitedBy: P1_UID, winnerUid: P2_UID,
  }));
});

test('pvpMatches: terzo utente non può scrivere alcun update sulla partita', async () => {
  await seedAsAdmin('pvpMatches/m19', baseMatch());
  await assertFails(updateDoc(doc(asP3(), 'pvpMatches/m19'), {
    state: baseState({ barra: 55, turno: 1 }), turnOf: 'p2', turnNumber: 1,
  }));
});

// --- pvpMatches/{matchId}/moves/{turnNumber} --------------------------------

test('moves: create dal giocatore di turno con id == turnNumber corrente riesce', async () => {
  await seedAsAdmin('pvpMatches/m20', baseMatch()); // turnNumber: 0, turnOf: 'p1'
  await assertSucceeds(setDoc(doc(asP1(), 'pvpMatches/m20/moves/0'), {
    by: P1_UID, azione: 'incalza', mossaId: null, log: 'test', at: Timestamp.now(),
  }));
});

test('moves: create con id diverso dal turnNumber corrente fallisce', async () => {
  await seedAsAdmin('pvpMatches/m21', baseMatch());
  await assertFails(setDoc(doc(asP1(), 'pvpMatches/m21/moves/1'), {
    by: P1_UID, azione: 'incalza', mossaId: null, log: 'test', at: Timestamp.now(),
  }));
});

test('moves: create dal giocatore che NON è di turno fallisce', async () => {
  await seedAsAdmin('pvpMatches/m22', baseMatch()); // turnOf: 'p1'
  await assertFails(setDoc(doc(asP2(), 'pvpMatches/m22/moves/0'), {
    by: P2_UID, azione: 'incalza', mossaId: null, log: 'test', at: Timestamp.now(),
  }));
});

test('moves: update o delete su una mossa già scritta fallisce sempre (append-only)', async () => {
  await seedAsAdmin('pvpMatches/m23', baseMatch());
  await seedAsAdmin('pvpMatches/m23/moves/0', { by: P1_UID, azione: 'incalza', mossaId: null, log: 'x', at: Timestamp.now() });
  await assertFails(updateDoc(doc(asP1(), 'pvpMatches/m23/moves/0'), { log: 'hacked' }));
});

test('moves: lettura da un terzo utente NON in playerUids fallisce', async () => {
  await seedAsAdmin('pvpMatches/m24', baseMatch());
  await seedAsAdmin('pvpMatches/m24/moves/0', { by: P1_UID, azione: 'incalza', mossaId: null, log: 'x', at: Timestamp.now() });
  await assertFails(getDoc(doc(asP3(), 'pvpMatches/m24/moves/0')));
});
