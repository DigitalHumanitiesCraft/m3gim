/**
 * Erschliessungsgrad: die Rechnung hinter der Angabe an jeder Auswertung.
 *
 * Der Bestand ist zu einem Teil verknuepft; eine Auswertung ohne Angabe ihrer
 * Grundlage liest sich als Aussage ueber den ganzen Bestand. Geprueft wird die
 * reine Rechnung, nicht die Darstellung.
 *
 * Lauf: node --test tests/frontend/coverage.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { coverage, coverageText } from '../../docs/js/ui/coverage.js';

const store = { allRecords: new Array(10).fill(null).map((_, i) => ({ '@id': `r${i}` })) };

describe('coverage', () => {
  test('zaehlt verschiedene Records, nicht Belege', () => {
    const c = coverage(store, ['r1', 'r1', 'r2']);
    assert.equal(c.used, 2);
    assert.equal(c.total, 10);
    assert.equal(c.share, 0.2);
  });
  test('leere Grundlage ergibt null von total', () => {
    assert.deepEqual(coverage(store, []), { used: 0, total: 10, share: 0 });
  });
  test('unbrauchbare Eintraege zaehlen nicht mit', () => {
    assert.equal(coverage(store, ['r1', null, undefined, '', 5]).used, 1);
  });
  test('leerer Bestand ergibt keinen Bruch durch null', () => {
    const c = coverage({ allRecords: [] }, ['r1']);
    assert.equal(c.share, 0);
    assert.equal(c.total, 0);
  });
  test('fehlender Store bricht nicht', () => {
    assert.deepEqual(coverage(null, ['r1']), { used: 1, total: 0, share: 0 });
  });
});

describe('coverageText', () => {
  test('eine Formulierung, mit eingesetztem Gegenstand', () => {
    assert.equal(coverageText(store, ['r1', 'r2'], 'Dokumenten'),
      '2 von 10 Dokumenten des Bestands tragen diese Auswertung.');
  });
});
