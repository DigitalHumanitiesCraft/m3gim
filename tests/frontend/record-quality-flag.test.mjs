/**
 * Qualitaetsflag auf Record-Ebene (Designregel 10).
 *
 * `m3gim-ontology:dataQualityFlag` steht im ausgelieferten Datensatz an
 * Annotation, Performance und den eingebetteten Entitaeten, nie am Knoten eines
 * `rico:Record` oder eines `rico:RecordSet`. Das Detail traegt deshalb nur den
 * Aufhaenger, der rendert, sobald die Quelle dort eines fuehrt. Der Test haelt
 * beide Seiten fest: den Befund am Datensatz und die Wortlaut- und
 * Zeichengleichheit mit dem Chip-Flag, das seit dem gemeinsamen Export aus
 * record-chips.js dieselbe Konstante ist.
 *
 * Lauf: node --test tests/frontend/record-quality-flag.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { recordQualityTipLines } from '../../docs/js/views/record-detail.js';
import { QUALITY_ICON_SVG } from '../../docs/js/views/record-chips.js';
import { qualityTipLines } from '../../docs/js/views/record-detail-data.js';
import { shippedGraph } from './_shipped.mjs';

const FLAG = 'm3gim-ontology:dataQualityFlag';
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8');

describe('Vorkommen im ausgelieferten Datensatz', () => {
  const graph = shippedGraph()['@graph'];

  test('Record- und Konvolut-Knoten fuehren das Flag heute nicht selbst', () => {
    const carriers = graph
      .filter(n => (n['@type'] === 'rico:Record' || n['@type'] === 'rico:RecordSet') && FLAG in n)
      .map(n => `${n['@id']} (${n['@type']}): ${n[FLAG]}`);
    // Faellt dieser Test, traegt die Quelle erstmals ein Record-Flag; der
    // Aufhaenger im Detailkopf rendert es dann ohne weitere Aenderung, und die
    // Konvolut-Kopfzeile des Bestands ist neu zu pruefen.
    assert.deepEqual(carriers, []);
  });

  test('der Datenstand enthält keine algorithmisch erzeugten Flags', () => {
    const seen = new Set();
    const walk = (node) => {
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (!node || typeof node !== 'object') return;
      if (FLAG in node) {
        for (const v of [].concat(node[FLAG])) seen.add(v);
      }
      for (const [key, value] of Object.entries(node)) {
        if (!key.startsWith('@')) walk(value);
      }
    };
    graph.forEach(walk);
    assert.deepEqual([...seen], []);
  });
});

describe('recordQualityTipLines', () => {
  test('leer ohne Flag und ohne Beschreibung', () => {
    assert.deepEqual(recordQualityTipLines({}), []);
    assert.deepEqual(recordQualityTipLines(null), []);
  });

  test('gleicher Wortlaut wie am Chip', () => {
    const record = {
      [FLAG]: 'quelle-tippfehler',
      'rico:generalDescription': 'im Original: Malanjuk',
    };
    assert.deepEqual(
      recordQualityTipLines(record),
      qualityTipLines('quelle-tippfehler', 'im Original: Malanjuk'),
    );
    assert.deepEqual(recordQualityTipLines(record), [
      'Datenqualität: quelle-tippfehler',
      'Anmerkung: im Original: Malanjuk',
    ]);
  });

  test('Flag ohne Beschreibung ergibt genau eine Zeile', () => {
    assert.deepEqual(recordQualityTipLines({ [FLAG]: 'rolle-unsicher' }),
      ['Datenqualität: rolle-unsicher']);
  });
});

test('Detailkopf und Chip zeigen dasselbe Zeichen', () => {
  // Seit das Zeichen aus record-chips.js exportiert wird, gibt es nur noch eine
  // Konstante; der Test haelt fest, dass das Detail sie bezieht und keine
  // zweite Kopie anlegt (Designregel 10, die Legende entsteht aus Gleichheit).
  assert.ok(QUALITY_ICON_SVG.startsWith('<svg '), 'kein SVG-Zeichen exportiert');
  const detail = read('../../docs/js/views/record-detail.js');
  assert.match(detail, /import \{[^}]*QUALITY_ICON_SVG[^}]*\} from '\.\/record-chips\.js';/s);
  assert.doesNotMatch(detail, /const QUALITY_ICON_SVG\s*=/);
});

test('der Kopf rendert das Flag, sobald der Record eines traegt', () => {
  const source = read('../../docs/js/views/record-detail.js');
  assert.match(source, /qualityLines\.length \? qualityFlagMark\(qualityLines\) : null/);
  assert.match(source, /className: 'quality-flag'/);
});
