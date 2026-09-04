/**
 * Das erste Konvolut steht beim Eintreten offen.
 *
 * Ohne diese Regel begruesst der Bestand die Betrachterin als reine Liste von
 * Konvolut-Koepfen, ohne ein einziges Objekt. Sobald ein Filter, eine Suche
 * oder ein Deep Link sagt, worauf zu schauen ist, oeffnet sich nichts von
 * selbst, und die eigene Auf-/Zuwahl bleibt stehen (user-story audit
 * 2026-09-03). Die Entscheidung ist als reine Funktion in bestand-data.js
 * gefasst, damit sie ohne DOM pruefbar ist.
 *
 * Lauf: node --test tests/frontend/bestand-autoopen.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  shouldAutoOpenFirstKonvolut, firstKonvolutId, getOrderedItems,
} from '../../docs/js/views/bestand-data.js';
import { storeFromShipped } from './_shipped.mjs';

describe('shouldAutoOpenFirstKonvolut', () => {
  test('die unberuehrte Anfangsansicht oeffnet das erste Konvolut', () => {
    assert.equal(shouldAutoOpenFirstKonvolut({}), true);
    assert.equal(shouldAutoOpenFirstKonvolut(), true);
    assert.equal(shouldAutoOpenFirstKonvolut({
      filtered: false, search: '', deepLink: false, userToggled: false,
    }), true);
  });

  test('ein aktiver Filter oeffnet nichts', () => {
    assert.equal(shouldAutoOpenFirstKonvolut({ filtered: true }), false);
  });

  test('eine Freitextsuche oeffnet nichts', () => {
    assert.equal(shouldAutoOpenFirstKonvolut({ search: 'Bayreuth' }), false);
    // Ein Feld mit Leerzeichen ist keine Suche.
    assert.equal(shouldAutoOpenFirstKonvolut({ search: '   ' }), true);
  });

  test('ein Deep Link auf einen Datensatz oeffnet nichts', () => {
    assert.equal(shouldAutoOpenFirstKonvolut({ deepLink: true }), false);
  });

  test('die eigene Wahl der Betrachterin gewinnt', () => {
    // Wer das erste Konvolut zuklappt, bekommt es nicht zurueck.
    assert.equal(shouldAutoOpenFirstKonvolut({ userToggled: true }), false);
  });
});

describe('firstKonvolutId', () => {
  test('nimmt den ersten Kopf der bereits nach Signatur geordneten Liste', () => {
    const items = [
      { record: {}, isKonvolut: false },
      { record: {}, isKonvolut: true, konvolutId: 'k2' },
      { record: {}, isChild: true, konvolutId: 'k2' },
      { record: {}, isKonvolut: true, konvolutId: 'k3' },
    ];
    assert.equal(firstKonvolutId(items), 'k2');
  });

  test('ohne Kopf gibt es nichts zu oeffnen', () => {
    assert.equal(firstKonvolutId([{ record: {} }]), null);
    assert.equal(firstKonvolutId([]), null);
    assert.equal(firstKonvolutId(undefined), null);
  });
});

describe('Am ausgelieferten Datensatz', () => {
  test('das erste Konvolut traegt Kinderzeilen, die es zu zeigen gibt', async () => {
    const store = await storeFromShipped();
    const items = getOrderedItems(store);
    const first = firstKonvolutId(items);
    assert.ok(first, 'der Bestand beginnt mit einem Konvolut-Kopf');
    const kinder = items.filter(item => item.isChild && item.konvolutId === first);
    assert.ok(kinder.length > 0,
      `das erste Konvolut ${first} zeigt ${kinder.length} Objektzeilen`);
  });
});
