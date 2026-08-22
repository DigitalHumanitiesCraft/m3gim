/**
 * Loader-Integrationstest: deckt die bisher ungetestete Strecke
 * JSON-LD -> loadArchive() -> store ab (Erkenntnis Session 49).
 *
 * pytest prueft die JSON-LD-Seite, die uebrigen JS-Tests nur Pure-Functions —
 * dass die Daten korrekt IM STORE ankommen (Records, DFT-prefLabels, datumslose
 * Mobilitaets-STE, AgRelOn, Finanzen), war zuvor nur manuell verifizierbar.
 *
 * Zwei Strecken:
 *   A) Synthetische Fixture — deterministische Loader-Logik, unabhaengig vom
 *      Datenstand. Deckt auch die E-97-Datumslosigkeit ab.
 *   B) Echter Datenstand data/output/m3gim.jsonld — robuste strukturelle Anker
 *      (>=-Schwellen, kein harter Count), faengt Drift/Regress im realen
 *      Ankommen ab. Die ausgelieferte Datei unter docs/data/ traegt bis zum
 *      Abschluss aller drei Frontend-Schritte noch das abgeloeste Modell und
 *      ist deshalb nicht die Quelle dieser Pruefung.
 *
 * Lauf ueber den tests/frontend-Glob (siehe package.json / CI-Kommando).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { loadArchive } from '../../docs/js/data/loader.js';
import { dftLabel, getDocTypeId, ensureArray } from '../../docs/js/utils/format.js';
import { withConcepts } from './_concepts.mjs';

// Baut den Store ueber den ECHTEN loadArchive-Pfad; fetch wird auf das
// uebergebene Objekt umgelenkt und danach wiederhergestellt.
async function storeFrom(jsonld) {
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ status: 200, ok: true, json: async () => withConcepts(jsonld) });
  try {
    return await loadArchive('mock://data');
  } finally {
    globalThis.fetch = prevFetch;
  }
}

// ---------------------------------------------------------------------------
// A) Synthetische Fixture — deterministische Loader-Logik
// ---------------------------------------------------------------------------

const FIXTURE = {
  '@graph': [
    { '@id': 'm3gim-data:UAKUG_NIM', '@type': 'rico:RecordSet',
      'rico:hasRecordSetType': { '@id': 'ric-rst:Fonds' } },
    { '@id': 'm3gim-vocab:correspondence', '@type': 'skos:Concept',
      'skos:prefLabel': 'Korrespondenz' },
    { '@id': 'm3gim-data:TEST_1', '@type': 'rico:Record',
      'rico:identifier': 'TEST/1', 'rico:title': 'Testbrief', 'rico:date': '1956',
      'rico:hasDocumentaryFormType': { '@id': 'm3gim-vocab:correspondence' },
      'rico:hasOrHadLocation': { name: 'New York', '@id': 'wd:Q1384' },
      'm3gim-ontology:hasAnnotation': { '@id': 'm3gim-data:ev_TEST_1' },
      'm3gim-ontology:hasAssociatedAgent': [
        { name: 'Malaniuk, Ira', '@type': 'rico:Person',
          role: { '@id': 'm3gim-vocab:singer', 'skos:prefLabel': 'sänger' },
          'm3gim-ontology:indexNote': 'Mezzosopranistin',
          'm3gim-ontology:lifespan': '1919-2009' },
        { name: 'Metropolitan Opera', '@type': 'rico:CorporateBody',
          role: { '@id': 'm3gim-vocab:organizer', 'skos:prefLabel': 'veranstalter' },
          'm3gim-ontology:headquarters': 'New York',
          'm3gim-ontology:keyContact': 'Bing, Rudolf' },
      ],
      'rico:hasOrHadSubject': [
        { name: 'Aida', '@type': 'm3gim-ontology:MusicalWork', composer: 'Verdi, Giuseppe',
          'm3gim-ontology:sungPart': 'Amneris' },
      ],
      'm3gim-ontology:hasPerformance': [{ '@id': 'm3gim-data:perf_TEST_1' }],
      'm3gim-ontology:hasAgentRelation': [{
        '@type': 'agrelon:HasCorrespondent',
        'agrelon:hasObject': { name: 'Wieland Wagner', '@id': 'wd:Q61058' },
        'agrelon:metadataProvenance': { '@id': 'm3gim-data:TEST_1' },
      }],
      'm3gim-ontology:hasDetail': [{
        '@type': 'm3gim-ontology:Annotation',
        'm3gim-ontology:detailField': 'einnahmen',
        role: { '@id': 'm3gim-vocab:performanceFee', 'skos:prefLabel': 'abendgage' },
        'm3gim-ontology:detailValue': '4000, Esc',
        'm3gim-ontology:monetaryAmount': { '@value': '4000', '@type': 'xsd:decimal' },
        'm3gim-ontology:currency': 'Esc',
      }],
    },
    // Datumslose Mobilitaets-Annotation (E-97): kein atDate.
    { '@id': 'm3gim-data:ev_TEST_1', '@type': 'm3gim-ontology:Annotation',
      'm3gim-ontology:atPlace': { name: 'New York', '@id': 'wd:Q1384',
        'geo:lat': 40.7, 'geo:long': -74 },
      role: { '@id': 'm3gim-vocab:destinationPlace', 'skos:prefLabel': 'zielort' },
      'agrelon:metadataProvenance': { '@id': 'm3gim-data:TEST_1' } },
    // M2: StageRole + Performance fuer die Performance-Kette.
    { '@id': 'm3gim-data:stagerole_amneris', '@type': 'm3gim-ontology:StageRole',
      'rico:name': 'Amneris' },
    { '@id': 'm3gim-data:perf_TEST_1', '@type': 'm3gim-ontology:Performance',
      'm3gim-ontology:hasStageRole': { '@id': 'm3gim-data:stagerole_amneris' },
      'm3gim-ontology:hasPerformer': { name: 'Malaniuk, Ira', '@type': 'rico:Person' },
      'm3gim-ontology:performanceOf': { name: 'Aida',
        '@type': 'm3gim-ontology:MusicalWork', '@id': 'wd:Q200702' },
      'm3gim-ontology:atDate': '1956-05-01' },
  ],
};

describe('Loader gegen synthetische Fixture', () => {
  test('Grundstruktur: Fonds, Record, Signatur-Index', async () => {
    const store = await storeFrom(FIXTURE);
    assert.ok(store.fonds, 'Fonds nicht erkannt');
    assert.ok(store.records.has('m3gim-data:TEST_1'), 'Record nicht im Index');
    assert.equal(store.bySignatur.get('TEST/1')?.['@id'], 'm3gim-data:TEST_1');
  });

  test('DFT-prefLabel kommt im Store an und loest ueber dftLabel auf', async () => {
    const store = await storeFrom(FIXTURE);
    assert.equal(store.dftHierarchy.get('m3gim-vocab:correspondence')?.prefLabel,
      'Korrespondenz');
    assert.equal(dftLabel(store, 'correspondence'), 'Korrespondenz');
    // End-to-end ueber den Record: docType -> lesbares Label.
    const rec = store.records.get('m3gim-data:TEST_1');
    assert.equal(dftLabel(store, getDocTypeId(rec)), 'Korrespondenz');
  });

  test('datumslose Mobilitaets-Annotation (E-97) korrekt indexiert', async () => {
    const store = await storeFrom(FIXTURE);
    const ev = store.mobilityEvents.get('m3gim-data:ev_TEST_1');
    assert.ok(ev, 'verortete Annotation fehlt im Store');
    assert.equal(ev.date, null, 'eine datumslose Verortung darf kein Datum tragen');
    assert.equal(ev.role, 'zielort');
    assert.equal(ev.roleId, 'm3gim-vocab:destinationPlace');
    assert.equal(ev.place, 'New York');
    assert.equal(ev.placeWikidata, 'wd:Q1384');
    assert.equal(ev.placeLat, 40.7);
    assert.equal(ev.recordId, 'm3gim-data:TEST_1');
    // Record -> Annotations-Verknuepfung aufloesbar.
    assert.ok(store.recordToEvents.get('m3gim-data:TEST_1')
      ?.includes('m3gim-data:ev_TEST_1'));
  });

  test('Mobilitaets-Ort bleibt zusaetzlich als Location (kein Index-Regress)', async () => {
    const store = await storeFrom(FIXTURE);
    assert.ok(store.locations.has('New York'), 'Ort nicht im Locations-Index');
    assert.ok(store.locations.get('New York').records.has('m3gim-data:TEST_1'));
  });

  test('AgRelOn-Relation kommt flach im Store an', async () => {
    const store = await storeFrom(FIXTURE);
    const rels = store.agentRelations.get('m3gim-data:TEST_1');
    assert.equal(rels?.length, 1);
    assert.equal(rels[0].type, 'agrelon:HasCorrespondent');
    assert.equal(rels[0].objectName, 'Wieland Wagner');
    assert.equal(rels[0].objectWikidata, 'wd:Q61058');
    assert.equal(rels[0].provenance, 'm3gim-data:TEST_1');
  });

  test('Finanzposten kommt mit Betrag + Waehrung an', async () => {
    const store = await storeFrom(FIXTURE);
    const fin = store.finances.get('m3gim-data:TEST_1');
    assert.equal(fin?.length, 1);
    assert.equal(fin[0].amount, 4000);
    assert.equal(fin[0].currency, 'Esc');
    assert.equal(fin[0].role, 'abendgage');
  });
});

describe('M2: kuratierte Index-Felder + Performance-Kette (synthetisch)', () => {
  test('Org-Sitz + keyContact kommen im Organisations-Store an', async () => {
    const store = await storeFrom(FIXTURE);
    const org = store.organizations.get('Metropolitan Opera');
    assert.ok(org, 'Organisation nicht im Store');
    assert.equal(org.sitz, 'New York', 'Org-Sitz fehlt (auswaerts/am-Haus-Achse)');
    assert.equal(org.keyContact, 'Bing, Rudolf');
  });

  test('Personen-Notiz + Lebensdaten kommen im Personen-Store an', async () => {
    const store = await storeFrom(FIXTURE);
    const p = store.persons.get('Malaniuk, Ira');
    assert.ok(p, 'Person nicht im Store');
    assert.equal(p.note, 'Mezzosopranistin');
    assert.equal(p.lifespan, '1919-2009');
  });

  test('Werk-Partie kommt im Werk-Store an', async () => {
    const store = await storeFrom(FIXTURE);
    const w = store.works.get('Aida');
    assert.ok(w, 'Werk nicht im Store');
    assert.equal(w.partie, 'Amneris', 'die von Malaniuk gesungene Partie fehlt');
  });

  test('Performance-Kette: Record -> Werk + Performer + Buehnenrolle aufgeloest', async () => {
    const store = await storeFrom(FIXTURE);
    const perfs = store.recordToPerformances.get('m3gim-data:TEST_1');
    assert.ok(perfs && perfs.length === 1, 'Performance nicht aufgeloest');
    const p = perfs[0];
    assert.equal(p.work?.name, 'Aida');
    assert.equal(p.work?.wikidata, 'wd:Q200702');
    assert.deepEqual(p.stageRoles, ['Amneris']);
    assert.deepEqual(p.performers, ['Malaniuk, Ira']);
    assert.equal(p.date, '1956-05-01');
  });
});

// ---------------------------------------------------------------------------
// B) Echter Datenstand — robuste strukturelle Anker (echtes Ankommen)
// ---------------------------------------------------------------------------

function loadDocsData() {
  const url = new URL('../../data/output/m3gim.jsonld', import.meta.url);
  return JSON.parse(readFileSync(url, 'utf-8'));
}

describe('Loader gegen den echten Datenstand', () => {
  test('Kern-Indizes sind befuellt', async () => {
    const store = await storeFrom(loadDocsData());
    assert.ok(store.fonds, 'kein Fonds');
    assert.ok(store.records.size > 0, 'keine Records');
    assert.ok(store.persons.size > 50, `nur ${store.persons.size} Personen`);
    assert.ok(store.locations.size > 0, 'keine Orte');
    assert.ok(store.works.size > 0, 'keine Werke');
    assert.ok(store.dftHierarchy.size > 0, 'keine DFT-Concepts');
  });

  test('jeder DFT-Concept traegt ein nicht-leeres prefLabel und loest auf', async () => {
    const store = await storeFrom(loadDocsData());
    for (const [id, concept] of store.dftHierarchy) {
      assert.ok(concept.prefLabel && concept.prefLabel.trim(),
        `Concept ${id} ohne prefLabel`);
      // Round-trip ueber die Funktion, die die Views nutzen.
      const shortId = id.replace(/^m3gim-vocab:/, '');
      assert.equal(dftLabel(store, shortId), concept.prefLabel,
        `dftLabel('${shortId}') weicht vom prefLabel ab`);
    }
  });

  test('mind. ein Record loest seinen Dokumenttyp auf ein Label auf', async () => {
    const store = await storeFrom(loadDocsData());
    const resolved = [...store.records.values()].some(r => {
      const id = getDocTypeId(r);
      return id && dftLabel(store, id) !== id;
    });
    assert.ok(resolved, 'kein Record mit aufloesbarem Dokumenttyp-Label');
  });

  test('AgRelOn + Finanzen kommen an', async () => {
    const store = await storeFrom(loadDocsData());
    const rel = [...store.agentRelations.values()].flat()
      .find(r => r.type && r.provenance);
    assert.ok(rel, 'keine wohlgeformte AgRelOn-Relation');
    const fin = [...store.finances.values()].flat()
      .find(e => typeof e.amount === 'number' && e.currency);
    assert.ok(fin, 'kein Finanz-Eintrag mit Betrag + Waehrung');
  });

  test('recordToEvents referenziert nur aufloesbare Annotationen', async () => {
    const store = await storeFrom(loadDocsData());
    for (const [recId, eventIds] of store.recordToEvents) {
      for (const eid of eventIds) {
        assert.ok(store.mobilityEvents.has(eid),
          `Record ${recId} verweist auf unaufloesbare Annotation ${eid}`);
      }
    }
  });

  // M2: kuratierte Index-Felder + Performance-Kette kommen real an (Drift-Lock).
  test('M2: Org-Sitze, Werk-Partien und Performance-Kette real im Store', async () => {
    const store = await storeFrom(loadDocsData());
    const orgsMitSitz = [...store.organizations.values()].filter(o => o.sitz);
    assert.ok(orgsMitSitz.length >= 15,
      `nur ${orgsMitSitz.length} Institutionen mit Sitz im Store (erwartet >= 15)`);
    const werkeMitPartie = [...store.works.values()].filter(w => w.partie);
    assert.ok(werkeMitPartie.length >= 10,
      `nur ${werkeMitPartie.length} Werke mit Partie im Store (erwartet >= 10)`);
    assert.ok(store.recordToPerformances.size >= 20,
      `nur ${store.recordToPerformances.size} Records mit aufgeloesten Performances`);
    // Wohlgeformtheit: mind. eine Performance traegt Werk ODER Buehnenrolle.
    const anyResolved = [...store.recordToPerformances.values()].flat()
      .some(p => p.work || p.stageRoles.length || p.performers.length);
    assert.ok(anyResolved, 'keine Performance mit Werk/Rolle/Performer aufgeloest');
  });

  // E-107-Kontrakt: die 4 Briefe, die durch die Staleness-Behebung erstmals
  // Mobilitaets-Events bekamen (vorher 0), tragen jetzt datumslose Ortsrollen.
  // Sichert das reale Ankommen ab (gruene pytest != End-to-End-Store).
  test('E-97/E-107: die 4 Anker-Briefe tragen datumslose Ortsrollen-Events', async () => {
    const store = await storeFrom(loadDocsData());
    // Nach der Zusammenfuehrung tragen Absende- und Abreiseort dieselbe Rolle
    // wie ihre Datierung; der urspruenglich erfasste Wert steht in
    // derivedFromRole.
    const MOBILITY_ROLES = new Set(['zielort', 'absendung', 'abreise']);
    const ANCHORS = ['m3gim-data:NIM_004_1', 'm3gim-data:NIM_007_1',
                     'm3gim-data:NIM_007_20', 'm3gim-data:NIM_007_21'];
    for (const recId of ANCHORS) {
      const eventIds = store.recordToEvents.get(recId) || [];
      const events = eventIds.map(id => store.mobilityEvents.get(id)).filter(Boolean);
      const ortsrollen = events.filter(e => MOBILITY_ROLES.has(e.role));
      assert.ok(ortsrollen.length > 0,
        `${recId}: keine Mobilitaets-Ortsrolle im Store angekommen`);
      for (const ev of ortsrollen) {
        assert.equal(ev.date, null,
          `${recId}: Ortsrolle ${ev.role} darf datumslos sein (date===null)`);
        assert.ok(ev.place && ev.place.trim(),
          `${recId}: Ortsrolle ${ev.role} ohne place`);
      }
    }
  });
});
