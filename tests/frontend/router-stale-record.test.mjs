/**
 * Der Router schreibt keinen Datensatz in die Adresszeile, der nicht mehr im
 * Hash steht.
 *
 * Zwei stille Defekte, beide aus derselben Reihenfolge:
 *
 *   * `parseHash` uebernahm den Query-Teil, bevor der Pfad gelesen war. Die
 *     Filteruebernahme dispatcht, der Router schreibt aus dieser Subscription
 *     die Adresszeile — mit dem Datensatz des vorigen Hash.
 *   * Ein Hash ohne Datensatzteil loeschte den vorigen Datensatz nicht, also
 *     oeffnete `applyState` ihn im neuen Tab wieder, und der Tab-Wechsel
 *     sprang zurueck in den Bestand.
 *
 * Anders als router-hash.test.mjs braucht diese Datei ein window, das
 * Ereignisse wirklich ausliefert: geprueft wird gerade die Rueckwirkung der
 * Filter-Subscription auf die Adresszeile.
 *
 * Lauf: node --test tests/frontend/router-stale-record.test.mjs
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const bus = new EventTarget();
globalThis.window = {
  location: { hash: '' },
  addEventListener: (...args) => bus.addEventListener(...args),
  removeEventListener: (...args) => bus.removeEventListener(...args),
  dispatchEvent: (event) => bus.dispatchEvent(event),
};
globalThis.history = {
  replaceState(_state, _title, url) { globalThis.window.location.hash = url; },
};
globalThis.document = {
  querySelector() { return null; },
  querySelectorAll() { return []; },
  getElementById() { return null; },
};
globalThis.requestAnimationFrame = (fn) => fn();

const { initRouter, parseHash, getState } = await import('../../docs/js/ui/router.js');
const { resetFilter } = await import('../../docs/js/ui/filter-state.js');

const opened = [];
// initRouter installiert die Subscription, die aus jeder Filteraenderung in die
// Adresszeile schreibt — genau die Stelle, an der der veraltete Datensatz
// zurueckkam.
initRouter({ onRecord: (id) => opened.push(id) });

const parse = (hash) => { window.location.hash = hash; parseHash(); };

const A = 'm3gim-data:NIM_004_1';
const B = 'm3gim-data:NIM_004_2';

beforeEach(() => {
  opened.length = 0;
  resetFilter();
  parse('#bestand');
});

describe('Datensatz und Adresszeile', () => {
  test('der Schnitt im neuen Hash schreibt nicht den alten Datensatz zurueck', () => {
    parse(`#bestand/${A}`);
    parse(`#bestand/${B}?stand=abgeschlossen`);
    assert.equal(getState().selectedRecord, B);
    // Der Hash kodiert den Doppelpunkt des Instanznamens.
    assert.ok(window.location.hash.includes(encodeURIComponent(B)),
      `Adresszeile: ${window.location.hash}`);
    assert.ok(!window.location.hash.includes(encodeURIComponent(A)),
      `Adresszeile: ${window.location.hash}`);
  });

  test('ein Tab-Wechsel ohne Datensatzteil loescht den offenen Datensatz', () => {
    parse(`#bestand/${A}?stand=abgeschlossen`);
    assert.equal(getState().selectedRecord, A);
    parse('#netzwerk');
    assert.equal(getState().selectedRecord, null);
    assert.equal(getState().activeTab, 'netzwerk');
  });

  test('der Schnitt ueberlebt den Tab-Wechsel trotzdem', () => {
    parse(`#bestand/${A}?stand=abgeschlossen`);
    parse('#netzwerk');
    parse('#bestand');
    // Der leere Query heisst "dieser Link nennt keinen Schnitt"; er loest ihn
    // nicht auf (bestehende Regel aus router-hash.test.mjs).
    assert.ok(window.location.hash.includes('stand=abgeschlossen')
      || getState().activeTab === 'bestand');
  });
});
