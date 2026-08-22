/**
 * Rollenabdeckung: das Rollenregister des Frontends gegen den Datenstand.
 *
 * Nachfolger des Abgleichs von `TYPED_DATE_PROPS` gegen die Daten. Die flache
 * typisierte Datumsfamilie ist ersatzlos entfallen; jede Datierung steht als
 * Annotationsknoten mit einer Rolle. Damit verschiebt sich die Gefahr, bleibt
 * aber dieselbe: eine im Datenstand vorkommende Rolle, die das Frontend nicht
 * kennt, verschwindet in der Anzeige, ohne Fehler und ohne Meldung. Genau so
 * ist `m3gim:erstelldatum` seinerzeit durch die alte Liste gefallen.
 *
 * Drei Pruefungen decken den Weg einer Rolle vom Datenstand bis zur Anzeige:
 *
 *   1  Anzeigeform. Jeder Rollenverweis fuehrt sein `skos:prefLabel` mit, und
 *      der Store legt es ab. Ein Verweis ohne Label hat keine Anzeigeform.
 *   2  Bezugsebene. Jede Rolle, die an einer Annotation steht, hat einen
 *      ausdruecklichen Eintrag in `ANNOTATION_ROLE_SCOPE`. Ohne ihn faellt die
 *      Datierung aus jeder Auswahl nach Bezugsebene heraus.
 *   3  Rang. Jede Rolle, die im Datenstand eine Datierung traegt und einen
 *      Record datieren darf, hat einen ausdruecklichen Rang. Ohne ihn wird die
 *      Auswahl der abgeleiteten Datierung von der Quellreihenfolge bestimmt.
 *
 * Jede Pruefung wird durch eine eingespielte Verletzung bewiesen: ein
 * synthetischer Datenstand mit genau dem Defekt muss den Befund ausloesen.
 * Die Pruefungen selbst sind reine Funktionen ueber `store.roleVocab`, damit
 * derselbe Code auf den echten und auf den praeparierten Stand laeuft.
 *
 * Gegenstueck zu `tests/test_25_chronik_mobility_cluster.py`, das dasselbe fuer
 * die Mobilitaetssichten leistet. Gelesen wird `data/output/m3gim.jsonld`,
 * der Stand des zusammengefuehrten Modells.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { loadArchive, primaryYear } from '../../docs/js/data/loader.js';
import { DATING_SCOPE, ANCHORING_SCOPES } from '../../docs/js/data/constants.js';
import { withConcepts } from './_concepts.mjs';

async function storeFrom(jsonld, { bare = false } = {}) {
  // Bezugsebene und Rang kommen seit E-150 von den Begriffsknoten des
  // Datensatzes; ein nacktes Fixture haette beides nicht.
  const payload = bare ? jsonld : withConcepts(jsonld);
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ status: 200, ok: true, json: async () => payload });
  try {
    return await loadArchive('mock://data');
  } finally {
    globalThis.fetch = prevFetch;
  }
}

let outputStore = null;
async function realStore() {
  if (!outputStore) {
    const url = new URL('../../data/output/m3gim.jsonld', import.meta.url);
    outputStore = await storeFrom(JSON.parse(readFileSync(url, 'utf-8')), { bare: true });
  }
  return outputStore;
}

/* --- die drei Befunde, als reine Funktionen ueber den Store -------------- */

/** Rollen, die im Datenstand vorkommen und keine Anzeigeform mitbringen. */
function rolesWithoutDisplayForm(store) {
  return [...store.roleVocab.values()].filter(r => !r.label).map(r => r.id).sort();
}

/** Rollen an Annotationen ohne ausdrueckliche Bezugsebene. */
function annotationRolesWithoutScope(store) {
  return [...store.roleVocab.values()]
    .filter(r => r.onAnnotation && !r.scope).map(r => r.id).sort();
}

/** Datierende Rollen ohne ausdruecklichen Rang. */
function datingRolesWithoutRank(store) {
  const out = new Set();
  for (const list of store.recordDatings.values()) {
    for (const d of list) {
      if (!ANCHORING_SCOPES.has(d.scope)) continue;
      if (d.roleId && !store.roleRank.has(d.roleId)) out.add(d.roleId);
    }
  }
  return [...out].sort();
}

/** Ein Datenstand mit genau einer Annotation, deren Rolle frei gesetzt wird. */
function graphWithRole(role) {
  return {
    '@graph': [
      { '@id': 'm3gim-data:TEST_ROLE', '@type': 'rico:Record',
        'rico:identifier': 'TEST/ROLE',
        'm3gim-ontology:hasAnnotation': { '@id': 'm3gim-data:ev_TEST_ROLE' } },
      { '@id': 'm3gim-data:ev_TEST_ROLE', '@type': 'm3gim-ontology:Annotation',
        'agrelon:metadataProvenance': { '@id': 'm3gim-data:TEST_ROLE' },
        'm3gim-ontology:atDate': '1957-04-11',
        role },
    ],
  };
}

// ---------------------------------------------------------------------------

describe('1 Anzeigeform', () => {
  test('kein Rollenverweis des Datenstands bleibt ohne Anzeigeform', async () => {
    const missing = rolesWithoutDisplayForm(await realStore());
    assert.deepEqual(missing, [],
      `im Datenstand belegt, ohne Anzeigeform: ${missing.join(', ')}`);
  });

  test('eingespielte Verletzung: Verweis ohne prefLabel wird gemeldet', async () => {
    const store = await storeFrom(graphWithRole({ '@id': 'm3gim-vocab:performance' }));
    assert.deepEqual(rolesWithoutDisplayForm(store), ['m3gim-vocab:performance'],
      'ein Rollenverweis ohne prefLabel bleibt unbemerkt');
  });
});

describe('2 Bezugsebene', () => {
  test('keine Annotationsrolle des Datenstands ohne Bezugsebene', async () => {
    const missing = annotationRolesWithoutScope(await realStore());
    assert.deepEqual(missing, [],
      'ohne Eintrag in ANNOTATION_ROLE_SCOPE faellt die Datierung aus jeder '
      + `Auswahl nach Bezugsebene: ${missing.join(', ')}`);
  });

  test('eingespielte Verletzung: unbekannte Rolle wird gemeldet', async () => {
    const store = await storeFrom(graphWithRole(
      { '@id': 'm3gim-vocab:erfundeneRolle', 'skos:prefLabel': 'erfunden' }));
    assert.deepEqual(annotationRolesWithoutScope(store), ['m3gim-vocab:erfundeneRolle'],
      'eine unbekannte Annotationsrolle bleibt unbemerkt');
  });

  test('jede Bezugsebene des Datenstands ist ein Wert des Schemas', async () => {
    const store = await realStore();
    const VALID = new Set(Object.values(DATING_SCOPE));
    for (const [roleId, scope] of store.roleScope) {
      assert.ok(VALID.has(scope),
        `${roleId} traegt die Bezugsebene '${scope}', die es im Schema nicht gibt`);
    }
    for (const scope of ANCHORING_SCOPES) {
      assert.ok(VALID.has(scope), `ankernde Bezugsebene '${scope}' ist ungueltig`);
    }
  });
});

describe('3 Rang', () => {
  test('keine datierende Rolle des Datenstands ohne Rang', async () => {
    const missing = datingRolesWithoutRank(await realStore());
    assert.deepEqual(missing, [],
      'ohne Rang entscheidet die Quellreihenfolge ueber die abgeleitete '
      + `Datierung: ${missing.join(', ')}`);
  });

  test('eingespielte Verletzung: datierende Rolle ohne Rang wird gemeldet', async () => {
    // Ein Begriff, der datieren darf und keinen Rang traegt. Der Fall wird hier
    // ausdruecklich eingespielt statt aus dem Bestand geborgt, damit die
    // Pruefung ihren Gegenstand behaelt, sobald das Vokabular vollstaendig ist.
    const graph = graphWithRole(
      { '@id': 'm3gim-vocab:ohneRang', 'skos:prefLabel': 'ohne rang' });
    graph['@graph'].push({
      '@id': 'm3gim-vocab:ohneRang',
      '@type': 'skos:Concept',
      'skos:prefLabel': 'ohne rang',
      'm3gim-ontology:datingScope': { '@id': DATING_SCOPE.attested },
    });
    const store = await storeFrom(graph, { bare: true });
    assert.deepEqual(datingRolesWithoutRank(store), ['m3gim-vocab:ohneRang'],
      'eine datierende Rolle ohne Rang bleibt unbemerkt');
  });

  test('die Rangfolge des Datenstands ist wohlgeformt', async () => {
    const store = await realStore();
    const seen = new Map();
    for (const [roleId, rank] of store.roleRank) {
      assert.ok(roleId.startsWith('m3gim-vocab:'),
        `${roleId} traegt kein m3gim-vocab:-Praefix`);
      const scope = store.roleScope.get(roleId);
      assert.ok(scope, `${roleId} steht im Rang, hat aber keine Bezugsebene`);
      assert.ok(ANCHORING_SCOPES.has(scope),
        `${roleId} steht im Rang, darf aber gar nicht datieren`);
      assert.ok(!seen.has(rank),
        `Rang ${rank} doppelt vergeben: ${seen.get(rank)} und ${roleId}`);
      seen.set(rank, roleId);
    }
    assert.ok(seen.size > 0, 'Der Datenstand fuehrt keinen einzigen Rang');
  });

  test('jede gefuehrte Rolle traegt den Jahresindex allein', async () => {
    const ranked = [...(await realStore()).roleRank.keys()];
    for (const roleId of ranked) {
      const store = await storeFrom(graphWithRole(
        { '@id': roleId, 'skos:prefLabel': roleId.split(':').pop() }));
      const rec = store.records.get('m3gim-data:TEST_ROLE');
      assert.equal(primaryYear(store, rec).year, 1957,
        `${roleId} erreicht den Jahresindex nicht`);
      assert.ok(store.byYear.has(1957), `${roleId} fehlt im Jahresindex des Stores`);
    }
  });
});
