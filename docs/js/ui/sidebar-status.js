/**
 * The result line of the filter column: the root row of the Dokumenttyp tree
 * with the count of the current cut, and its polite announcement. It is no
 * block of its own, `sidebar.js` hangs the tree under the same row.
 *
 * It is also the one place where every view names its Datenstand (F6): the
 * export date stands in the tooltip of the row, because the column has no room
 * for another standing line and design rule 1 sends it into the tooltip anyway.
 */

import { el, clear } from '../utils/dom.js';
import { getFilter, setFilter, facetValues } from './filter-state.js';
import { facetCounts, recordsFor, baseIds } from '../data/records-for.js';
import { flatValues } from './sidebar-facets.js';

let rootSeq = 0;
let liveTimer = 0;

/** Count of the cut in the root row: the share while a filter cuts, the plain
 *  base size while none does. */
export function countLabel(n, m) {
  return n < m ? `${n} von ${m}` : String(m);
}

/**
 * The result line as the root row of the Dokumenttyp tree: "Dokumente" with the
 * count of the current cut, the four DFT groups as its children. A view without
 * the Dokumenttyp facet keeps the root row alone.
 */
export function dokumenteSection(store, inventories, getCount, withTree) {
  const total = () => baseIds(store).size;
  const stand = dataState(store);
  const count = () => {
    if (getCount) {
      const n = getCount();
      if (typeof n === 'number' && Number.isFinite(n)) return n;
    }
    return recordsFor(store, getFilter()).ids.size;
  };
  const labelId = `vs-root-${++rootSeq}`;
  const paint = region => paintRoot(region, labelId, total, count, stand);

  const spec = {
    className: 'vs-section--dokumente',
    titleId: labelId,
    controls: [{ kind: 'custom', className: 'vs-status', build: paint, update: paint }],
  };
  if (withTree) {
    const entries = inventories.get('docType') || [];
    spec.controls.push({
      kind: 'facetTree', key: 'docType', options: () => entries,
      counts: () => facetCounts(store, getFilter(), 'docType', flatValues(entries)),
      selected: () => facetValues(getFilter(), 'docType'),
      onSelect: (values) => setFilter({ docType: values }),
    });
  }
  return spec;
}

/**
 * Polite announcement of the cut. The count row itself is rebuilt on every
 * repaint and would be read out again each time, so the announcement lives in
 * its own region and is written only when the number really changed, one
 * announcement per filter change (Projektleitung, 2026-09-04).
 */
function announceCut(region, n, m) {
  let live = region.parentNode
    ? region.parentNode.querySelector('.vs-status__live') : null;
  if (!live) {
    live = el('div', {
      className: 'vs-status__live visually-hidden',
      role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true',
    });
    if (region.parentNode) region.parentNode.appendChild(live);
  }
  const text = n < m ? `${n} von ${m} Dokumenten im Schnitt`
    : `${m} Dokumente, kein Filter aktiv`;
  if (live.textContent === text) return;
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => { live.textContent = text; }, 200);
}

/** Data state of the dataset as the day it was exported; empty when the file
 *  carries none, and then the line says nothing rather than a placeholder. */
function dataState(store) {
  const raw = (store && store.exportDate) || '';
  return raw ? `Datenstand ${String(raw).slice(0, 10)}` : '';
}

function paintRoot(region, labelId, total, count, stand) {
  clear(region);
  const n = count();
  const m = total();
  announceCut(region, n, m);
  const cut = n < m ? `${n} von ${m} verknüpften Dokumenten im Schnitt`
    : 'Alle verknüpften Dokumente, kein Filter aktiv';
  region.appendChild(el('div', {
    className: 'fs-option fs-option--group vs-status__count',
    dataset: {
      tip: [cut, stand].filter(Boolean).join('\n'),
      tipWrap: '', tipPos: 'bottom-left',
    },
  },
    el('span', { className: 'fs-tree__chevron fs-tree__chevron--none', 'aria-hidden': 'true' }),
    el('span', { className: 'fs-option__label', id: labelId }, 'Dokumente'),
    el('span', { className: 'fs-option__count' }, countLabel(n, m))));
}
