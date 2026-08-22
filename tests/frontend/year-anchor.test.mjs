/**
 * Ein Zeitanker je Record, in jeder Ansicht derselbe (Frontend-Vertrag A4).
 *
 * `primaryYear(store, record)` in der Datenschicht ist die eine Aufloesung:
 * `rico:date` hat Vorrang, fehlt es, liefert die ranghoechste ankernde
 * Datierung das Jahr und benennt sich als abgeleitet.
 *
 * Der stille Defekt, gegen den diese Datei steht: eine Ansicht liest das Jahr
 * selbst aus `rico:date`. Ein Record ohne `rico:date`, aber mit ankernder
 * Datierung erscheint dann in der einen Ansicht datiert und in der anderen
 * undatiert, und der geteilte Zeitfilter trifft je nach Tab eine andere Menge.
 * Im Datenstand betrifft das eine kleine, aber reale Zahl von Records.
 *
 * Zwei Strecken: eine lexikalische ueber die Modulquellen und eine gegen den
 * erzeugten Datensatz.
 *
 * Lauf: node --test tests/frontend/year-anchor.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { loadArchive, primaryYear } from '../../docs/js/data/loader.js';
import { recordYear } from '../../docs/js/ui/filter-sync.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

async function storeFrom(jsonld) {
  const prev = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => jsonld });
  try {
    return await loadArchive('./stub');
  } finally {
    globalThis.fetch = prev;
  }
}

function moduleSources() {
  const out = [];
  for (const rel of ['docs/js/views', 'docs/js/ui']) {
    const dir = join(ROOT, rel);
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.js')) continue;
      out.push({ name: `${rel}/${name}`, text: readFileSync(join(dir, name), 'utf8') });
    }
  }
  return out;
}

describe('Jahresaufloesung nur ueber die Datenschicht', () => {
  test('keine Ansicht leitet ein Jahr selbst aus rico:date ab', () => {
    // Ein Jahr aus rico:date zu ziehen ist genau die Umgehung des Ankers.
    // Die reine Anzeige eines Datums (formatDate) bleibt erlaubt.
    const offenders = [];
    for (const { name, text } of moduleSources()) {
      text.split('\n').forEach((line, i) => {
        if (!line.includes("rico:date")) return;
        if (/extractYear\s*\([^)]*rico:date/.test(line)
            || /rico:date[^)]*\)\s*\.\s*slice\s*\(\s*0\s*,\s*4/.test(line)
            || /\/\d\{4\}\/[^\n]*rico:date/.test(line)) {
          offenders.push(`${name}:${i + 1}`);
        }
      });
    }
    assert.deepEqual(offenders, [], (
      'Diese Stellen bestimmen ein Jahr an der Datenschicht vorbei. '
      + 'primaryYear(store, record) verwenden: ' + offenders.join(', ')
    ));
  });

  test('kein Modul haelt eine eigene recordYear-Funktion', () => {
    const offenders = moduleSources()
      .filter(({ name, text }) => name !== 'docs/js/ui/filter-sync.js'
        && /function\s+recordYear\s*\(/.test(text))
      .map(({ name }) => name);
    assert.deepEqual(offenders, [], (
      'Eigene Jahresaufloesungen driften von der Datenschicht ab: ' + offenders.join(', ')
    ));
  });
});

describe('Zeitanker am erzeugten Datensatz', () => {
  const url = new URL('../../data/output/m3gim.jsonld', import.meta.url);
  let raw = null;
  try { raw = JSON.parse(readFileSync(url, 'utf8')); } catch { /* Pipeline nicht gelaufen */ }

  test('abgeleitete Jahre kommen im geteilten Filter an', async (t) => {
    if (!raw) return t.skip('Kein Pipeline-Output');
    const store = await storeFrom(raw);
    const derived = [];
    for (const rec of store.records.values()) {
      const anchor = primaryYear(store, rec);
      if (anchor.year != null && anchor.source !== 'rico:date') derived.push(rec);
    }
    assert.ok(derived.length > 0, (
      'Kein Record mit abgeleitetem Jahr im Datenstand — der Test verliert '
      + 'seinen Gegenstand und ist zu pruefen.'
    ));
    const missed = derived
      .filter(rec => recordYear(store, rec) !== primaryYear(store, rec).year)
      .map(rec => rec['rico:identifier']);
    assert.deepEqual(missed, [], (
      `${missed.length} von ${derived.length} Records mit abgeleitetem Jahr fallen `
      + 'im geteilten Zeitfilter als undatiert durch: ' + missed.slice(0, 6).join(', ')
    ));
  });
});
