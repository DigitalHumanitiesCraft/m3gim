/**
 * Ein Symbolsatz fuer die vier Inhaltsfamilien.
 *
 * Die Erschliessungsanzeige des Bestands und die Grid-Koepfe der Indizes zeigen
 * dieselbe Familie. Faellt der geteilte Satz auseinander, benennt jede Ansicht
 * die Familie mit einem eigenen Zeichen, und die Legende aus Naehe (Designregel
 * 2) traegt nicht mehr. Der Test haelt deshalb zweierlei fest: der Satz kennt
 * genau die vier Familienschluessel des Datenmodells, und keine der beiden
 * Ansichten fuehrt daneben ein eigenes Familien-SVG oder den abgeloesten
 * Familienpunkt der Bestandszeile.
 *
 * Lauf:
 *   node --test tests/frontend/family-icons.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { familyIconSvg } from '../../docs/js/ui/family-icons.js';
import { CONTENT_FAMILIES } from '../../docs/js/data/constants.js';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

describe('Familien-Icons', () => {
  test('jede Inhaltsfamilie hat ein Icon', () => {
    for (const family of CONTENT_FAMILIES) {
      const svg = familyIconSvg(family.key);
      assert.match(svg, /^<svg /, `${family.key} ohne Icon`);
      assert.match(svg, /aria-hidden="true"/,
        `${family.key}: das Icon traegt Bedeutung ohne Tooltip und aria-label`);
      assert.match(svg, /stroke="currentColor"/,
        `${family.key}: ohne currentColor traegt das Icon die Familienfarbe nicht`);
    }
  });

  test('ein unbekannter Schluessel liefert kein Zeichen', () => {
    assert.equal(familyIconSvg('finanzen'), '');
  });

  test('Bestand und Indizes zeichnen kein eigenes Familiensymbol', () => {
    for (const rel of ['../../docs/js/views/bestand-rows.js',
      '../../docs/js/views/bestand.js',
      '../../docs/js/views/indizes.js']) {
      const src = read(rel);
      assert.ok(!/<svg[^>]*>\s*<(path|circle)/.test(src),
        `${rel} zeichnet ein eigenes SVG statt des geteilten Familiensatzes`);
      assert.ok(!src.includes('ersch-dot'),
        `${rel} fuehrt den abgeloesten Familienpunkt der Bestandszeile`);
    }
  });
});
