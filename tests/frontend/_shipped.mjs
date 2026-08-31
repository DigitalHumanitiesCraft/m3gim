/**
 * Der ausgelieferte Datensatz `docs/data/m3gim.jsonld` und der daraus ueber
 * den echten Loader gebaute Store.
 *
 * Die Ansichten laden zur Laufzeit `./data/m3gim.jsonld`, also die Datei unter
 * `docs/data/`. Eine Frontend-Pruefung, die stattdessen den Pipeline-Ausgang
 * unter `data/output/` liest, prueft nicht, was der Browser bekommt; dass
 * beide Dateien heute gleich sind, sichert `tests/test_33_frontend_data_fresh.py`
 * und nicht dieser Pfad.
 */

import { readFileSync } from 'node:fs';

import { loadArchive } from '../../docs/js/data/loader.js';

/** Der Rohgraph der ausgelieferten Datei. */
export function shippedGraph() {
  const url = new URL('../../docs/data/m3gim.jsonld', import.meta.url);
  return JSON.parse(readFileSync(url, 'utf-8'));
}

/** Store ueber den echten loadArchive-Pfad; fetch wird nur waehrenddessen umgelenkt. */
export async function storeFromShipped() {
  const prev = globalThis.fetch;
  globalThis.fetch = async () => ({ status: 200, ok: true, json: async () => shippedGraph() });
  try {
    return await loadArchive('mock://docs-data');
  } finally {
    globalThis.fetch = prev;
  }
}
