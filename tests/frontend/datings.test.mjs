/**
 * Datierungen und Rollen im zusammengefuehrten Modell.
 *
 * Die Klasse `m3gim-ontology:Annotation` traegt jede Datierung und jede
 * Verortung. Der Store legt sie normalisiert ab und bietet den Ansichten vier
 * Zugaenge, mit denen sie eine Datierung lesen, auswaehlen und ordnen koennen,
 * ohne einen Property-Namen zu kennen: `annotationsOf`, `datingsOf`,
 * `datingsByScope` und `primaryYear`.
 *
 * Geprueft werden die vier Anforderungen aus
 * `data/reports/frontend-date-contract.md`:
 *
 *   A1  Die Rolle liefert ihre Anzeigeform aus den Daten. Das mitgefuehrte
 *       `skos:prefLabel` am Verweisknoten ersetzt jede Hand-Map im Code.
 *   A2  Zwei Ordnungen. Die Reihenfolge zwischen Rollen liegt im Rang am
 *       Rollenbegriff, die Reihenfolge innerhalb eines Records ist die
 *       Quellreihenfolge, die der Loader nicht umsortiert.
 *   A3  Jede Datierung nennt ihre Bezugsebene. Nur `object` und `attested`
 *       duerfen einen Record datieren; Erwaehnung, Rahmenveranstaltung und der
 *       Vertragsstatus `nicht eingehalten` bleiben aussen vor.
 *   A4  Ein Zeitanker je Record bleibt einwertig und benannt. `rico:date`
 *       besteht fort und hat Vorrang vor jeder abgeleiteten Datierung.
 *
 * Zwei Strecken wie in `loader.test.mjs`: synthetische Fixtures fuer die
 * deterministische Logik, Anker am Datenstand `data/output/m3gim.jsonld` fuer
 * das reale Ankommen.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  loadArchive, annotationsOf, datingsOf, datingsByScope, primaryYear,
} from '../../docs/js/data/loader.js';
import { roleLabel, roleIdOf, roleToken } from '../../docs/js/utils/format.js';
import { splitQualifier } from '../../docs/js/utils/date-parser.js';
import { withConcepts } from './_concepts.mjs';
import { DATING_SCOPE, ANCHORING_SCOPES } from '../../docs/js/data/constants.js';

async function storeFrom(jsonld, { bare = false } = {}) {
  // Bezugsebene und Rang stehen seit E-150 an den Begriffsknoten des
  // Datensatzes. Ein Fixture ohne sie haette keine Bezugsebene mehr.
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

/** Verweisknoten einer Rolle, wie die Pipeline ihn schreibt. */
function role(id, prefLabel) {
  return { '@id': `m3gim-vocab:${id}`, 'skos:prefLabel': prefLabel };
}

/** Annotationsknoten mit Provenienz auf seinen Record. */
function annotation(id, recordId, fields) {
  return {
    '@id': `m3gim-data:ev_${id}`,
    '@type': 'm3gim-ontology:Annotation',
    'agrelon:metadataProvenance': { '@id': `m3gim-data:${recordId}` },
    ...fields,
  };
}

/**
 * Record mit Annotationen. Die Reihenfolge der `hasAnnotation`-Referenzen ist
 * die Quellreihenfolge und damit Gegenstand von A2.
 */
function record(id, fields, annotationIds = []) {
  return {
    '@id': `m3gim-data:${id}`,
    '@type': 'rico:Record',
    'rico:identifier': `TEST/${id}`,
    ...fields,
    ...(annotationIds.length
      ? { 'm3gim-ontology:hasAnnotation': annotationIds.map(a => ({ '@id': `m3gim-data:ev_${a}` })) }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// A1 — die Anzeigeform kommt aus den Daten
// ---------------------------------------------------------------------------

describe('A1 Anzeigeform der Rolle', () => {
  const FIXTURE = {
    '@graph': [
      record('R_LABEL', {}, ['R_LABEL_1']),
      annotation('R_LABEL_1', 'R_LABEL', {
        'm3gim-ontology:atDate': '1953-08-13',
        role: role('publicationDate', 'erscheinungsdatum'),
      }),
    ],
  };

  test('das mitgefuehrte prefLabel wird zur Anzeigeform', async () => {
    const store = await storeFrom(FIXTURE);
    const [d] = datingsOf(store, store.records.get('m3gim-data:R_LABEL'));
    assert.equal(d.roleId, 'm3gim-vocab:publicationDate');
    assert.equal(d.roleLabel, 'erscheinungsdatum');
    assert.equal(roleLabel(store, d.roleId), 'erscheinungsdatum',
      'roleLabel loest die Rolle nicht ueber das Vokabular des Stores auf');
  });

  test('roleLabel nimmt Verweisknoten, Id und Literal', async () => {
    const store = await storeFrom(FIXTURE);
    assert.equal(roleLabel(store, role('publicationDate', 'erscheinungsdatum')),
      'erscheinungsdatum');
    assert.equal(roleLabel(store, 'm3gim-vocab:publicationDate'), 'erscheinungsdatum');
    // Der Vertragsstatus ist kein Begriff des Vokabulars und bleibt Literal.
    assert.equal(roleLabel(store, 'nicht eingehalten'), 'nicht eingehalten');
    assert.equal(roleLabel(store, null), '');
  });

  test('ohne Concept im Store faellt roleLabel auf den lokalen Namen', async () => {
    const store = await storeFrom({ '@graph': [] }, { bare: true });
    assert.equal(roleLabel(store, 'm3gim-vocab:publicationDate'), 'publicationDate');
  });

  test('roleIdOf und roleToken trennen Kennung und Rohform', () => {
    const ref = role('mentioned', 'erwähnt');
    assert.equal(roleIdOf(ref), 'm3gim-vocab:mentioned');
    assert.equal(roleToken(ref), 'erwähnt');
    assert.equal(roleIdOf('nicht eingehalten'), null,
      'ein Literal hat keine Concept-Id');
    assert.equal(roleToken('nicht eingehalten'), 'nicht eingehalten');
  });
});

// ---------------------------------------------------------------------------
// A2 — zwei Ordnungen
// ---------------------------------------------------------------------------

describe('A2 Ordnung zwischen Rollen (Rang)', () => {
  // Der Fall aus dem Vertrag: ein Record mit Auffuehrungs- und
  // Ueberweisungsdatum muss das Auffuehrungsjahr liefern. Die Quellreihenfolge
  // stellt die Ueberweisung bewusst nach vorn, damit nicht die Position gewinnt.
  const FIXTURE = {
    '@graph': [
      record('R_RANK', {}, ['R_RANK_transfer', 'R_RANK_perf']),
      annotation('R_RANK_transfer', 'R_RANK', {
        'm3gim-ontology:atDate': '1961-03-04',
        role: role('transferDate', 'überweisung'),
      }),
      annotation('R_RANK_perf', 'R_RANK', {
        'm3gim-ontology:atDate': '1956-05-01',
        role: role('performance', 'aufführung'),
      }),
    ],
  };

  test('der Rang am Rollenbegriff entscheidet, nicht die Position', async () => {
    const store = await storeFrom(FIXTURE);
    const rec = store.records.get('m3gim-data:R_RANK');
    const anchor = primaryYear(store, rec);
    assert.equal(anchor.year, 1956, 'nicht das Auffuehrungsjahr gewaehlt');
    assert.equal(anchor.source, 'm3gim-vocab:performance');
    assert.equal(anchor.label, 'aufführung');
  });

  test('der Jahresindex des Stores folgt derselben Auswahl', async () => {
    const store = await storeFrom(FIXTURE);
    const rec = store.records.get('m3gim-data:R_RANK');
    assert.ok(store.byYear.get(1956)?.includes(rec), 'Record haengt nicht am Rang-Jahr');
    assert.ok(!store.byYear.has(1961), 'der nachrangige Wert datiert den Record mit');
  });
});

describe('A2 Ordnung innerhalb eines Records (Quellreihenfolge)', () => {
  const FIXTURE = {
    '@graph': [
      record('R_ORDER', {}, ['R_ORDER_probe', 'R_ORDER_aufnahme']),
      annotation('R_ORDER_probe', 'R_ORDER', {
        'm3gim-ontology:atDate': '1953-07-02',
        role: role('dressRehearsal', 'generalprobe'),
      }),
      annotation('R_ORDER_aufnahme', 'R_ORDER', {
        'm3gim-ontology:atDate': '1953-07-03',
        role: role('recording', 'aufnahme'),
      }),
    ],
  };

  test('datingsOf liefert die Reihenfolge der Quelle, nicht die des Rangs', async () => {
    const store = await storeFrom(FIXTURE);
    const rec = store.records.get('m3gim-data:R_ORDER');
    assert.deepEqual(datingsOf(store, rec).map(d => d.roleLabel),
      ['generalprobe', 'aufnahme'],
      'die Chip-Reihenfolge folgt nicht der Quellreihenfolge');
    // Zweiter Lauf, gleiche Reihenfolge — keine Map-/Set-Streuung.
    const again = await storeFrom(FIXTURE);
    assert.deepEqual(datingsOf(again, again.records.get('m3gim-data:R_ORDER'))
      .map(d => d.id), datingsOf(store, rec).map(d => d.id));
  });

  test('jede Datierung fuehrt ihren Rang mit', async () => {
    const store = await storeFrom(FIXTURE);
    const rec = store.records.get('m3gim-data:R_ORDER');
    for (const d of datingsOf(store, rec)) {
      assert.equal(typeof d.rank, 'number', `${d.roleId} ohne Rang`);
    }
  });
});

// ---------------------------------------------------------------------------
// A3 — Bezugsebene
// ---------------------------------------------------------------------------

describe('A3 Bezugsebene je Datierung', () => {
  // Der Beleg aus dem Vertrag: eine im Dokument genannte Jahreszahl 1872 auf
  // einer Lebenslinie von 1919 bis 2009. Sie darf den Record nicht datieren.
  const MENTION_ONLY = {
    '@graph': [
      record('R_MENTION', {}, ['R_MENTION_1']),
      annotation('R_MENTION_1', 'R_MENTION', {
        'm3gim-ontology:atDate': '1872',
        role: role('mentioned', 'erwähnt'),
      }),
    ],
  };

  test('eine Erwaehnung datiert den Record nicht', async () => {
    const store = await storeFrom(MENTION_ONLY);
    const rec = store.records.get('m3gim-data:R_MENTION');
    assert.equal(primaryYear(store, rec).year, null,
      'die Erwaehnung ist auf die Lebenslinie gewandert');
    assert.equal(store.byYear.has(1872), false,
      'die Erwaehnung steht im Jahresindex');
  });

  test('die Erwaehnung bleibt lesbar, sie ist nur anders eingeordnet', async () => {
    const store = await storeFrom(MENTION_ONLY);
    const rec = store.records.get('m3gim-data:R_MENTION');
    const mentions = datingsByScope(store, rec, DATING_SCOPE.mentioned);
    assert.equal(mentions.length, 1, 'die Erwaehnung ist verschwunden statt eingeordnet');
    assert.equal(mentions[0].date, '1872');
    assert.equal(mentions[0].scope, DATING_SCOPE.mentioned);
    assert.deepEqual(datingsByScope(store, rec, DATING_SCOPE.attested), []);
  });

  test('der Vertragsstatus `nicht eingehalten` datiert nicht', async () => {
    const store = await storeFrom({
      '@graph': [
        record('R_UNFULFILLED', {}, ['R_UNFULFILLED_1']),
        annotation('R_UNFULFILLED_1', 'R_UNFULFILLED', {
          'm3gim-ontology:atDate': '1953-05-17',
          role: 'nicht eingehalten',
        }),
      ],
    });
    const rec = store.records.get('m3gim-data:R_UNFULFILLED');
    assert.equal(primaryYear(store, rec).year, null,
      'ein nicht eingehaltener Termin erzeugt einen Phantompunkt');
    assert.equal(datingsByScope(store, rec, DATING_SCOPE.unfulfilled).length, 1);
  });

  test('die Rahmenveranstaltung datiert nicht', async () => {
    const store = await storeFrom({
      '@graph': [
        record('R_FRAMING', {}, ['R_FRAMING_1']),
        annotation('R_FRAMING_1', 'R_FRAMING', {
          'm3gim-ontology:atDate': '1953-06-24/1953-08-22',
          role: role('framingEvent', 'rahmenveranstaltung'),
        }),
      ],
    });
    const rec = store.records.get('m3gim-data:R_FRAMING');
    assert.equal(primaryYear(store, rec).year, null,
      'die Festspielsaison datiert den Record mit');
    assert.equal(datingsByScope(store, rec, DATING_SCOPE.framing).length, 1);
  });
});

// ---------------------------------------------------------------------------
// A4 — der Zeitanker
// ---------------------------------------------------------------------------

describe('A4 Zeitanker am Record', () => {
  test('rico:date hat Vorrang vor jeder abgeleiteten Datierung', async () => {
    const store = await storeFrom({
      '@graph': [
        record('R_ANCHOR', { 'rico:date': '1952-08-25' }, ['R_ANCHOR_1']),
        annotation('R_ANCHOR_1', 'R_ANCHOR', {
          'm3gim-ontology:atDate': '1956-05-01',
          role: role('performance', 'aufführung'),
        }),
      ],
    });
    const anchor = primaryYear(store, store.records.get('m3gim-data:R_ANCHOR'));
    assert.equal(anchor.year, 1952);
    assert.equal(anchor.source, 'rico:date');
    assert.equal(anchor.roleId, null, 'der Anker traegt keine Rolle');
  });

  test('rico:creationDate ist als Datierung lesbar, ohne den Namen zu kennen', async () => {
    const store = await storeFrom({
      '@graph': [record('R_CREATION', { 'rico:creationDate': '1954-11-02' })],
    });
    const rec = store.records.get('m3gim-data:R_CREATION');
    const [d] = datingsOf(store, rec);
    assert.ok(d, 'die Entstehungsdatierung erscheint nicht in der Datierungsliste');
    assert.equal(d.date, '1954-11-02');
    assert.equal(d.roleId, 'm3gim-vocab:creation');
    assert.equal(d.scope, DATING_SCOPE.object);
    assert.equal(primaryYear(store, rec).year, 1954);
    assert.equal(primaryYear(store, rec).source, 'rico:creationDate');
    assert.ok(store.byYear.get(1954)?.includes(rec));
  });

  test('ein Record ohne jede Datierung bleibt ohne Jahr', async () => {
    const store = await storeFrom({ '@graph': [record('R_NONE', {})] });
    const anchor = primaryYear(store, store.records.get('m3gim-data:R_NONE'));
    assert.deepEqual(anchor, { year: null, source: null, roleId: null, label: null });
  });
});

// ---------------------------------------------------------------------------
// Qualifier und Verortung
// ---------------------------------------------------------------------------

describe('Qualifier wird einmal abgetrennt, nicht an jeder Lesestelle', () => {
  test('splitQualifier trennt Praefix und Wert', () => {
    assert.deepEqual(splitQualifier('nach:1956'), { qualifier: 'nach', value: '1956' });
    assert.deepEqual(splitQualifier('circa:1950-05'), { qualifier: 'circa', value: '1950-05' });
    assert.deepEqual(splitQualifier('1956-05-01'), { qualifier: null, value: '1956-05-01' });
    assert.deepEqual(splitQualifier(null), { qualifier: null, value: null });
  });

  test('die Datierung traegt den Qualifier als Feld, nicht im Wert', async () => {
    const store = await storeFrom({
      '@graph': [
        record('R_QUAL', {}, ['R_QUAL_1']),
        annotation('R_QUAL_1', 'R_QUAL', {
          'm3gim-ontology:atDate': 'nach:1956',
          role: role('season', 'spielzeit'),
        }),
      ],
    });
    const rec = store.records.get('m3gim-data:R_QUAL');
    const [d] = datingsOf(store, rec);
    assert.equal(d.qualifier, 'nach');
    assert.equal(d.date, '1956', 'der Qualifier steckt weiterhin im Datumswert');
    assert.equal(d.rawDate, 'nach:1956');
    assert.equal(d.year, 1956);
  });
});

describe('Verortete Annotationen bleiben die Mobilitaets-Ereignisse', () => {
  const FIXTURE = {
    '@graph': [
      record('R_PLACE', {}, ['R_PLACE_ziel', 'R_PLACE_erw']),
      annotation('R_PLACE_ziel', 'R_PLACE', {
        'm3gim-ontology:atPlace': {
          name: 'Zürich', '@id': 'wd:Q72', 'geo:lat': 47.37, 'geo:long': 8.54,
          'm3gim-ontology:country': 'Schweiz',
        },
        role: role('destinationPlace', 'zielort'),
      }),
      annotation('R_PLACE_erw', 'R_PLACE', {
        'm3gim-ontology:atDate': '1872',
        role: role('mentioned', 'erwähnt'),
      }),
    ],
  };

  test('nur die verortete Annotation erreicht mobilityEvents', async () => {
    const store = await storeFrom(FIXTURE);
    assert.deepEqual([...store.mobilityEvents.keys()], ['m3gim-data:ev_R_PLACE_ziel'],
      'die datumslose Erwaehnung ist in die Ereignismenge gerutscht');
    const ev = store.mobilityEvents.get('m3gim-data:ev_R_PLACE_ziel');
    assert.equal(ev.place, 'Zürich');
    assert.equal(ev.placeWikidata, 'wd:Q72');
    assert.equal(ev.placeLat, 47.37);
    assert.equal(ev.placeCountry, 'Schweiz');
    assert.equal(ev.date, null, 'eine Mobilitaets-Ortsrolle darf datumslos sein');
    assert.equal(ev.role, 'zielort');
    assert.equal(ev.roleId, 'm3gim-vocab:destinationPlace');
    assert.equal(ev.cluster, 'korrespondenz', 'die Sicht kommt nicht aus der Rollen-Id');
    assert.equal(ev.recordId, 'm3gim-data:R_PLACE');
    assert.deepEqual(store.recordToEvents.get('m3gim-data:R_PLACE'),
      ['m3gim-data:ev_R_PLACE_ziel']);
  });

  test('annotationsOf liefert beide, datingsOf nur die datierte', async () => {
    const store = await storeFrom(FIXTURE);
    const rec = store.records.get('m3gim-data:R_PLACE');
    assert.equal(annotationsOf(store, rec).length, 2);
    assert.deepEqual(datingsOf(store, rec).map(d => d.roleLabel), ['erwähnt']);
  });
});

// ---------------------------------------------------------------------------
// Anker am Datenstand
// ---------------------------------------------------------------------------

describe('Datenstand data/output/m3gim.jsonld', () => {
  test('Annotationen, Datierungen und Rollen kommen real an', async () => {
    const store = await realStore();
    assert.ok(store.annotations.size > 0, 'keine Annotation im Store');
    assert.ok(store.roleVocab.size > 0, 'kein Rollenbegriff im Store');
    const withDatings = [...store.recordDatings.values()].filter(l => l.length > 0);
    assert.ok(withDatings.length >= 50,
      `nur ${withDatings.length} Records mit Datierung`);
  });

  test('jede Datierung traegt Bezugsebene, Rang und Anzeigeform', async () => {
    const store = await realStore();
    const SCOPES = new Set([...Object.values(DATING_SCOPE), 'unclassified']);
    for (const rec of store.allRecords) {
      for (const d of datingsOf(store, rec)) {
        assert.ok(SCOPES.has(d.scope),
          `${rec['@id']}: Datierung mit Rolle ${d.roleId} ohne Bezugsebene`);
        assert.equal(typeof d.rank, 'number', `${d.roleId} ohne Rang`);
        if (d.scope === 'unclassified') continue;
        assert.ok(d.roleLabel && d.roleLabel.trim(),
          `${rec['@id']}: Datierung ohne Anzeigeform`);
      }
    }
  });

  test('eine rollenlose Annotation ist benannt und datiert nicht', async () => {
    const store = await storeFrom({
      '@graph': [
        record('R_NOROLE', {}, ['R_NOROLE_1']),
        annotation('R_NOROLE_1', 'R_NOROLE', {
          'm3gim-ontology:atPlace': { name: 'Wuppertal' },
          'm3gim-ontology:atDate': '1953-04-26',
        }),
      ],
    });
    const rec = store.records.get('m3gim-data:R_NOROLE');
    const [d] = datingsOf(store, rec);
    assert.equal(d.scope, 'unclassified',
      'eine Datierung ohne Rolle bleibt ohne benannte Bezugsebene');
    assert.equal(primaryYear(store, rec).year, null,
      'eine Datierung ohne entscheidbare Bezugsebene datiert den Record');
  });

  test('kein Record wird von einer Erwaehnung datiert', async () => {
    const store = await realStore();
    for (const rec of store.allRecords) {
      const anchor = primaryYear(store, rec);
      if (!anchor.roleId) continue;
      const scope = store.roleVocab.get(anchor.roleId)?.scope;
      assert.ok(ANCHORING_SCOPES.has(scope),
        `${rec['@id']}: datiert ueber die Bezugsebene ${scope}`);
    }
  });

  test('der Zeitanker bleibt einwertig und deckt den Bestand', async () => {
    const store = await realStore();
    const dated = store.allRecords.filter(r => primaryYear(store, r).year != null);
    assert.ok(dated.length >= 400, `nur ${dated.length} datierte Records`);
    assert.ok(dated.length < store.allRecords.length,
      'jeder Record gilt als datiert, der Anker trennt nicht mehr');
  });

  test('die verorteten Annotationen tragen die Mobilitaetsspur', async () => {
    const store = await realStore();
    assert.ok(store.mobilityEvents.size >= 100,
      `nur ${store.mobilityEvents.size} verortete Annotationen`);
    for (const ev of store.mobilityEvents.values()) {
      assert.ok(ev.place && String(ev.place).trim(), `${ev.id}: verortet ohne Ortsnamen`);
    }
    for (const [recId, ids] of store.recordToEvents) {
      for (const id of ids) {
        assert.ok(store.mobilityEvents.has(id),
          `Record ${recId} verweist auf unaufloesbare Annotation ${id}`);
      }
    }
  });
});
