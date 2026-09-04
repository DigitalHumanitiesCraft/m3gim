/**
 * Die Beweiskette der annotierten Beziehung.
 *
 * Das Detail des Netzwerks zeigt zu einer Fokus-Person ihre AgRelOn-Beziehungen
 * und daneben die Belegliste. Die Belegliste ist die Ko-Okkurrenz, also jedes
 * Dokument, in dem die Person vorkommt; annotiert ist davon nur ein Teil. Damit
 * ein Beziehungs-Chip in genau das Dokument fuehren kann, das die Beziehung
 * traegt, muss `personEntry.relations[].recordId` auf einen vorhandenen Record
 * zeigen und dieser Record in der Belegmenge derselben Person liegen. Faellt
 * eine der beiden Bedingungen, zeigt der Chip ins Leere oder auf ein Dokument,
 * das die Liste daneben nicht fuehrt.
 *
 * Lauf: node --test tests/frontend/netzwerk-evidence.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { storeFromShipped } from './_shipped.mjs';
import { AGRELON_LABELS } from '../../docs/js/data/constants.js';
import { isMalaniuk } from '../../docs/js/views/_netzwerk-geometry.js';

const store = await storeFromShipped();

function personsWithRelations() {
  return [...store.persons.entries()].filter(([, e]) => e.relations && e.relations.length > 0);
}

describe('Beziehung und Beleg', () => {
  test('es gibt annotierte Beziehungen an Personen', () => {
    assert.ok(personsWithRelations().length >= 10,
      'Ohne annotierte Beziehungen prueft diese Datei nichts.');
  });

  test('jede Beziehung nennt einen vorhandenen Datensatz', () => {
    for (const [name, entry] of personsWithRelations()) {
      for (const rel of entry.relations) {
        assert.ok(rel.recordId, `${name}: Beziehung ohne recordId`);
        assert.ok(store.records.get(rel.recordId),
          `${name}: recordId ${rel.recordId} loest keinen Datensatz auf`);
      }
    }
  });

  test('der Beleg einer Beziehung liegt in der Belegmenge der Person', () => {
    // Ausgenommen die Nachlassbildnerin: sie ist in fast jeder Beziehung das
    // Subjekt und taucht nur dort als Objekt auf, wo eine dritte Person die
    // Beziehung zu ihr traegt. In einem solchen Datensatz steht sie nicht als
    // Beteiligte, ihre Belegmenge fuehrt ihn also nicht. Fuer jede andere
    // Person ist die Deckung die Bedingung dafuer, dass Chip und Belegliste
    // von demselben Dokument sprechen.
    for (const [name, entry] of personsWithRelations()) {
      if (isMalaniuk(name, entry)) continue;
      for (const rel of entry.relations) {
        assert.ok(entry.records.has(rel.recordId), (
          `${name}: der annotierte Beleg ${rel.recordId} steht nicht in der `
          + 'Belegliste, die das Detail daneben zeigt.'
        ));
      }
    }
  });

  test('jeder Beziehungstyp traegt eine Anzeigeform', () => {
    for (const [, entry] of personsWithRelations()) {
      for (const rel of entry.relations) {
        assert.ok(AGRELON_LABELS[rel.type], `Beziehungstyp ohne Label: ${rel.type}`);
      }
    }
  });
});

describe('Annotiertes ist die Minderheit der Ko-Okkurrenz', () => {
  test('Wagner, Wieland traegt weniger annotierte Belege als Dokumente', () => {
    const key = [...store.persons.keys()].find(k => /wagner/i.test(k) && /wieland/i.test(k));
    assert.ok(key, 'Wagner, Wieland fehlt im Personenindex.');
    const entry = store.persons.get(key);
    const annotated = new Set(entry.relations.map(r => r.recordId));
    assert.ok(annotated.size > 0);
    assert.ok(annotated.size < entry.records.size, (
      'Waeren alle Belege annotiert, brauchte die Liste keine Marke; der Fall, '
      + 'gegen den sie steht, ist genau dieser Unterschied.'
    ));
  });
});
