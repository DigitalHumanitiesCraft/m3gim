/**
 * Die Begriffsknoten des ausgelieferten Datensatzes, fuer synthetische Stores.
 *
 * Seit E-150 stehen Bezugsebene und Rang einer Datierung am Rollenbegriff und
 * kommen ueber den Datensatz in den Store. Ein Fixture, das nur Records und
 * Annotationen enthaelt, hat damit keine Bezugsebene mehr, und jede Pruefung
 * darauf liefe ins Leere.
 *
 * `withConcepts(graph)` stellt die echten Begriffsknoten voran. Damit laeuft
 * ein Fixture gegen dasselbe Vokabular wie die Anwendung, statt gegen eine
 * zweite, im Testcode gefuehrte Tabelle, die beim naechsten Vokabularschnitt
 * still veraltet.
 */

import { readFileSync } from 'node:fs';

let cached = null;

/** Alle skos:Concept-Knoten des ausgelieferten Datensatzes. */
export function conceptNodes() {
  if (cached) return cached;
  const url = new URL('../../data/output/m3gim.jsonld', import.meta.url);
  const raw = JSON.parse(readFileSync(url, 'utf-8'));
  cached = raw['@graph'].filter(n => n && n['@type'] === 'skos:Concept');
  return cached;
}

/** Ein Fixture-Graph mit vorangestellten Begriffsknoten. */
export function withConcepts(graph) {
  const nodes = Array.isArray(graph) ? graph : (graph['@graph'] || []);
  const merged = { '@graph': [...conceptNodes(), ...nodes] };
  if (!Array.isArray(graph)) {
    for (const [key, value] of Object.entries(graph)) {
      if (key !== '@graph') merged[key] = value;
    }
  }
  return merged;
}
