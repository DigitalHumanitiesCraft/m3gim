/**
 * Unit-Tests fuer docs/js/views/_netzwerk-geometry.js, das reine Modul des
 * Netzwerks (F2).
 *
 * Der Kern ist die Vollstaendigkeit: das Zwei-Modus-Netz behauptet, eins zu
 * eins mit der Verknuepfungstabelle zu stehen. Faellt ein Akteur heraus oder
 * fehlt eine Nennung, ist die Aussage der Ansicht falsch, ohne dass es im Bild
 * auffiele. Der Test rechnet die Erwartung deshalb unabhaengig aus dem
 * ausgelieferten Datensatz nach.
 *
 * Lauf:
 *   node --test tests/frontend/netzwerk-geometry.test.mjs
 *
 * Bewusst kein Browser, kein DOM, kein D3: die getestete Modulebene ist per
 * Design dom-frei. Den Dokumentschnitt loest das Modul nicht selbst, es nimmt
 * die fertige Menge aus `recordsFor` als `opts.records` entgegen.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTwoMode,
  buildProjection,
  layoutGraph,
  graphToGEXF,
  neighboursOf,
  neighboursOfActor,
  nodeRadius,
  nodeId,
  recordLabel,
  isMalaniuk,
  FONDS_CREATOR_VARIANTS,
  NODE_TYPE_META,
} from '../../docs/js/views/_netzwerk-geometry.js';
import { recordsFor, baseIds } from '../../docs/js/data/records-for.js';
import { storeFromShipped } from './_shipped.mjs';

const store = await storeFromShipped();
const allIds = recordsFor(store, {}, { base: baseIds(store) }).ids;
const twoMode = buildTwoMode(store, { records: allIds });
const projection = buildProjection(store, { records: allIds });

const HERMINGHAUS = 'Herminghaus, A. E.';
const NIM_023_5 = 'm3gim-data:NIM_023_5';

/** Actors of a record, computed straight from the store indexes and not from
 *  the module under test. */
function actorsOfRecord(id) {
  const out = new Set();
  for (const [name, entry] of store.persons) {
    if (isMalaniuk(name, entry)) continue;
    if (entry.records.has(id)) out.add(nodeId('person', name));
  }
  for (const [name, entry] of store.organizations) {
    if (entry.records.has(id)) out.add(nodeId('institution', name));
  }
  return out;
}

describe('Vollstaendigkeit des Zwei-Modus-Netzes', () => {
  test('jeder Akteur eines verknuepften Dokuments ist ein Knoten', () => {
    const expected = new Set();
    for (const id of allIds) for (const actorId of actorsOfRecord(id)) expected.add(actorId);
    const actual = new Set(twoMode.nodes.filter(n => n.kind === 'actor').map(n => n.id));
    assert.deepEqual([...actual].sort(), [...expected].sort());
    assert.ok(expected.size > 400, 'die Erwartung ist verdaechtig klein');
  });

  test('jedes verknuepfte Dokument ist ein Knoten', () => {
    const recordNodes = twoMode.nodes.filter(n => n.kind === 'record');
    assert.equal(recordNodes.length, allIds.size);
    assert.deepEqual(recordNodes.map(n => n.recordId).sort(), [...allIds].sort());
  });

  test('jede Nennung ist eine Kante, und je Dokument so viele wie Akteure', () => {
    let total = 0;
    for (const id of allIds) {
      const expected = actorsOfRecord(id);
      const edges = twoMode.edges.filter(e => e.recordId === id);
      assert.equal(edges.length, expected.size,
        `Kantenzahl weicht von der Akteurszahl ab an ${id}`);
      assert.deepEqual(edges.map(e => e.a).sort(), [...expected].sort());
      total += expected.size;
    }
    assert.equal(twoMode.edges.length, total);
    assert.equal(twoMode.stats.edges, total);
  });

  test('Herminghaus an UAKUG/NIM_023 5 steht ungefiltert im Netz', () => {
    const record = store.records.get(NIM_023_5);
    assert.ok(record, 'der Beleg UAKUG/NIM_023 5 fehlt im Datensatz');
    assert.equal(allIds.has(NIM_023_5), true, 'der Beleg liegt nicht in der Dokumentbasis');
    const id = nodeId('person', HERMINGHAUS);
    const node = twoMode.byId.get(id);
    assert.ok(node, 'Herminghaus fehlt im ungefilterten Netz');
    assert.equal(node.records.has(NIM_023_5), true);
    assert.ok(node.roles.length > 0, 'der Knoten traegt keine Rolle');
    assert.ok(twoMode.edges.some(e => e.a === id && e.recordId === NIM_023_5),
      'die Nennung von Herminghaus an diesem Dokument traegt keine Kante');
    assert.ok(projection.byId.has(id), 'in der Personenprojektion fehlt er');
  });

  test('die Nachlassbildnerin ist kein Knoten, auch nicht in ihren Schreibvarianten', () => {
    for (const graph of [twoMode, projection]) {
      assert.equal(graph.nodes.some(n => n.kind === 'actor' && FONDS_CREATOR_VARIANTS.has(n.name)),
        false, 'eine Schreibvariante der Nachlassbildnerin steht als Knoten');
    }
    const inIndex = [...store.persons.keys()].filter(name => FONDS_CREATOR_VARIANTS.has(name));
    assert.ok(inIndex.length > 1,
      'der Personenindex fuehrt nur eine Schreibung — die Ausschlussliste waere trivial');
  });

  test('Rollen kommen als Vokabularlabel, nicht als blosse Kennung', () => {
    for (const node of twoMode.nodes.filter(n => n.kind === 'actor').slice(0, 80)) {
      for (const { role } of node.roles) {
        assert.equal(role.startsWith('m3gim-vocab:'), false,
          `Rolle als Kennung statt Label: ${role}`);
      }
    }
    for (const edge of twoMode.edges.slice(0, 200)) {
      for (const role of edge.roles) assert.equal(role.startsWith('m3gim-vocab:'), false);
    }
  });

  test('Knotenarten sind Akteur und Dokument, ohne Kappung', () => {
    const types = new Set(twoMode.nodes.map(n => n.type));
    assert.deepEqual([...types].sort(), ['institution', 'person', 'record']);
    for (const type of types) assert.ok(NODE_TYPE_META[type]);
    assert.equal(twoMode.stats.nodes, twoMode.nodes.length);
    assert.equal(twoMode.stats.actors + twoMode.stats.recordNodes, twoMode.nodes.length);
  });
});

describe('Personenprojektion', () => {
  test('sie traegt genau die Akteure des Zwei-Modus-Netzes', () => {
    const actors = twoMode.nodes.filter(n => n.kind === 'actor').map(n => n.id).sort();
    assert.deepEqual(projection.nodes.map(n => n.id).sort(), actors);
  });

  test('eine Kante zaehlt die gemeinsamen Dokumente ihrer beiden Knoten', () => {
    const edge = projection.edges[0];
    const a = projection.byId.get(edge.a);
    const b = projection.byId.get(edge.b);
    let shared = 0;
    for (const id of a.records) if (b.records.has(id)) shared++;
    assert.equal(edge.weight, shared);
    assert.equal(edge.records.length, shared);
    for (const id of edge.records) {
      assert.equal(a.records.has(id) && b.records.has(id), true);
    }
  });

  test('Rollen haengen an der Kante, je Seite aus den gemeinsamen Dokumenten', () => {
    const edge = projection.edges.find(e => e.rolesA.length > 0 && e.rolesB.length > 0);
    assert.ok(edge, 'keine einzige Kante traegt Rollen');
    const a = projection.byId.get(edge.a);
    for (const role of edge.rolesA) {
      assert.ok(a.roles.some(r => r.role === role),
        `Kantenrolle ${role} steht nicht an ihrem Knoten`);
    }
  });

  test('Nachbarn kommen mit ihrer Staerke, absteigend', () => {
    const hub = [...projection.nodes].sort((a, b) => b.degree - a.degree)[0];
    const neighbours = neighboursOf(projection, hub.id);
    assert.equal(neighbours.length, hub.degree);
    for (let i = 1; i < neighbours.length; i++) {
      assert.ok(neighbours[i - 1].weight >= neighbours[i].weight);
    }
  });

  test('Zwei-Modus-Nachbarn entsprechen der vollstaendigen Projektion', () => {
    const cutIds = new Set([...allIds].filter(id => id.includes('NIM_004')));
    const pairs = [
      [twoMode, projection],
      [buildTwoMode(store, { records: cutIds }), buildProjection(store, { records: cutIds })],
    ];
    for (const [source, projected] of pairs) {
      for (const node of projected.nodes) {
        const expected = neighboursOf(projected, node.id)
          .map(n => [n.node.id, n.weight]);
        const actual = neighboursOfActor(source, node.id)
          .map(n => [n.node.id, n.weight]);
        assert.deepEqual(actual, expected, node.id);
      }
    }
  });

  test('erfasste Beziehungen stehen als Marke am Knoten, nicht als Kante', () => {
    const marked = projection.nodes.filter(n => n.hasRelation);
    assert.ok(marked.length > 0, 'keine einzige erfasste Beziehung erreicht das Netz');
    assert.equal(projection.stats.withRelation, marked.length);
    for (const node of marked) assert.ok(node.relations.length > 0);
  });

});

/** Flaeche, die zwei Kreise im Mittelpunktsabstand d teilen. */
function lensArea(d, r1, r2) {
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a1 = Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const a2 = Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  return r1 * r1 * (a1 - Math.sin(2 * a1) / 2) + r2 * r2 * (a2 - Math.sin(2 * a2) / 2);
}

describe('Layout', () => {
  const layout = layoutGraph(twoMode, { width: 1200, height: 820 });
  const projLayout = layoutGraph(projection, { width: 1200, height: 820 });

  test('das Layout traegt jeden Knoten und jede Kante', () => {
    assert.equal(layout.nodes.length, twoMode.nodes.length);
    assert.equal(layout.edges.length, twoMode.edges.length);
    assert.ok(layout.nodes.length > 500, 'der Datensatz ist verdaechtig klein');
    for (const node of layout.nodes) {
      assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y));
      assert.ok(node.x >= 0 && node.x <= 1200 && node.y >= 0 && node.y <= 820,
        `${node.name} liegt ausserhalb der Zeichenflaeche`);
      assert.equal(node.r, nodeRadius(node.weight));
    }
  });

  test('gleiche Daten, gleiches Bild — eine Auswahl bewegt nichts', () => {
    for (const [graph, done] of [[twoMode, layout], [projection, projLayout]]) {
      const again = layoutGraph(graph, { width: 1200, height: 820 });
      assert.deepEqual(again.nodes.map(n => [n.id, n.x, n.y]),
        done.nodes.map(n => [n.id, n.x, n.y]));
      assert.ok(again.nodes.length > 500, 'der Datensatz ist verdaechtig klein');
    }
  });

  test('das Layout laeuft zur Ruhe und meldet, wobei es aufgehoert hat', () => {
    // Der Lauf endet an der Ruhe oder an der Obergrenze, je nachdem was zuerst
    // kommt, und sagt selbst welches von beidem. Ein Layout, das erst die
    // Obergrenze anhaelt, waere beim Zeichnen noch in Bewegung.
    for (const done of [layout, projLayout]) {
      assert.equal(done.rest, true, 'der Lauf hat die Ruhe nicht erreicht');
      assert.ok(done.steps > 20 && done.steps < 150,
        `zur Ruhe nach ${done.steps} Schritten, das ist keine Rechnung`);
    }
    // Eine hoehere Obergrenze aendert nichts, weil nicht sie den Lauf beendet.
    const longer = layoutGraph(twoMode, { width: 1200, height: 820, iterations: 400 });
    assert.equal(longer.steps, layout.steps);
    assert.deepEqual(longer.nodes.map(n => [n.id, n.x, n.y]),
      layout.nodes.map(n => [n.id, n.x, n.y]));
    // Und eine Obergrenze unterhalb der Ruhe haelt den Lauf an und sagt es.
    const short = layoutGraph(twoMode, { width: 1200, height: 820, iterations: 12 });
    assert.equal(short.steps, 12);
    assert.equal(short.rest, false);
  });

  test('kaum ein Knoten liegt unter einem anderen', () => {
    // E-274 haelt die gemessenen Zahlen fest: 164 sich beruehrende Paare im
    // Zwei-Modus-Netz, 81 in der Projektion. Der Test steht hier, weil die
    // Lesbarkeit des Bildes daran haengt und eine Aenderung an Radius, Fit oder
    // Trennungspaessen sie still verschlechtern kann.
    for (const [done, registered] of [[layout, 164], [projLayout, 81]]) {
      const n = done.nodes;
      let pairs = 0;
      let covered = 0;
      let total = 0;
      for (const node of n) total += Math.PI * node.r * node.r;
      for (let i = 0; i < n.length; i++) {
        for (let j = i + 1; j < n.length; j++) {
          const d = Math.hypot(n[i].x - n[j].x, n[i].y - n[j].y);
          if (d >= n[i].r + n[j].r) continue;
          pairs++;
          covered += lensArea(d, n[i].r, n[j].r);
        }
      }
      assert.ok(Math.abs(pairs - registered) <= registered * 0.25,
        `${pairs} sich ueberdeckende Paare statt der eingetragenen ${registered}`);
      assert.ok(covered / total < 0.05,
        `${(covered / total * 100).toFixed(1)} % der Knotenflaeche liegt unter einem anderen Knoten`);
    }
  });

  test('kein Knoten faellt aus den Radiusschranken', () => {
    // Die Projektleitung hat zu grosse Knoten beanstandet: der gezeichnete
    // Radius kommt aus nodeRadius und aus nichts sonst, und der bleibt zwischen
    // drei und sechzehn Pixeln bei Zoomstufe eins.
    const radii = layout.nodes.map(n => n.r);
    assert.ok(Math.min(...radii) >= 3, 'ein Knoten faellt unter den Mindestradius');
    assert.ok(Math.max(...radii) <= 16, 'ein Knoten waechst ueber die Schranke');
  });

  test('das Bild fuellt die Flaeche, die es bekommt', () => {
    // Befund 6 der Projektleitung: das Bild nutzte ein Drittel der Breite nicht.
    for (const done of [layout, projLayout]) {
      const xs = done.nodes.map(n => n.x);
      const ys = done.nodes.map(n => n.y);
      const share = (Math.max(...xs) - Math.min(...xs))
        * (Math.max(...ys) - Math.min(...ys)) / (1200 * 820);
      assert.ok(share > 0.85, `nur ${(share * 100).toFixed(0)} % der Flaeche belegt`);
      assert.ok(done.nodes.length > 500, 'der Datensatz ist verdaechtig klein');
    }
  });
});

/** Der node-Block eines Knotens aus der Datei, ueber seine escapete Kennung. */
function gexfNode(xml, id) {
  const start = xml.indexOf(`<node id="${xmlAttr(id)}"`);
  return start === -1 ? '' : xml.slice(start, xml.indexOf('</node>', start));
}

/** Dieselbe Escape-Regel wie im Modul, sonst trifft die Suche Namen mit
 *  Ampersand oder Apostroph nicht. */
function xmlAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

describe('GEXF ist das gezeichnete Netz', () => {
  test('das Zwei-Modus-Netz: je Knoten ein node, je Nennung ein edge', () => {
    const xml = graphToGEXF(twoMode, '2026-09-05');
    assert.equal((xml.match(/<node id=/g) || []).length, twoMode.nodes.length);
    assert.equal((xml.match(/<edge id=/g) || []).length, twoMode.edges.length);
    assert.match(xml, /defaultedgetype="undirected"/);
  });

  test('die Personenprojektion: das Kantengewicht ist die Zahl der Dokumente', () => {
    const xml = graphToGEXF(projection, '2026-09-05');
    assert.equal((xml.match(/<edge id=/g) || []).length, projection.edges.length);
    assert.match(xml, new RegExp(`weight="${projection.edges[0].weight}"`));
  });

  test('erfasste Beziehungen stehen als Knotenattribut in der Datei', () => {
    const xml = graphToGEXF(projection, '2026-09-05');
    const marked = projection.nodes.filter(n => n.hasRelation);
    assert.ok(marked.length > 10, 'zu wenige erfasste Beziehungen fuer die Aussage');
    assert.match(xml, /<attribute id="relations"/);
    assert.match(xml, /<attribute id="relationRecords"/);
    let written = 0;
    for (const node of marked) {
      const block = gexfNode(xml, node.id);
      assert.ok(block, `${node.name} fehlt in der Datei`);
      const kinds = node.relations.map(r => r.label).join(', ');
      const records = node.relations.map(r => r.signatur).join(', ');
      assert.ok(block.includes(`for="relations" value="${xmlAttr(kinds)}"`),
        `${node.name} traegt die Beziehungsart nicht`);
      assert.ok(block.includes(`for="relationRecords" value="${xmlAttr(records)}"`),
        `${node.name} traegt den Beleg der Beziehung nicht`);
      written += 1;
    }
    assert.equal(written, marked.length);
  });

  test('die Nachlassbildnerin steht auch in der Datei nicht', () => {
    const xml = graphToGEXF(projection, '2026-09-05');
    // Namensgleiche Dritte bleiben: der Personenindex fuehrt einen Verwandten
    // und einen Platzhalter fuer den Ehemann, beide sind eigene Akteure.
    for (const variant of FONDS_CREATOR_VARIANTS) {
      assert.equal(xml.includes(`label="${variant}"`), false, variant);
    }
    assert.equal(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(xml), false,
      'ein Steuerzeichen aus dem Paar-Key ist in die Datei durchgeschlagen');
  });
});

/*
 * Beschriftung und Kantenklasse. Beides ist Aussage, nicht Dekoration: die
 * Signatur eines Dokuments sagt nichts ueber seinen Inhalt, und die Rolle haengt
 * an der Nennung, nicht am Akteur. Faellt eines davon still aus, zeigt das Bild
 * weiter etwas, nur nicht mehr das, was es behauptet.
 */
describe('Beschriftung der Dokumentknoten', () => {
  const records = twoMode.nodes.filter(n => n.kind === 'record');

  test('ein Dokumentknoten heisst Dokumenttyp und Jahr, nicht Signatur', () => {
    const named = records.filter(n => n.typeLabel && n.year != null);
    assert.ok(named.length > 100, `nur ${named.length} Dokumentknoten tragen beides`);
    for (const node of named) {
      assert.equal(node.label, `${node.typeLabel} ${node.year}`);
      assert.notEqual(node.label, node.name, 'die Beschriftung ist wieder die Signatur');
    }
  });

  test('was fehlt, faellt weg, und die Signatur bleibt der letzte Ausweg', () => {
    for (const node of records) {
      assert.ok(node.label, `${node.name} traegt keine Beschriftung`);
      if (!node.typeLabel && node.year == null) assert.equal(node.label, node.name);
      else if (!node.typeLabel) assert.equal(node.label, String(node.year));
      else if (node.year == null) assert.equal(node.label, node.typeLabel);
    }
    // Ohne Typ und ohne Jahr bleibt die Signatur; im Datenstand tritt der Fall
    // nicht auf, die Regel muss ihn trotzdem tragen.
    assert.equal(recordLabel(store, { 'rico:identifier': 'UAKUG/NIM_999 1' }, null),
      'NIM_999 1');
  });

  test('ein Akteur behaelt seinen Namen als Beschriftung', () => {
    for (const node of twoMode.nodes.filter(n => n.kind === 'actor').slice(0, 100)) {
      assert.equal(node.label, node.name);
    }
  });
});

describe('Kantenklassen', () => {
  /** Blosse Nennung: keine Rolle oder nur „erwähnt". */
  const bareByRoles = (roles) => roles.length === 0
    || roles.every(r => r.toLowerCase() === 'erwähnt' || r.toLowerCase() === 'erwaehnt');

  test('jede Nennung sagt, ob sie eine Rolle traegt', () => {
    let bare = 0;
    for (const edge of twoMode.edges) {
      assert.equal(typeof edge.bare, 'boolean', 'eine Kante ohne Klasse');
      assert.equal(edge.bare, bareByRoles(edge.roles),
        `Klasse und Rollen widersprechen sich an ${edge.id}`);
      if (edge.bare) bare++;
    }
    assert.ok(bare > 50 && bare < twoMode.edges.length - 50,
      `beide Klassen muessen vorkommen, blosse Nennungen: ${bare}`);
  });

  test('in der Projektion entscheiden die Rollen beider Seiten', () => {
    let bare = 0;
    for (const edge of projection.edges) {
      assert.equal(edge.bare, bareByRoles([...edge.rolesA, ...edge.rolesB]),
        `Klasse und Rollen widersprechen sich an ${edge.id}`);
      if (edge.bare) bare++;
    }
    assert.ok(bare > 50 && bare < projection.edges.length - 50,
      `beide Klassen muessen vorkommen, blosse Nennungen: ${bare}`);
  });
});
