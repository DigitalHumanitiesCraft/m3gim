/**
 * M³GIM Archiv Bestand View — Tektonik: Fonds → Konvolute → Objekte.
 * Uses inline expansion instead of sidebar for record details.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur, formatChildSignatur, getDocTypeId, countLinks, truncate } from '../utils/format.js';
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
  const isFiltered = !!(search || docType);
  let items = getOrderedItems();

  // When filtering, flatten: remove Konvolut headers, show children as standalone
  if (isFiltered) {
    items = items
      .filter(item => !item.isKonvolut)
      .map(item => item.isChild ? { record: item.record, konvolutId: item.konvolutId } : item);
  }

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
  if (isFiltered || sort !== 'signatur') {
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

  // Standalone records (not children of any Konvolut)
  const standalone = store.allRecords.filter(r => !childIds.has(r['@id']));

  // Merge standalone records + Konvolut RecordSets into one sorted list
  const topEntries = [];
  for (const record of standalone) {
    topEntries.push({ sig: record['rico:identifier'] || '', record, type: 'record' });
  }
  for (const [kid, konvolut] of store.konvolute) {
    topEntries.push({ sig: konvolut['rico:identifier'] || '', record: konvolut, type: 'konvolut', konvolutId: kid });
  }
  topEntries.sort((a, b) => naturalSort(a.sig, b.sig));

  // Build flat list: Konvolute get their children injected after them
  for (const entry of topEntries) {
    if (entry.type === 'konvolut') {
      items.push({ record: entry.record, isKonvolut: true, konvolutId: entry.konvolutId });
      const children = (store.konvolutChildren.get(entry.konvolutId) || [])
        .filter(cid => !store.folioIds.has(cid))
        .map(cid => store.records.get(cid))
        .filter(Boolean)
        .sort((a, b) => naturalSort(a['rico:identifier'] || '', b['rico:identifier'] || ''));
      for (const child of children) {
        items.push({ record: child, isChild: true, konvolutId: entry.konvolutId });
      }
    } else {
      items.push({ record: entry.record });
    }
  }

  return items;
}

function sortFn(a, b, sort) {
  switch (sort) {
    case 'titel': {
      const ta = (a['rico:title'] || '').toLowerCase();
      const tb = (b['rico:title'] || '').toLowerCase();
      return ta.localeCompare(tb, 'de');
    }
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

    const meta = item.isKonvolut ? store.konvolutMeta.get(item.konvolutId) : null;
    const childCount = meta ? meta.childCount : 0;

    // Signatur: children show only folio part
    const displaySig = item.isChild
      ? formatChildSignatur(r['rico:identifier'], store.konvolute.get(item.konvolutId)?.['rico:identifier'])
      : sig;

    // Title: Konvolute use derived title from Folio record
    const displayTitle = item.isKonvolut
      ? (meta?.title || r['rico:identifier'] || '')
      : (r['rico:title'] || '(ohne Titel)');

    // Date: Konvolute show date range from children, Records show formatted date
    const displayDate = item.isKonvolut
      ? (meta?.dateDisplay || '')
      : (formatDate(r['rico:date']) || 'o.\u2009D.');
    const isUndated = !item.isKonvolut && !r['rico:date'];

    // Links: Konvolute use pre-computed total, Records show count or dash
    const linksDisplay = item.isKonvolut
      ? `${childCount} Fol.\u2009\u00b7\u2009${meta?.totalLinks || 0} Vkn.`
      : (links > 0 ? String(links) : '\u2013');
    const hasLinks = item.isKonvolut ? (meta?.totalLinks > 0) : (links > 0);

    const tr = el('tr', {
      className: rowClass,
      onClick: () => toggleRecordInline(recordId),
    },
      el('td', { className: 'archiv-col-signatur' },
        ...sigContent,
        el('span', { className: 'archiv-signatur' }, displaySig)
      ),
      el('td', { className: 'archiv-col-titel' },
        el('span', { className: 'archiv-titel' }, truncate(displayTitle, 80))
      ),
      el('td', { className: 'archiv-col-typ' },
        item.isKonvolut
          ? el('span', { className: 'badge badge--konvolut-struct' }, `Konvolut (${childCount})`)
          : docLabel && docType !== 'konvolut'
            ? el('span', { className: `badge badge--${docType || ''}` }, docLabel)
            : el('span')
      ),
      el('td', { className: 'archiv-col-datum' },
        el('span', { className: `archiv-datum ${isUndated ? 'archiv-datum--undated' : ''}` }, displayDate)
      ),
      el('td', { className: 'archiv-col-links' },
        el('span', { className: `archiv-links ${hasLinks ? 'archiv-links--has-links' : 'archiv-links--zero'}` }, linksDisplay)
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
