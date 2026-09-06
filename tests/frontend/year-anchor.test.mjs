/**
 * Ein Zeitanker je Record, in jeder Ansicht derselbe (Frontend-Vertrag A4).
 *
 * `primaryYear(store, record)` in der Datenschicht ist die eine Aufloesung:
 * die ranghoechste ankernde Datierung der Verknuepfungen hat Vorrang, und
 * `rico:date` der Objekttabelle traegt nur, was sie nicht deckt (F3). Der Anker
 * benennt seine Herkunft, damit eine Ansicht das eine vom anderen unterscheiden
 * kann.
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

import { loadArchive, primaryYear, datingsByScope } from '../../docs/js/data/loader.js';
import { yearOf } from '../../docs/js/data/records-for.js';
import { storeFromShipped } from './_shipped.mjs';

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

  test('kein Modul haelt eine eigene Jahresaufloesung', () => {
    // yearOf in docs/js/data/records-for.js ist die eine Aufloesung. Die Sperre
    // sieht sie nicht, weil sie nur views/ und ui/ liest; dort darf weder eine
    // recordYear- noch eine zweite yearOf-Definition stehen, gleich ob als
    // Funktionsdeklaration oder als gebundene Arrow Function.
    const OWN_YEAR_FN = /(?:function\s+(?:recordYear|yearOf)\s*\(|(?:const|let|var)\s+(?:recordYear|yearOf)\s*=)/;
    const offenders = moduleSources()
      .filter(({ text }) => OWN_YEAR_FN.test(text))
      .map(({ name }) => name);
    assert.deepEqual(offenders, [], (
      'Eigene Jahresaufloesungen driften von der Datenschicht ab: ' + offenders.join(', ')
    ));
  });
});

describe('Vorrang der Verknuepfungsdatierung vor rico:date', () => {
  // Der Datensatz traegt zwoelf Records, deren Jahr sich mit der Umkehrung
  // aendert. UAKUG/NIM_007 11 ist der schaerfste von ihnen: der Brief ist am
  // 1968-11-18 abgesendet und traegt dieses Datum als `rico:date`, bezeugt aber
  // Auffuehrungen ab 1959. Der Test faellt sowohl bei alter Vorrangregel als
  // auch dann, wenn der Rang die Ebenen nicht mehr trennt.
  test('das Jahr kommt aus der ranghoechsten ankernden Datierung', async () => {
    const store = await storeFromShipped();
    const rec = store.records.get('m3gim-data:NIM_007_11');
    assert.ok(rec, 'Der Datensatz fuehrt m3gim-data:NIM_007_11 nicht mehr');
    assert.equal(rec['rico:date'], '1968-11-18',
      'Die Quelldatierung des Testfalls hat sich geaendert, der Fall ist neu zu waehlen');

    const anchor = primaryYear(store, rec);
    assert.equal(anchor.year, 1959, 'Das Jahr faellt zurueck auf rico:date');
    assert.notEqual(anchor.year, 1968, 'Anker und Quelldatierung duerfen hier nicht zusammenfallen');
    assert.equal(anchor.source, 'm3gim-vocab:performance');
    assert.equal(anchor.roleId, 'm3gim-vocab:performance');
    assert.equal(anchor.label, 'aufführung');
    assert.equal(anchor.date, '1959-09-05', 'Der Anker nennt die Datierung, aus der sein Jahr stammt');
  });

  test('eine Erwaehnung datiert auch dann nicht, wenn sie ranghoechste waere', async () => {
    const store = await storeFromShipped();
    // Derselbe Record traegt drei Erwaehnungen, darunter 1968-11-12. Sie liegen
    // ausserhalb von ANCHORING_SCOPES und sind damit vom Anker ausgeschlossen,
    // unabhaengig von der Vorrangregel.
    const mentioned = datingsByScope(store, store.records.get('m3gim-data:NIM_007_11'),
      'm3gim-vocab:mentionedDating');
    assert.ok(mentioned.length > 0, 'Der Testfall traegt keine Erwaehnung mehr');
    assert.equal(primaryYear(store, store.records.get('m3gim-data:NIM_007_11')).roleId,
      'm3gim-vocab:performance');
  });

  test('ohne ankernde Datierung traegt rico:date den Anker', async () => {
    const store = await storeFromShipped();
    const fallback = [...store.records.values()].find(rec => rec['rico:date']
      && primaryYear(store, rec).source === 'rico:date');
    assert.ok(fallback, 'Kein Record faellt mehr auf rico:date zurueck');
    const anchor = primaryYear(store, fallback);
    assert.equal(anchor.roleId, null, 'Der Rueckfall traegt keine Rolle');
    assert.equal(anchor.date, fallback['rico:date']);
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
      .filter(rec => yearOf(store, rec) !== primaryYear(store, rec).year)
      .map(rec => rec['rico:identifier']);
    assert.deepEqual(missed, [], (
      `${missed.length} von ${derived.length} Records mit abgeleitetem Jahr fallen `
      + 'im geteilten Zeitfilter als undatiert durch: ' + missed.slice(0, 6).join(', ')
    ));
  });
});
