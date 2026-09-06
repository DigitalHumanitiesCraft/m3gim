/**
 * Die Chronik schluesselt ihre Dekaden nach der Rolle der Datierung auf, die
 * das Jahr traegt.
 *
 * Der stille Defekt, gegen den diese Datei steht: der Kopf zaehlte nach der
 * Mobilitaetssicht, also nach einer Ableitung aus den verorteten Annotationen,
 * waehrend die Chips auf dem Jahr des Zeitankers standen. Zwei Aussagen ueber
 * dieselbe Menge, die auseinanderlaufen konnten, ohne dass es jemandem auffiel.
 * Seit F1 nennt der Kopf, woher das Jahr kommt, und ein Segment traegt genau
 * die Chips, deren Akzent dieselbe Farbe hat.
 *
 * Lauf: node --test tests/frontend/chronik-dating-role.test.mjs
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

import {
  datingRoleOf, datingRoleScale, datingRoleKey, aggregateDecadeStacks, REST_KEY,
} from '../../docs/js/views/chronik-data.js';
import { REST_COLOR } from '../../docs/js/views/statistik-data.js';
import { baseRecords } from '../../docs/js/data/records-for.js';
import { primaryYear } from '../../docs/js/data/loader.js';
import { storeFromShipped } from './_shipped.mjs';

let store;
let records;
let scale;
before(async () => {
  store = await storeFromShipped();
  records = baseRecords(store);
  scale = datingRoleScale(store, records);
});

describe('datingRoleOf', () => {
  test('die Anzeigeform der Datierung ist der Schluessel', () => {
    assert.deepEqual(datingRoleOf({ year: 1951, source: 'm3gim-vocab:performance', label: 'aufführung' }),
      { key: 'aufführung', label: 'aufführung' });
  });

  test('zwei Wege zur selben Datierung sind eine Rolle', () => {
    // Die Entstehung steht einmal als `rico:creationDate` am Objekt und einmal
    // als Verknuepfungsdatierung. Zwei Segmente gleichen Namens in zwei Farben
    // waeren als zwei verschiedene Sachverhalte zu lesen.
    const overObject = datingRoleOf({ year: 1950, source: 'rico:creationDate', label: 'entstehung' });
    const overLink = datingRoleOf({ year: 1950, source: 'm3gim-vocab:creation', label: 'entstehung' });
    assert.equal(overObject.key, overLink.key);
  });

  test('die Quellendatierung traegt keine Rolle und heisst nach sich selbst', () => {
    assert.deepEqual(datingRoleOf({ year: 1949, source: 'rico:date', label: null }),
      { key: 'rico:date', label: 'Quellendatierung' });
  });

  test('ein undatierter Record hat keine Datierungsrolle', () => {
    assert.equal(datingRoleOf({ year: null, source: null, label: null }), null);
    assert.equal(datingRoleOf(null), null);
  });
});

describe('datingRoleScale am ausgelieferten Datensatz', () => {
  test('sechs Rollen tragen eine Farbe, der Rest ein Sammelsegment', () => {
    const coloured = [...scale.values()].filter(e => e.color !== REST_COLOR);
    assert.equal(coloured.length, 6);
    assert.equal(coloured[0].label, 'Aufführung',
      'die haeufigste Datierungsrolle des Datenstands fuehrt die Skala an');
    assert.ok(scale.has(REST_KEY), 'der Datenstand traegt mehr als sechs Datierungsrollen');
    assert.equal(scale.get(REST_KEY).color, REST_COLOR);
  });

  test('kein Segment ist leer, und keine Farbe kommt zweimal vor', () => {
    for (const e of scale.values()) assert.ok(e.count > 0, `${e.label} zaehlt nichts`);
    const hues = [...scale.values()].filter(e => e.color !== REST_COLOR).map(e => e.color);
    assert.equal(new Set(hues).size, hues.length);
  });

  test('die Summe der Segmente ist die Zahl der datierten Records', () => {
    const dated = records.filter(r => primaryYear(store, r).year != null).length;
    const sum = [...scale.values()].reduce((n, e) => n + e.count, 0);
    assert.equal(sum, dated, (
      'Jeder datierte Record steht in genau einem Segment; weicht die Summe ab, '
      + 'zaehlt der Kopf eine andere Menge als der Zeitstrahl darunter.'
    ));
  });
});

describe('datingRoleKey', () => {
  test('eine seltene Rolle faellt in das Sammelsegment', () => {
    const rare = { year: 1955, source: 'm3gim-vocab:signatureDate', label: 'unterschriftsdatum' };
    assert.ok(!scale.has('unterschriftsdatum'), 'der Test hat keinen Gegenstand');
    assert.equal(datingRoleKey(rare, scale), REST_KEY);
  });

  test('der undatierte Record steht in keinem Segment', () => {
    assert.equal(datingRoleKey({ year: null, source: null, label: null }, scale), null);
  });
});

describe('aggregateDecadeStacks', () => {
  const items = [
    { year: 1951, role: 'aufführung' },
    { year: 1953, role: 'aufführung' },
    { year: 1955, role: 'absendung' },
    { year: 1971, role: 'absendung' },
    { year: null, role: null },
  ];

  test('Luecken-Dekaden bleiben als leere Zeilen stehen (E-88)', () => {
    const { rows, dated, undated } = aggregateDecadeStacks(items);
    assert.equal(dated, 4);
    assert.equal(undated, 1);
    assert.deepEqual(rows.map(r => [r.decade, r.total]), [[1950, 3], [1960, 0], [1970, 1]]);
    assert.deepEqual(rows[0].byRole, { 'aufführung': 2, absendung: 1 });
  });

  test('die Dekaden des Datenstands zaehlen zusammen die datierten Records', () => {
    const real = records.map(r => {
      const anchor = primaryYear(store, r);
      return { year: anchor.year, role: datingRoleKey(anchor, scale) };
    });
    const { rows, dated, undated } = aggregateDecadeStacks(real);
    assert.equal(dated + undated, records.length);
    assert.equal(rows.reduce((n, r) => n + r.total, 0), dated);
  });
});
