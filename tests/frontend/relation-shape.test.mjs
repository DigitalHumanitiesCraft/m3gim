/**
 * Beide Bauformen einer AgRelOn-Relation erreichen den Store.
 *
 * Ein gerichteter n-aerer Begriff traegt `agrelon:hasSubject` und
 * `agrelon:hasObject`, ein symmetrischer wie `HasCorrespondent` traegt beide
 * Seiten als `agrelon:hasSubjectObject` (E-149).
 *
 * Der stille Defekt, gegen den diese Datei steht: die Datenschicht liest nur
 * die gerichtete Form. Die Korrespondenz, also der groesste Teil des
 * Beziehungsbestands, kaeme dann ohne Partner an, und Netzwerk wie Statistik
 * zeigten eine Leerstelle statt einer Fehlermeldung. Der zweite Fall ist die
 * Nachlassbildnerin selbst als Partner, was bei der symmetrischen Form
 * passiert, wenn die Seite ungeprueft genommen wird.
 *
 * Lauf: node --test tests/frontend/relation-shape.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { loadArchive } from '../../docs/js/data/loader.js';

const FONDS = {
  name: 'Malaniuk, Ira',
  '@id': 'wd:Q94208',
  'owl:sameAs': 'http://www.wikidata.org/entity/Q94208',
};

function recordWith(relation) {
  return {
    '@id': 'm3gim-data:TEST_1',
    '@type': 'rico:Record',
    'rico:identifier': 'UAKUG/TEST 1',
    'rico:title': 'Testdokument',
    'm3gim-ontology:hasAgentRelation': [relation],
  };
}

async function storeFrom(records) {
  const jsonld = { '@context': {}, '@graph': records };
  const prev = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => jsonld });
  try {
    return await loadArchive('./stub');
  } finally {
    globalThis.fetch = prev;
  }
}

describe('Gerichtete Relation', () => {
  test('der Partner kommt aus der Objektstelle', async () => {
    const store = await storeFrom([recordWith({
      '@type': 'agrelon:HasEmployeeEmployer',
      'agrelon:hasSubject': FONDS,
      'agrelon:hasObject': { name: 'Oper Graz' },
    })]);
    const rels = store.agentRelations.get('m3gim-data:TEST_1');
    assert.equal(rels.length, 1);
    assert.equal(rels[0].objectName, 'Oper Graz');
  });
});

describe('Symmetrische Relation', () => {
  const relation = {
    '@type': 'agrelon:HasCorrespondent',
    'agrelon:hasSubjectObject': [
      FONDS,
      {
        name: 'Wagner, Wieland',
        role: { '@id': 'm3gim-vocab:author', 'skos:prefLabel': 'verfasser' },
      },
    ],
  };

  test('der Partner erreicht den Store', async () => {
    const store = await storeFrom([recordWith(relation)]);
    const rels = store.agentRelations.get('m3gim-data:TEST_1');
    assert.ok(rels && rels.length === 1, (
      'Die symmetrische Form kommt nicht im Store an; der groesste Teil des '
      + 'Beziehungsbestands waere damit unsichtbar.'
    ));
    assert.equal(rels[0].objectName, 'Wagner, Wieland');
  });

  test('die Nachlassbildnerin wird nicht ihr eigener Partner', async () => {
    const store = await storeFrom([recordWith(relation)]);
    const rels = store.agentRelations.get('m3gim-data:TEST_1');
    assert.notEqual(rels[0].objectName, FONDS.name);
  });

  test('die Richtung bleibt als Rolle am Partner lesbar', async () => {
    const store = await storeFrom([recordWith(relation)]);
    const rels = store.agentRelations.get('m3gim-data:TEST_1');
    assert.equal(rels[0].objectRole, 'm3gim-vocab:author');
    assert.equal(rels[0].objectRoleLabel, 'verfasser');
  });

  test('eine Seite ohne Rolle liefert null statt eines geratenen Werts', async () => {
    const store = await storeFrom([recordWith({
      '@type': 'agrelon:HasCorrespondent',
      'agrelon:hasSubjectObject': [FONDS, { name: 'Barth, Herbert' }],
    })]);
    const rels = store.agentRelations.get('m3gim-data:TEST_1');
    assert.equal(rels[0].objectName, 'Barth, Herbert');
    assert.equal(rels[0].objectRole, null);
  });
});

describe('Am erzeugten Datensatz', () => {
  test('jede Korrespondenz im Bestand traegt einen benannten Partner', async () => {
    const { readFileSync } = await import('node:fs');
    let raw = null;
    try {
      raw = JSON.parse(readFileSync(
        new URL('../../data/output/m3gim.jsonld', import.meta.url), 'utf8'));
    } catch { return; }
    const store = await storeFrom(raw['@graph']);
    let seen = 0;
    const nameless = [];
    for (const [rid, rels] of store.agentRelations) {
      for (const rel of rels) {
        if (rel.type !== 'agrelon:HasCorrespondent') continue;
        seen += 1;
        if (!rel.objectName || rel.objectName === FONDS.name) nameless.push(rid);
      }
    }
    assert.ok(seen > 0, 'Keine Korrespondenz im Datenstand');
    assert.deepEqual(nameless.slice(0, 6), [], (
      `${nameless.length} von ${seen} Korrespondenzen ohne benannten Partner`
    ));
  });
});
