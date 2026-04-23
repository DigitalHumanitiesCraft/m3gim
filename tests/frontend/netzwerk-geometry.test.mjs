/**
 * Unit-Tests fuer docs/js/views/_netzwerk-geometry.js (E-93, Session 47).
 *
 * Lauf:
 *   node --test tests/frontend/netzwerk-geometry.test.mjs
 *
 * Ziel: Pure Functions des Netzwerk-Tabs (Ring-Klassifikation, Kategorie-
 * Ableitung, Layout, Ko-Okkurrenz, Label-Geometrie, Malaniuk-Erkennung,
 * Komponisten-Filter) gegen ihre Invarianten schuetzen. Der JS-Teil des
 * Projekts hat sonst keine Unit-Test-Infrastruktur; dieses File verlaesst
 * sich ausschliesslich auf Node 18+ Built-in `node:test` + `node:assert/strict`
 * und die `"type":"module"`-Markierung in `docs/js/package.json`.
 *
 * Bewusst KEIN Browser, kein DOM, kein D3: die getestete Modul-Ebene ist
 * per Design dom-frei (frontend.md § Netzwerk, E-93).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyRing,
  nodeEvidence,
  nodeColor,
  isMalaniuk,
  isPureComposer,
  derivePersonKategorie,
  computeLayout,
  computeCoOccurrence,
  labelGeometry,
  NETZWERK_KATEGORIEN,
  RING_THRESHOLDS,
} from '../../docs/js/views/_netzwerk-geometry.js';

// ---------------------------------------------------------------------------
// Mini-Faktory fuer Person-Entries (spiegelt die im Loader gebaute Shape).
// ---------------------------------------------------------------------------

function person({
  records = [],
  relations = [],
  wikidata = null,
  roles = [],
  kategorie = 'Andere',
} = {}) {
  return {
    records: new Set(records),
    relations,
    wikidata,
    roles: new Set(roles),
    kategorie,
  };
}

// ---------------------------------------------------------------------------
// classifyRing — Ring-Klassifikation nach Evidenzstaerke
// ---------------------------------------------------------------------------

test('classifyRing: AgRelOn-Partner landet in Ring 1 (harte Beziehung)', () => {
  const e = person({ records: ['r1'], relations: [{ type: 'agrelon:HasColleague' }] });
  assert.equal(classifyRing(e), 1);
});

test('classifyRing: Wikidata + >=5 Records → Ring 1', () => {
  const e = person({
    records: ['a', 'b', 'c', 'd', 'e'],
    wikidata: 'wd:Q42',
  });
  assert.equal(classifyRing(e), 1);
});

test('classifyRing: Wikidata + 4 Records (unter Schwelle) → Ring 2', () => {
  const e = person({ records: ['a', 'b', 'c', 'd'], wikidata: 'wd:Q42' });
  assert.equal(classifyRing(e), 2);
});

test('classifyRing: >=2 Records ohne Wikidata → Ring 2 (Umfeld)', () => {
  const e = person({ records: ['a', 'b'] });
  assert.equal(classifyRing(e), 2);
});

test('classifyRing: 1 Record, kategorie "Andere" → Ring 3 (wird von computeLayout gefiltert)', () => {
  const e = person({ records: ['a'], kategorie: 'Andere' });
  assert.equal(classifyRing(e), 3);
});

test('classifyRing: 1 Record, aber explizit kategorisiert (Dirigent) → Ring 2', () => {
  const e = person({ records: ['a'], kategorie: 'Dirigent' });
  assert.equal(classifyRing(e), 2);
});

test('classifyRing: Schwellwerte sind exportiert und symmetrisch zur Klassifikation', () => {
  assert.equal(RING_THRESHOLDS.HARD_MIN_RECORDS_WITH_QID, 5);
  assert.equal(RING_THRESHOLDS.MID_MIN_RECORDS, 2);
});

// ---------------------------------------------------------------------------
// isMalaniuk — Zentrum-Erkennung
// ---------------------------------------------------------------------------

test('isMalaniuk: erkennt ueber Q-ID (Q94208)', () => {
  assert.equal(isMalaniuk('irgendwas', { wikidata: 'wd:Q94208' }), true);
});

test('isMalaniuk: Name-Regex als Fallback', () => {
  assert.equal(isMalaniuk('Malaniuk, Ira', {}), true);
  assert.equal(isMalaniuk('malaniuk', {}), true);
});

test('isMalaniuk: andere Person mit anderer Q-ID → false', () => {
  assert.equal(isMalaniuk('Wagner, Wieland', { wikidata: 'wd:Q76123' }), false);
});

// ---------------------------------------------------------------------------
// isPureComposer — reine Werk-Komponisten filtern
// ---------------------------------------------------------------------------

test('isPureComposer: Wagner, Richard (kategorie Komponist) → true', () => {
  assert.equal(isPureComposer('Wagner, Richard', { kategorie: 'Komponist' }), true);
});

test('isPureComposer: Wagner, Wieland (kategorie Regisseur) → false', () => {
  // Wieland Wagner war Regisseur, nicht Komponist — bleibt im Personen-Netzwerk.
  assert.equal(isPureComposer('Wagner, Wieland', { kategorie: 'Regisseur' }), false);
});

test('isPureComposer: Name ohne Komponisten-Nachnamen → false', () => {
  assert.equal(isPureComposer('Meier, Anna', { kategorie: 'Andere' }), false);
});

test('isPureComposer: Malaniuk wird nicht als Komponistin markiert', () => {
  assert.equal(isPureComposer('Malaniuk, Ira', { kategorie: 'Andere' }), false);
});

// ---------------------------------------------------------------------------
// derivePersonKategorie — rollenbasierte Kategorie mit Prioritaet
// ---------------------------------------------------------------------------

test('derivePersonKategorie: Prioritaet Produktion > Buehne (Dirigent + Saenger → Produktion)', () => {
  const e = person({ roles: ['dirigent', 'sänger'] });
  assert.equal(derivePersonKategorie(e), 'Produktion');
});

test('derivePersonKategorie: Adressat → Korrespondenz', () => {
  const e = person({ roles: ['adressat'] });
  assert.equal(derivePersonKategorie(e), 'Korrespondenz');
});

test('derivePersonKategorie: Verfasser → Presse', () => {
  const e = person({ roles: ['verfasser'] });
  assert.equal(derivePersonKategorie(e), 'Presse');
});

test('derivePersonKategorie: nur "erwähnt" → Erwähnt (nicht Andere)', () => {
  const e = person({ roles: ['erwähnt'] });
  assert.equal(derivePersonKategorie(e), 'Erwähnt');
});

test('derivePersonKategorie: leere Rollen → Andere', () => {
  const e = person();
  assert.equal(derivePersonKategorie(e), 'Andere');
});

test('derivePersonKategorie: gender-neutrale Form "sängerin" → Buehne', () => {
  const e = person({ roles: ['sängerin'] });
  assert.equal(derivePersonKategorie(e), 'Bühne');
});

test('derivePersonKategorie: unbekannte Rolle → Andere (kein stilles Fehlverhalten)', () => {
  const e = person({ roles: ['allerleirauh'] });
  assert.equal(derivePersonKategorie(e), 'Andere');
});

test('derivePersonKategorie: alle NETZWERK_KATEGORIEN-Keys haben eine Farbe', () => {
  for (const key of Object.keys(NETZWERK_KATEGORIEN)) {
    const col = NETZWERK_KATEGORIEN[key];
    assert.ok(typeof col === 'string' && col.length > 0, `Kategorie ${key} hat keine Farbe`);
  }
});

// ---------------------------------------------------------------------------
// nodeEvidence + nodeColor
// ---------------------------------------------------------------------------

test('nodeEvidence: AgRelOn-Relation → strong', () => {
  const e = person({ relations: [{ type: 'agrelon:HasColleague' }] });
  assert.equal(nodeEvidence(e), 'strong');
});

test('nodeEvidence: keine Relation → weak', () => {
  assert.equal(nodeEvidence(person()), 'weak');
});

test('nodeColor: ist ein NETZWERK_KATEGORIEN-Wert', () => {
  const e = person({ roles: ['dirigent'] });
  const col = nodeColor(e);
  assert.ok(Object.values(NETZWERK_KATEGORIEN).includes(col));
});

// ---------------------------------------------------------------------------
// computeLayout
// ---------------------------------------------------------------------------

test('computeLayout: Malaniuk landet ins Zentrum, Rest auf Ringen', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ records: ['r1'], wikidata: 'wd:Q94208' })],
    [
      'Karajan, Herbert',
      person({
        records: ['r1', 'r2', 'r3', 'r4', 'r5'],
        wikidata: 'wd:Q7326',
      }),
    ],
    ['Meier, Anna', person({ records: ['r1', 'r2'] })],
  ]);
  const layout = computeLayout(persons.entries(), {
    cx: 500, cy: 400, radii: [100, 200],
  });
  assert.equal(layout.center.name, 'Malaniuk, Ira');
  assert.equal(layout.nodes.length, 2);
  assert.equal(layout.ringCounts[1] + layout.ringCounts[2], 2);
});

test('computeLayout: reine Werk-Komponisten werden ausgefiltert', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ wikidata: 'wd:Q94208' })],
    ['Wagner, Richard', person({ records: ['r1', 'r2'], kategorie: 'Komponist' })],
    ['Meier, Anna', person({ records: ['r1', 'r2'] })],
  ]);
  const layout = computeLayout(persons.entries(), {
    cx: 500, cy: 400, radii: [100, 200],
  });
  assert.equal(layout.nodes.length, 1);
  assert.equal(layout.nodes[0].name, 'Meier, Anna');
});

test('computeLayout: Ring 3 (einmalige Nennungen ohne Kategorie) wird weggeworfen', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ wikidata: 'wd:Q94208' })],
    ['Einmalig, Hans', person({ records: ['r1'], kategorie: 'Andere' })],
    ['Zweimal, Eva', person({ records: ['r1', 'r2'] })],
  ]);
  const layout = computeLayout(persons.entries(), {
    cx: 500, cy: 400, radii: [100, 200],
  });
  assert.equal(layout.nodes.length, 1);
  assert.equal(layout.nodes[0].name, 'Zweimal, Eva');
});

test('computeLayout: Determinismus — zwei Laeufe liefern identische Positionen', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ wikidata: 'wd:Q94208' })],
    ['C, X', person({ records: ['r1', 'r2'] })],
    ['A, Y', person({ records: ['r1', 'r2'] })],
    ['B, Z', person({ records: ['r1', 'r2'] })],
  ]);
  const l1 = computeLayout(persons.entries(), {
    cx: 500, cy: 400, radii: [100, 200],
  });
  const l2 = computeLayout(persons.entries(), {
    cx: 500, cy: 400, radii: [100, 200],
  });
  const coords1 = l1.nodes.map(n => [n.name, n.x, n.y]);
  const coords2 = l2.nodes.map(n => [n.name, n.x, n.y]);
  assert.deepEqual(coords1, coords2);
});

test('computeLayout: alphabetische Winkel-Reihenfolge pro Ring', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ wikidata: 'wd:Q94208' })],
    ['C, X', person({ records: ['r1', 'r2'] })],
    ['A, Y', person({ records: ['r1', 'r2'] })],
    ['B, Z', person({ records: ['r1', 'r2'] })],
  ]);
  const layout = computeLayout(persons.entries(), {
    cx: 0, cy: 0, radii: [100, 200],
  });
  const names = layout.nodes.map(n => n.name);
  assert.deepEqual(names, ['A, Y', 'B, Z', 'C, X']);
});

test('computeLayout: Umlaut-Normalisierung im SortKey (ü→u, ä→a, ö→o)', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ wikidata: 'wd:Q94208' })],
    ['Zweibach, A', person({ records: ['r1', 'r2'] })],
    ['Ärmel, B', person({ records: ['r1', 'r2'] })],
    ['Übel, C', person({ records: ['r1', 'r2'] })],
  ]);
  const layout = computeLayout(persons.entries(), {
    cx: 0, cy: 0, radii: [100, 200],
  });
  const names = layout.nodes.map(n => n.name);
  // aermel < uebel < zweibach
  assert.deepEqual(names, ['Ärmel, B', 'Übel, C', 'Zweibach, A']);
});

test('computeLayout: Knoten-Radius skaliert mit Record-Count, gedeckelt bei 28', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ wikidata: 'wd:Q94208' })],
    [
      'Fleißig, P',
      person({ records: Array.from({ length: 100 }, (_, i) => `r${i}`) }),
    ],
  ]);
  const layout = computeLayout(persons.entries(), {
    cx: 0, cy: 0, radii: [100, 200],
  });
  assert.equal(layout.nodes.length, 1);
  assert.ok(layout.nodes[0].r <= 28, `r=${layout.nodes[0].r} > 28 cap`);
  assert.ok(layout.nodes[0].r >= 6, `r=${layout.nodes[0].r} < min 6`);
});

// ---------------------------------------------------------------------------
// computeCoOccurrence
// ---------------------------------------------------------------------------

test('computeCoOccurrence: Paare in gemeinsamen Records, korrekte Shared-Zahlen', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ records: ['r1'], wikidata: 'wd:Q94208' })],
    ['A', person({ records: ['r1', 'r2', 'r3'] })],
    ['B', person({ records: ['r1', 'r2'] })],
    ['C', person({ records: ['r3'] })],
  ]);
  const pairs = computeCoOccurrence(persons.entries(), { minShared: 1, maxEdges: 10 });
  const ab = pairs.find(p => p.a === 'A' && p.b === 'B');
  const ac = pairs.find(p => p.a === 'A' && p.b === 'C');
  assert.ok(ab, 'A-B Paar muss existieren');
  assert.equal(ab.shared, 2);
  assert.ok(ac, 'A-C Paar muss existieren');
  assert.equal(ac.shared, 1);
});

test('computeCoOccurrence: Malaniuk ist KEIN Endpunkt (wird ausgefiltert)', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ records: ['r1', 'r2'], wikidata: 'wd:Q94208' })],
    ['A', person({ records: ['r1', 'r2'] })],
    ['B', person({ records: ['r1'] })],
  ]);
  const pairs = computeCoOccurrence(persons.entries(), { minShared: 1, maxEdges: 10 });
  for (const p of pairs) {
    assert.notEqual(p.a, 'Malaniuk, Ira');
    assert.notEqual(p.b, 'Malaniuk, Ira');
  }
});

test('computeCoOccurrence: reine Komponisten werden ausgefiltert', () => {
  const persons = new Map([
    ['Wagner, Richard', person({ records: ['r1'], kategorie: 'Komponist' })],
    ['A', person({ records: ['r1'] })],
  ]);
  const pairs = computeCoOccurrence(persons.entries(), { minShared: 1, maxEdges: 10 });
  assert.equal(pairs.length, 0);
});

test('computeCoOccurrence: minShared-Threshold kappt Paare unter Schwelle', () => {
  const persons = new Map([
    ['A', person({ records: ['r1'] })],
    ['B', person({ records: ['r1'] })],
  ]);
  const pairs = computeCoOccurrence(persons.entries(), { minShared: 2, maxEdges: 10 });
  assert.equal(pairs.length, 0);
});

test('computeCoOccurrence: maxEdges kappt globale Paarzahl', () => {
  const persons = new Map();
  for (let i = 0; i < 10; i++) persons.set(`P${i}`, person({ records: ['r1'] }));
  const pairs = computeCoOccurrence(persons.entries(), { minShared: 1, maxEdges: 5 });
  assert.equal(pairs.length, 5);
});

test('computeCoOccurrence: Determinismus (stabile Reihenfolge bei Ties)', () => {
  const persons = new Map([
    ['A', person({ records: ['r1', 'r2'] })],
    ['B', person({ records: ['r1', 'r2'] })],
    ['C', person({ records: ['r1'] })],
  ]);
  const p1 = computeCoOccurrence(persons.entries(), { minShared: 1, maxEdges: 10 });
  const p2 = computeCoOccurrence(persons.entries(), { minShared: 1, maxEdges: 10 });
  assert.deepEqual(p1, p2);
});

test('computeCoOccurrence: Sortierung primaer nach shared desc, sekundaer alphabetisch', () => {
  const persons = new Map([
    ['A', person({ records: ['r1', 'r2'] })],
    ['B', person({ records: ['r1', 'r2'] })],
    ['C', person({ records: ['r1'] })],
    ['D', person({ records: ['r1'] })],
  ]);
  const pairs = computeCoOccurrence(persons.entries(), { minShared: 1, maxEdges: 10 });
  // A-B hat shared=2 und muss vor C-D (shared=1) kommen.
  assert.equal(pairs[0].a, 'A');
  assert.equal(pairs[0].b, 'B');
  assert.equal(pairs[0].shared, 2);
});

// ---------------------------------------------------------------------------
// labelGeometry
// ---------------------------------------------------------------------------

test('labelGeometry: rechte Halbebene (angle < π) → anchor start, positives dx', () => {
  const g = labelGeometry(Math.PI / 2, 10);
  assert.equal(g.anchor, 'start');
  assert.ok(g.dx > 0);
});

test('labelGeometry: linke Halbebene (angle > π) → anchor end, negatives dx', () => {
  const g = labelGeometry(Math.PI * 1.5, 10);
  assert.equal(g.anchor, 'end');
  assert.ok(g.dx < 0);
});

test('labelGeometry: gap-Parameter wirkt additiv auf dx-Betrag', () => {
  const gSmall = labelGeometry(Math.PI / 2, 10, 2);
  const gBig = labelGeometry(Math.PI / 2, 10, 10);
  assert.ok(Math.abs(gBig.dx) > Math.abs(gSmall.dx));
});
