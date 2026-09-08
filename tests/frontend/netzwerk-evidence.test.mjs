/**
 * The chain of evidence behind a recorded relation.
 *
 * The detail column of the Netzwerk shows the AgRelOn relations of the selected
 * actor beside its records. The record list is the co-mention, meaning every
 * document naming the actor; only a part of it is annotated. For a relation
 * chip to lead into exactly the document that carries the relation,
 * `personEntry.relations[].recordId` has to resolve to an existing record and
 * that record has to lie in the evidence set of the same actor. Fail either
 * condition and the chip points nowhere, or at a document the list beside it
 * does not carry.
 *
 * Run: node --test tests/frontend/netzwerk-evidence.test.mjs
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
  test('neutrale Angaben erzeugen keine Personenbeziehungen', () => {
    assert.equal(personsWithRelations().length, 0);
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
    // The creator of the fonds is exempt: she is the subject of nearly every
    // relation and appears as the object only where a third person carries the
    // relation to her. In such a record she does not stand as a participant, so
    // her evidence set does not carry it. For every other person the overlap is
    // the condition for chip and record list to speak of the same document.
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
    assert.equal(entry.relations, undefined);
    assert.ok(entry.records.size > 0);
  });
});
