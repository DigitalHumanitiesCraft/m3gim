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
  clearKorb, onKorbChange,
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
    toggleKorb('a');
    toggleKorb('b');
    toggleKorb('b');
    toggleKorb('b');
    assert.deepEqual(getKorbItems(), ['a', 'b']);
  });

  test('removeFromKorb nimmt gezielt heraus, ein Unbekanntes bleibt folgenlos', () => {
    toggleKorb('a');
    toggleKorb('b');
    removeFromKorb('a');
    assert.deepEqual(getKorbItems(), ['b']);
    removeFromKorb('nicht-drin');
    assert.deepEqual(getKorbItems(), ['b']);
  });

  test('getKorbItems liefert eine Kopie, keine Sicht auf das interne Set', () => {
    toggleKorb('a');
    const items = getKorbItems();
    items.push('geschmuggelt');
    assert.deepEqual(getKorbItems(), ['a']);
  });
});

describe('Persistenz im localStorage', () => {
  test('jeder Schreibvorgang spiegelt den vollen Stand', () => {
    toggleKorb('a');
    assert.deepEqual(persisted(), ['a']);
    toggleKorb('b');
    assert.deepEqual(persisted(), ['a', 'b']);
    removeFromKorb('a');
    assert.deepEqual(persisted(), ['b']);
    clearKorb();
    assert.deepEqual(persisted(), []);
  });

  test('initKorb liest den gespeicherten Stand ein', () => {
    stored.set(KEY, JSON.stringify(['x', 'y']));
    initKorb();
    assert.deepEqual(getKorbItems().sort(), ['x', 'y']);
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
    toggleKorb('a');
    toggleKorb('a');
    assert.equal(calls, 2);
    off();
    toggleKorb('a');
    assert.equal(calls, 2, 'Ohne Abmeldung stapelt jedes Rendern des Korbs einen Listener.');
  });
});
