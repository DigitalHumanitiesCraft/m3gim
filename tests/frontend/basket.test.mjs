/**
 * Der Wissenskorb und seine Persistenz.
 *
 * Der Korb ist die einzige Stelle der Anwendung, die Zustand über den Reload
 * hinweg hält. Er lebt in einem Modul-Set und spiegelt sich nach jedem Schreiben
 * in den localStorage.
 *
 * Die stillen Defekte, gegen die diese Datei steht: ein Schreibvorgang, der die
 * Spiegelung auslässt (der Korb ist nach dem Reload leer), ein `initKorb`, das
 * einen kaputten Eintrag nicht überlebt (die Anwendung startet gar nicht), und
 * ein Abmelden, das den Listener stehen lässt (jedes erneute Rendern des Korbs
 * stapelt einen weiteren Aufruf).
 *
 * Lauf: node --test tests/frontend/basket.test.mjs
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Stub vor dem Modulimport: basket.js liest localStorage beim ersten initKorb,
// nicht auf Modulebene, aber persist() schreibt bei jedem Aufruf.
const stored = new Map();
globalThis.localStorage = {
  getItem: (k) => (stored.has(k) ? stored.get(k) : null),
  setItem: (k, v) => { stored.set(k, String(v)); },
  removeItem: (k) => { stored.delete(k); },
};

const {
  initKorb, toggleKorb, removeFromKorb, isInKorb, getKorbItems, getKorbCount,
  clearKorb, onKorbChange, reconcileKorb,
} = await import('../../docs/js/ui/basket.js');

const KEY = 'm3gim-korb';
const persisted = () => JSON.parse(stored.get(KEY) || '[]');

beforeEach(() => {
  clearKorb();
  stored.clear();
});

describe('Hinzufuegen, Entfernen, Abfragen', () => {
  test('toggleKorb legt an und nimmt wieder heraus', () => {
    toggleKorb('m3gim-data:NIM_004_10');
    assert.equal(isInKorb('m3gim-data:NIM_004_10'), true);
    assert.equal(getKorbCount(), 1);
    toggleKorb('m3gim-data:NIM_004_10');
    assert.equal(isInKorb('m3gim-data:NIM_004_10'), false);
    assert.equal(getKorbCount(), 0);
  });

  test('derselbe Record liegt nur einmal im Korb', () => {
    toggleKorb('m3gim-data:a');
    toggleKorb('m3gim-data:b');
    toggleKorb('m3gim-data:b');
    toggleKorb('m3gim-data:b');
    assert.deepEqual(getKorbItems(), ['m3gim-data:a', 'm3gim-data:b']);
  });

  test('removeFromKorb nimmt gezielt heraus, ein Unbekanntes bleibt folgenlos', () => {
    toggleKorb('m3gim-data:a');
    toggleKorb('m3gim-data:b');
    removeFromKorb('m3gim-data:a');
    assert.deepEqual(getKorbItems(), ['m3gim-data:b']);
    removeFromKorb('nicht-drin');
    assert.deepEqual(getKorbItems(), ['m3gim-data:b']);
  });

  test('getKorbItems liefert eine Kopie, keine Sicht auf das interne Set', () => {
    toggleKorb('m3gim-data:a');
    const items = getKorbItems();
    items.push('geschmuggelt');
    assert.deepEqual(getKorbItems(), ['m3gim-data:a']);
  });
});

describe('Persistenz im localStorage', () => {
  test('jeder Schreibvorgang spiegelt den vollen Stand', () => {
    toggleKorb('m3gim-data:a');
    assert.deepEqual(persisted(), ['m3gim-data:a']);
    toggleKorb('m3gim-data:b');
    assert.deepEqual(persisted(), ['m3gim-data:a', 'm3gim-data:b']);
    removeFromKorb('m3gim-data:a');
    assert.deepEqual(persisted(), ['m3gim-data:b']);
    clearKorb();
    assert.deepEqual(persisted(), []);
  });

  test('initKorb liest den gespeicherten Stand ein', () => {
    stored.set(KEY, JSON.stringify(['m3gim-data:x', 'm3gim:y']));
    initKorb();
    assert.deepEqual(getKorbItems().sort(), ['m3gim-data:x', 'm3gim-data:y']);
    assert.deepEqual(persisted().sort(), ['m3gim-data:x', 'm3gim-data:y']);
  });

  test('Nicht-Arrays und ungueltige IDs werden verworfen', () => {
    stored.set(KEY, JSON.stringify({ id: 'm3gim-data:x' }));
    initKorb();
    assert.deepEqual(getKorbItems(), []);
    stored.set(KEY, JSON.stringify(['m3gim-data:x', null, 3, 'https://example.org/x', '']));
    initKorb();
    assert.deepEqual(getKorbItems(), ['m3gim-data:x']);
  });

  test('nach dem Laden bleiben nur aufloesbare Records', () => {
    stored.set(KEY, JSON.stringify(['m3gim-data:x', 'm3gim-data:gone']));
    initKorb();
    assert.equal(reconcileKorb(new Map([['m3gim-data:x', {}]])), true);
    assert.deepEqual(getKorbItems(), ['m3gim-data:x']);
    assert.deepEqual(persisted(), ['m3gim-data:x']);
  });

  test('ein kaputter Eintrag laesst die Anwendung starten', () => {
    stored.set(KEY, '{kein json');
    assert.doesNotThrow(() => initKorb());
    assert.equal(getKorbCount(), 0);
  });
});

describe('Abonnenten', () => {
  test('jede Aenderung meldet sich, das Abmelden greift', () => {
    let calls = 0;
    const off = onKorbChange(() => { calls++; });
    toggleKorb('m3gim-data:a');
    toggleKorb('m3gim-data:a');
    assert.equal(calls, 2);
    off();
    toggleKorb('m3gim-data:a');
    assert.equal(calls, 2, 'Ohne Abmeldung stapelt jedes Rendern des Korbs einen Listener.');
  });
});
