/**
 * M³GIM Archiv Bestand View — Tektonik: Fonds → Konvolute → Objekte.
 * Uses inline expansion instead of sidebar for record details.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur, getDocTypeId, countLinks, truncate } from '../utils/format.js';
import { extractYear, formatDate } from '../utils/date-parser.js';
import { DOKUMENTTYP_LABELS } from '../data/constants.js';
import { buildInlineDetail } from './archiv-inline-detail.js';

let store = null;
let container = null;
let expandedKonvolute = new Set();
let expandedRecord = null; // only one at a time
let currentItems = []; // kept in sync so closures never go stale

/**
 * Render the Bestand view into the container.
 * @param {Object} storeRef
 * @param {HTMLElement} containerEl
 * @param {{ search: string, docType: string, sort: string }} filters
 */
export function renderBestand(storeRef, containerEl, filters) {
  store = storeRef;
  container = containerEl;

  // Default: expand small Konvolute
  if (expandedKonvolute.size === 0) {
    for (const [kid, children] of store.konvolutChildren) {
      if (children.length <= 15) expandedKonvolute.add(kid);
    }
  }

  clear(container);
  container.appendChild(buildTable());
  updateBestandView(filters);
}

/**
 * Re-render rows with updated filters (called from orchestrator).
 */
export function updateBestandView(filters) {
  const { search = '', docType = '', sort = 'signatur' } = filters || {};
  let items = getOrderedItems();

  // Search
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(item => {
      const r = item.record;
      const sig = (r['rico:identifier'] || '').toLowerCase();
      const title = (r['rico:title'] || '').toLowerCase();
      return sig.includes(q) || title.includes(q);
    });
  }

  // Doc type filter
  if (docType) {
    items = items.filter(item => getDocTypeId(item.record) === docType);
  }

  // Sort (only when not in structural grouping mode)
  if (search || docType || sort !== 'signatur') {
    items.sort((a, b) => sortFn(a.record, b.record, sort));
  }

  renderRows(items);
}

function buildTable() {
  const table = el('table', { className: 'archiv-table' });
  const thead = el('thead', {},
    el('tr', {},
      el('th', { className: 'archiv-col-signatur' }, 'Signatur'),
      el('th', { className: 'archiv-col-titel' }, 'Titel'),
      el('th', { className: 'archiv-col-typ' }, 'Typ'),
      el('th', { className: 'archiv-col-datum' }, 'Datum'),
      el('th', { className: 'archiv-col-links' }, 'Vkn.'),
    )
  );
  table.appendChild(thead);
  const tbody = el('tbody');
  tbody.id = 'bestand-tbody';
  table.appendChild(tbody);
  return table;
}

function getOrderedItems() {
  const items = [];
  const childIds = new Set();
  for (const children of store.konvolutChildren.values()) {
    for (const cid of children) childIds.add(cid);
  }

  const topLevel = store.allRecords.filter(r => !childIds.has(r['@id']));
  topLevel.sort((a, b) => naturalSort(a['rico:identifier'] || '', b['rico:identifier'] || ''));

  for (const record of topLevel) {
    const konvolutId = [...store.konvolute.keys()].find(kid => {
      const sig = record['rico:identifier'] || '';
      const konvSig = store.konvolute.get(kid)?.['rico:identifier'] || '';
      return sig === konvSig || record['@id'] === kid;
    });

    if (konvolutId && store.konvolutChildren.has(konvolutId)) {
      items.push({ record, isKonvolut: true, konvolutId });
      const children = store.konvolutChildren.get(konvolutId)
        .map(cid => store.records.get(cid))
        .filter(Boolean)
        .sort((a, b) => naturalSort(a['rico:identifier'] || '', b['rico:identifier'] || ''));
      for (const child of children) {
        items.push({ record: child, isChild: true, konvolutId });
      }
    } else {
      items.push({ record });
    }
  }

  return items;
}

function sortFn(a, b, sort) {
  switch (sort) {
    case 'datum': {
      const ya = extractYear(a['rico:date']) || 9999;
      const yb = extractYear(b['rico:date']) || 9999;
      return ya - yb;
    }
    case 'typ': {
      const ta = getDocTypeId(a) || 'zzz';
      const tb = getDocTypeId(b) || 'zzz';
      return ta.localeCompare(tb);
    }
    case 'links':
      return countLinks(b) - countLinks(a);
    default:
      return naturalSort(a['rico:identifier'] || '', b['rico:identifier'] || '');
  }
}

function renderRows(items) {
  currentItems = items;
  const tbody = document.getElementById('bestand-tbody');
  if (!tbody) return;
  clear(tbody);

  for (const item of items) {
    const r = item.record;
    const sig = formatSignatur(r['rico:identifier']);
    const links = countLinks(r);
    const year = extractYear(r['rico:date']);
    const docType = getDocTypeId(r);
    const docLabel = DOKUMENTTYP_LABELS[docType] || docType || '';
    const recordId = r['@id'];

    let rowClass = '';
    if (item.isKonvolut) rowClass = 'archiv-row--konvolut';
    else if (item.isChild) {
      rowClass = 'archiv-row--child';
      if (!expandedKonvolute.has(item.konvolutId)) rowClass += ' archiv-row--hidden';
    }

    if (expandedRecord === recordId) rowClass += ' archiv-row--active';

    const sigContent = [];
    if (item.isKonvolut) {
      const expanded = expandedKonvolute.has(item.konvolutId);
      const toggle = el('button', {
        className: `konvolut-toggle ${expanded ? '' : 'collapsed'}`,
        onClick: (e) => {
          e.stopPropagation();
          toggleKonvolut(item.konvolutId);
        },
        html: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
      });
      sigContent.push(toggle);
    }

    const childCount = item.isKonvolut ? (store.konvolutChildren.get(item.konvolutId)?.length || 0) : 0;
    let konvolutLinkCount = 0;
    if (item.isKonvolut) {
      for (const cid of store.konvolutChildren.get(item.konvolutId) || []) {
        const child = store.records.get(cid);
        if (child) konvolutLinkCount += countLinks(child);
      }
    }
    const linksDisplay = item.isKonvolut
      ? `${childCount} Fol. \u00b7 ${konvolutLinkCount} Vkn.`
      : String(links);

    const tr = el('tr', {
      className: rowClass,
      onClick: () => toggleRecordInline(recordId),
    },
      el('td', { className: 'archiv-col-signatur' },
        ...sigContent,
        el('span', { className: 'archiv-signatur' }, sig)
      ),
      el('td', { className: 'archiv-col-titel' },
        el('span', { className: 'archiv-titel' }, truncate(r['rico:title'] || '(ohne Titel)', 80))
      ),
      el('td', { className: 'archiv-col-typ' },
        item.isKonvolut
          ? el('span', { className: 'badge badge--konvolut-struct' }, `Konvolut (${childCount})`)
          : docLabel && docType !== 'konvolut'
            ? el('span', { className: `badge badge--${docType || ''}` }, docLabel)
            : el('span')
      ),
      el('td', { className: 'archiv-col-datum' },
        el('span', { className: `archiv-datum ${r['rico:date'] ? '' : 'archiv-datum--undated'}` }, formatDate(r['rico:date']) || 'o.\u2009D.')
      ),
      el('td', { className: 'archiv-col-links' },
        el('span', { className: `archiv-links ${(item.isKonvolut ? konvolutLinkCount : links) > 0 ? 'archiv-links--has-links' : ''}` }, String(linksDisplay))
      ),
    );
    tbody.appendChild(tr);

    // Inline detail expansion
    if (expandedRecord === recordId) {
      const detailTr = el('tr', { className: 'archiv-row--detail' });
      const detailTd = el('td', { colspan: '5' });
      detailTd.appendChild(buildInlineDetail(r, store, {
        onClose: () => { expandedRecord = null; renderRows(currentItems); },
      }));
      detailTr.appendChild(detailTd);
      tbody.appendChild(detailTr);
    }
  }
}

function toggleRecordInline(recordId) {
  expandedRecord = expandedRecord === recordId ? null : recordId;
  renderRows(currentItems);
}

function toggleKonvolut(konvolutId) {
  if (expandedKonvolute.has(konvolutId)) {
    expandedKonvolute.delete(konvolutId);
  } else {
    expandedKonvolute.add(konvolutId);
  }
  renderRows(currentItems);
}

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}
