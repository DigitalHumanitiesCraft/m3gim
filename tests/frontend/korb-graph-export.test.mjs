/**
 * Die beiden maschinenlesbaren Ausfuhren des Korbs, JSON-LD und GEXF, auf dem
 * ausgelieferten Datenstand.
 *
 * Die stillen Defekte, gegen die diese Datei steht:
 *
 *   * Das JSON-LD-Dokument fuehrt einen eigenen, mitgeschriebenen @context, der
 *     vom Datensatz abdriftet, statt des @context, den der Store aus der
 *     geladenen Datei mitfuehrt, oder es nennt Annotationen und Auffuehrungen
 *     nur per @id, ohne den Knoten mitzugeben, auf den die Referenz zeigt.
 *   * Der Abschluss ueber die Referenzen zieht ueber die Beleg-Rueckverweise der
 *     Annotationen fremde Records in die Auswahl.
 *   * Die GEXF-Attributwerte tragen `&` und `'` aus Instituts- und Werknamen
 *     unmaskiert und machen die Datei unlesbar, ohne dass die Anwendung etwas
 *     meldet.
 *
 * Lauf: node --test tests/frontend/korb-graph-export.test.mjs
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

import { buildJSONLD, buildGEXF } from '../../docs/js/views/korb.js';
import { storeFromShipped, shippedGraph } from './_shipped.mjs';

// Datensaetze des ausgelieferten Stands: der erste traegt Annotationen,
// Auffuehrungen und Buehnenrollen, der zweite ein `&` im Namen einer
// Koerperschaft, der dritte einen Apostroph im Werktitel.
const RICH_ID = 'm3gim-data:NIM_004_24';
const AMP_ID = 'm3gim-data:NIM_007_5_8';
const APOSTROPHE_ID = 'm3gim-data:NIM_007_8';

let store;
let doc;
before(async () => {
  store = await storeFromShipped();
  doc = shippedGraph();
});

describe('JSON-LD-Ausfuhr', () => {
  test('die Fixture-Datensaetze stehen im ausgelieferten Stand', () => {
    for (const id of [RICH_ID, AMP_ID, APOSTROPHE_ID]) {
      assert.ok(store.records.get(id), `${id} fehlt im Datensatz`);
    }
    assert.ok((store.recordToEvents.get(RICH_ID) || []).length > 0);
  });

  test('der @context ist der des Datensatzes, nicht eine eigene Kopie', () => {
    const out = buildJSONLD([RICH_ID], store);
    assert.deepEqual(out['@context'], doc['@context']);
    assert.equal(out['@context'], store['@context']);
  });

  test('die Records stehen unveraendert im Graphen', () => {
    const out = buildJSONLD([RICH_ID, AMP_ID], store);
    const records = out['@graph'].filter(n => n['@type'] === 'rico:Record');
    assert.equal(records.length, 2);
    assert.equal(records[0], store.records.get(RICH_ID));
    assert.deepEqual(records.map(r => r['@id']), [RICH_ID, AMP_ID]);
  });

  test('jede @id-Referenz im Ergebnis ist entweder aufgeloest oder nicht Knoten des Datensatzes', () => {
    const out = buildJSONLD([RICH_ID], store);
    const present = new Set(out['@graph'].map(n => n['@id']));
    const inSource = new Map();
    for (const node of doc['@graph']) if (node['@id']) inSource.set(node['@id'], node);

    for (const node of out['@graph']) {
      for (const ref of collectIds(node)) {
        const target = inSource.get(ref);
        if (!target) continue;                            // wd:, Vokabular-Schema o.ae.
        const type = target['@type'];
        if (type === 'rico:Record' || type === 'rico:RecordSet') continue;
        assert.ok(present.has(ref), `${ref} referenziert, aber nicht mitgegeben`);
      }
    }
  });

  test('die Annotationen und Auffuehrungen des Records sind mitgegeben', () => {
    const out = buildJSONLD([RICH_ID], store);
    const types = new Set(out['@graph'].map(n => n['@type']));
    assert.ok(types.has('m3gim-ontology:Annotation'));
    assert.ok(types.has('m3gim-ontology:Annotation'));
  });

  test('kein fremder Record und kein Konvolut geraet in die Auswahl', () => {
    const out = buildJSONLD([RICH_ID], store);
    const foreign = out['@graph'].filter(n =>
      (n['@type'] === 'rico:Record' && n['@id'] !== RICH_ID) || n['@type'] === 'rico:RecordSet');
    assert.deepEqual(foreign, []);
  });

  test('unbekannte Korb-IDs fallen still heraus', () => {
    const out = buildJSONLD(['m3gim-data:gibt_es_nicht', RICH_ID], store);
    assert.equal(out['@graph'].filter(n => n['@type'] === 'rico:Record').length, 1);
  });
});

describe('GEXF-Ausfuhr', () => {
  test('der Rahmen entspricht GEXF 1.3', () => {
    const gexf = buildGEXF([RICH_ID], store, '2026-09-05');
    assert.match(gexf, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n/);
    assert.match(gexf, /<gexf xmlns="http:\/\/gexf\.net\/1\.3"[^>]* version="1\.3">/);
    assert.match(gexf, /<meta lastmodifieddate="2026-09-05">/);
    assert.match(gexf, /<graph defaultedgetype="undirected" mode="static">/);
    assert.match(gexf, /<attributes class="node">\n\s*<attribute id="family" title="family" type="string"\/>/);
    assert.match(gexf, /<attributes class="edge">\n\s*<attribute id="role" title="role" type="string"\/>/);
  });

  test('der Record steht als Knoten der Familie record', () => {
    const gexf = buildGEXF([RICH_ID], store, '2026-09-05');
    assert.match(gexf, /<node id="record:NIM_004 24" label="NIM_004 24">/);
    assert.match(gexf, /<attvalue for="family" value="record"\/>/);
  });

  test('die verknuepften Entitaeten tragen die Familienschluessel des Projekts', () => {
    const gexf = buildGEXF([RICH_ID, AMP_ID, APOSTROPHE_ID], store, '2026-09-05');
    const families = new Set([...gexf.matchAll(/<attvalue for="family" value="([^"]+)"\/>/g)].map(m => m[1]));
    for (const key of ['record', 'person', 'institution', 'ort', 'werk']) {
      assert.ok(families.has(key), `Familie ${key} fehlt im Graphen`);
    }
    assert.deepEqual([...families].filter(f => !['record', 'person', 'institution', 'ort', 'werk'].includes(f)), []);
  });

  test('jede Kante verbindet einen Record mit einer Entitaet und traegt, wo erfasst, die Rolle', () => {
    const gexf = buildGEXF([RICH_ID], store, '2026-09-05');
    const nodeIds = new Set([...gexf.matchAll(/<node id="([^"]*)"/g)].map(m => m[1]));
    const edges = [...gexf.matchAll(/<edge id="(e\d+)" source="([^"]*)" target="([^"]*)">/g)];
    assert.ok(edges.length > 0, 'keine Kante gebaut');
    const ids = new Set();
    for (const [, id, source, target] of edges) {
      assert.ok(source.startsWith('record:'), `Kante geht nicht vom Record aus: ${source}`);
      assert.ok(!target.startsWith('record:'), `Kante zeigt auf einen Record: ${target}`);
      assert.ok(nodeIds.has(source) && nodeIds.has(target), 'Kante zeigt auf einen fehlenden Knoten');
      assert.ok(!ids.has(id), `Kanten-ID ${id} doppelt`);
      ids.add(id);
    }
    assert.match(gexf, /<attvalue for="role" value="[^"]+"\/>/);
  });

  test('& und Apostroph aus den echten Namen stehen maskiert', () => {
    const gexf = buildGEXF([AMP_ID, APOSTROPHE_ID], store, '2026-09-05');
    assert.match(gexf, /label="Aktiengesellschaft Leu &amp; Co\."/);
    assert.match(gexf, /label="Lamento d&apos;Arianna"/);
    // Kein Ampersand ausserhalb einer Entitaetenreferenz.
    assert.doesNotMatch(gexf, /&(?!amp;|lt;|gt;|quot;|apos;)/);
  });

  test('die Ausgabe ist wohlgeformt: jedes Element wird geschlossen', () => {
    const gexf = buildGEXF([RICH_ID, AMP_ID, APOSTROPHE_ID], store, '2026-09-05');
    assert.deepEqual(unbalancedTags(gexf), []);
  });

  test('ein leerer Korb liefert einen leeren, aber wohlgeformten Graphen', () => {
    const gexf = buildGEXF([], store, '2026-09-05');
    assert.match(gexf, /<nodes>\n\s*<\/nodes>/);
    assert.match(gexf, /<edges>\n\s*<\/edges>/);
    assert.deepEqual(unbalancedTags(gexf), []);
  });
});

/** Jede @id irgendwo in einem Knoten, beliebig tief. */
function collectIds(value, acc = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectIds(item, acc);
    return acc;
  }
  if (!value || typeof value !== 'object') return acc;
  for (const [key, inner] of Object.entries(value)) {
    if (key === '@id') {
      if (typeof inner === 'string') acc.push(inner);
    } else {
      collectIds(inner, acc);
    }
  }
  return acc;
}

/**
 * Minimale Wohlgeformtheitspruefung ohne XML-Parser: der Tag-Stapel muss am
 * Ende leer sein, jedes schliessende Tag muss zum obersten offenen passen, und
 * ausserhalb der Tags darf kein rohes < oder & stehen. Gibt die Befunde zurueck,
 * eine leere Liste heisst wohlgeformt.
 */
function unbalancedTags(xml) {
  const problems = [];
  const body = xml.replace(/^<\?xml[^?]*\?>\s*/, '');
  const stack = [];
  const tag = /<(\/?)([A-Za-z:][\w:.-]*)((?:[^<>"]|"[^"]*")*?)(\/?)>/g;
  let cursor = 0;
  let match;
  while ((match = tag.exec(body)) !== null) {
    const text = body.slice(cursor, match.index);
    if (/[<&]/.test(text.replace(/&(amp|lt|gt|quot|apos|#\d+);/g, ''))) {
      problems.push(`unmaskiertes Zeichen im Text: ${text.trim().slice(0, 40)}`);
    }
    cursor = tag.lastIndex;
    const [, closing, name, , selfClosing] = match;
    if (closing) {
      const open = stack.pop();
      if (open !== name) problems.push(`</${name}> schliesst <${open}>`);
    } else if (!selfClosing) {
      stack.push(name);
    }
  }
  if (cursor !== body.length && body.slice(cursor).trim() !== '') {
    problems.push(`Rest nach dem letzten Tag: ${body.slice(cursor).trim().slice(0, 40)}`);
  }
  if (stack.length > 0) problems.push(`nicht geschlossen: ${stack.join(', ')}`);
  return problems;
}
