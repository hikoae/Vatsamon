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
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
