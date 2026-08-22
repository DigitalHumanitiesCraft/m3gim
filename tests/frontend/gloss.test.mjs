/**
 * Erklaerung der Fachbegriffe an der Oberflaeche (E-143).
 *
 * Die Oberflaeche zeigt Fachvokabular des Archivs, etwa Konvolut, Typoskript
 * oder Rollenbegriffe wie Repetitor. Der erklaerende Satz dazu steht im
 * Vokabular und wandert ueber den Datensatz ins Frontend; eine zweite Liste im
 * Frontend wuerde beim naechsten Vokabularschnitt still veralten.
 *
 * Geprueft wird die Aufloesung und die Trennung der Begriffsschemata: eine
 * Rolle darf nicht als Dokumenttyp in der Facette erscheinen.
 *
 * Lauf: node --test tests/frontend/gloss.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { loadArchive, conceptDefinition } from '../../docs/js/data/loader.js';
import { glossOf, dftLabel } from '../../docs/js/utils/format.js';

async function storeFrom(jsonld) {
  const prev = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => jsonld });
  try { return await loadArchive('./stub'); } finally { globalThis.fetch = prev; }
}

const FIXTURE = {
  '@graph': [
    {
      '@id': 'm3gim-vocab:program', '@type': 'skos:Concept',
      'skos:prefLabel': 'Programm',
      'skos:definition': 'Drucksache zu einer Veranstaltung.',
      'skos:inScheme': { '@id': 'm3gim-vocab:documentaryFormTypes' },
    },
    {
      '@id': 'm3gim-vocab:conductor', '@type': 'skos:Concept',
      'skos:prefLabel': 'Dirigent',
      'skos:definition': 'Person, die die musikalische Leitung innehatte.',
      'skos:inScheme': { '@id': 'm3gim-vocab:agentRoles' },
    },
    {
      '@id': 'm3gim-vocab:ohneDefinition', '@type': 'skos:Concept',
      'skos:prefLabel': 'Ohne',
      'skos:inScheme': { '@id': 'm3gim-vocab:documentaryFormTypes' },
    },
  ],
};

describe('Begriffserklaerung', () => {
  test('loest ueber die Kurzform und ueber die volle Kennung auf', async () => {
    const store = await storeFrom(FIXTURE);
    assert.equal(glossOf(store, 'program'), 'Drucksache zu einer Veranstaltung.');
    assert.equal(glossOf(store, 'm3gim-vocab:program'), 'Drucksache zu einer Veranstaltung.');
    assert.equal(conceptDefinition(store, 'm3gim-vocab:conductor'),
      'Person, die die musikalische Leitung innehatte.');
  });

  test('Begriff ohne Definition ergibt leeren Text, keinen Fehler', async () => {
    const store = await storeFrom(FIXTURE);
    assert.equal(glossOf(store, 'ohneDefinition'), '');
    assert.equal(glossOf(store, 'gibtEsNicht'), '');
    assert.equal(glossOf(null, 'program'), '');
  });

  test('eine Rolle erscheint nicht als Dokumenttyp', async () => {
    const store = await storeFrom(FIXTURE);
    assert.ok(store.dftHierarchy.has('m3gim-vocab:program'));
    assert.ok(!store.dftHierarchy.has('m3gim-vocab:conductor'),
      'Rollenbegriffe gehoeren nicht in die Dokumenttyp-Facette');
    assert.equal(dftLabel(store, 'program'), 'Programm');
  });
});

describe('Erklaerungen im erzeugten Datensatz', () => {
  const url = new URL('../../data/output/m3gim.jsonld', import.meta.url);
  let raw = null;
  try { raw = JSON.parse(readFileSync(url, 'utf8')); } catch { /* Pipeline nicht gelaufen */ }

  test('Dokumenttypen und Rollen tragen ihre Erklaerung', async (t) => {
    if (!raw) return t.skip('Kein Pipeline-Output');
    const store = await storeFrom(raw);
    assert.ok(store.conceptDefinitions.size > 20,
      `Nur ${store.conceptDefinitions.size} erklaerte Begriffe im Datensatz`);
    const dftWithGloss = [...store.dftHierarchy.keys()]
      .filter(id => conceptDefinition(store, id));
    assert.ok(dftWithGloss.length > 10,
      `Nur ${dftWithGloss.length} Dokumenttypen mit Erklaerung`);
  });
});
