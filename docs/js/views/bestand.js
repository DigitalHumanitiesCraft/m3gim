/**
 * M³GIM Archiv Bestand View — Tektonik: Fonds → Konvolute → Objekte.
 * Uses inline expansion instead of sidebar for record details.
 *
 * View orchestration and row rendering only: the ordering rules live in
 * bestand-data.js, the cell builders in bestand-rows.js.
 */

import { el, clear, scrollBehavior } from '../utils/dom.js';
import { formatSignatur, formatChildSignatur, getDocTypeId, truncate, dftLabel, glossOf } from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { primaryYear } from '../data/loader.js';
import { buildInlineDetail } from './record-detail.js';
import { filterBySharedState, isSharedFiltered, searchMatchBestand, sharedFacetsActive, widenFilterForRecord } from './_bestand-filter.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { onViewNavigate } from '../ui/events.js';
import { logStamp } from '../utils/env.js';
import { getFilter, setFilter, applyViewDefault, addFacetValue, facetValues } from '../ui/filter-state.js';
import { yearBounds, baseIds, STAND_DEFAULT } from '../data/records-for.js';
import { applyZeitfenster } from '../ui/filter-sync.js';
import { getState } from '../ui/router.js';
import {
  getOrderedItems,
  flattenForFilter, isUndatedItem, pruneEmptyKonvolute,
  applyCollapse, annotateKonvolutHeadTips, isRedundantChildDate,
  konvolutIdOfRecord, shouldAutoOpenFirstKonvolut, firstKonvolutId,
} from './bestand-data.js';
import {
  buildDocTypeBadge, buildErschliessung, buildKonvolutChips,
  konvolutStandTip, getFolioHint, buildKorbBtn,
  buildKonvolutFamilyLegend,
} from './bestand-rows.js';

let store = null;
let container = null;
let sidebar = null;
let expandedRecord = null; // only one at a time
let currentItems = []; // kept in sync so closures never go stale
/** Open Konvolute of this session. Only the first head opens by itself and only
 *  on the untouched initial view, every other one waits for its chevron; the set
 *  is deliberately neither persisted nor part of the hash, it is a reading
 *  state, not a cut (Projektleitung, 2026-09-03). */
const openKonvolute = new Set();
// Print shows every Konvolut open (the stylesheet cannot, applyCollapse drops
// closed children before render); the reader's own state returns afterwards.
let openBeforePrint = null;
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('beforeprint', () => {
    if (!store) return;
    openBeforePrint = new Set(openKonvolute);
    for (const item of getOrderedItems(store)) {
      if (item.isKonvolut) openKonvolute.add(item.konvolutId);
    }
    updateBestandView();
  });
  window.addEventListener('afterprint', () => {
    if (!openBeforePrint) return;
    openKonvolute.clear();
    for (const id of openBeforePrint) openKonvolute.add(id);
    openBeforePrint = null;
    updateBestandView();
  });
}
/** Whether the reader has worked the chevrons themselves. Once they have, the
 *  auto-open of the first Konvolut stays out of their way. */
let konvolutTouched = false;
let visibleRecords = 0;  // documents on screen, for the sidebar status block
/** The head row that keyboard navigation must get its focus back after a
 *  re-render. */
let pendingHeadFocus = null;
/** Where the focus goes after the next render: into the head line of a detail
 *  that just opened, or back onto the row of one that just closed. */
let pendingDetailFocus = false;
let pendingRowFocus = null;

/** The Bestand opens on the objects that have been worked on (E-162). The two
 *  chips are removable, so nothing stays unreachable. */
const VIEW_DEFAULTS = { stand: [...STAND_DEFAULT] };

/**
 * Render the Bestand view into the container.
 * @param {Object} storeRef
 * @param {HTMLElement} containerEl
 */
export function renderBestand(storeRef, containerEl) {
  store = storeRef;
  container = containerEl;

  clear(container);
  applyViewDefault(VIEW_DEFAULTS);

  // No caption and no Schaerfe banner above the table (E-156), the sidebar
  // status block carries the counts and the table carries the structure.
  const main = el('div', { className: 'view-main archiv-main' });
  main.appendChild(buildTable());

  if (sidebar) sidebar.destroy();
  sidebar = createSidebar(store, {
    yearSpan: yearBounds(store),
    getCount: () => visibleRecords,
    search: { placeholder: 'Signatur, Titel, Typ oder Datum' },
    onChange: () => updateBestandView(),
  });
  main.insertBefore(sidebar.strip, main.firstChild);
  container.appendChild(viewShell(sidebar.element, main));
  updateBestandView();

  // Cross-navigation: Indizes "Alle im Archiv anzeigen", Korb-Klick oder
  // Chronik-Punkt. Ein Facettenwert kommt nicht mehr ueber diesen Kanal, er
  // steht beim Eintreffen schon im geteilten Filter (applyArchivFilter).
  onViewNavigate('bestand', (detail) => {
    const { type, name, recordId } = detail || {};
    if (type === 'personen' && name) addFacetValue('person', name);
    if (recordId) expandRecord(recordId);
  });
}

/**
 * Re-render rows; reads the whole cut from the shared filter state.
 */
function updateBestandView() {
  const shared = getFilter();
  // Shared facets, the free text or the Zeitfenster flatten the hierarchy: they
  // cut children away, and an emptied Konvolut head must not stay behind. The
  // Erschliessungsstand is deliberately not among them (see _bestand-filter.js).
  const isFiltered = Array.isArray(shared.zeitfenster)
    || isSharedFiltered(shared) || sharedFacetsActive(shared);
  // Objekte ohne Erschliessungsstand stehen in keiner Ansicht (Projektleitung,
  // 2026-09-03). Der Schnitt liegt vor jedem Filter, damit ein abgewaehlter
  // Stand sie nicht doch wieder hereinholt; leergelaufene Konvolut-Koepfe
  // faellt pruneEmptyKonvolute weiter unten weg.
  const base = baseIds(store);
  let items = getOrderedItems(store)
    .filter(item => item.isKonvolut || base.has(item.record['@id']));

  // When filtering, flatten: remove Konvolut headers, keep children flagged so
  // renderRows still resolves their real doc-type badge (nicht Standalone).
  if (isFiltered) {
    items = flattenForFilter(items);
  }

  // Every entity and shared facet plus full text and document type resolves
  // through recordsFor, the single place in the frontend. Konvolut heads are
  // RecordSets and carry none of those axes, so the cut runs over the object
  // rows and the heads follow their children.
  const passing = new Set(
    filterBySharedState(store, items.filter(i => !i.isKonvolut), shared, {
      getRecord: (item) => item.record,
      searchMatch: (record, q) => searchMatchBestand(record, q, store),
    }).map(item => item.record['@id']));
  items = items.filter(item => item.isKonvolut || passing.has(item.record['@id']));

  // Zeitfenster acts on top as a plain item filter.
  items = applyZeitfenster(items, shared.zeitfenster, (item) => item.record, store);
  if (!isFiltered) items = pruneEmptyKonvolute(items);

  const recordCount = items.filter(i => !i.isKonvolut).length;
  const konvolutCount = items.filter(i => i.isKonvolut).length;

  if (!isFiltered) {
    // The first Konvolut opens on the untouched initial view so the table shows
    // objects instead of nothing but heads (user-story audit 2026-09-03). It
    // runs after pruneEmptyKonvolute, so the head that opens really has rows.
    if (shouldAutoOpenFirstKonvolut({
      filtered: isFiltered,
      search: shared.search,
      deepLink: Boolean(getState().selectedRecord) || expandedRecord != null,
      userToggled: konvolutTouched,
    })) {
      const first = firstKonvolutId(items);
      if (first) openKonvolute.add(first);
    }
    // Family counts in the head tooltip aggregate over visible children, so they
    // are read before collapse takes those children out of the rows.
    items = applyCollapse(annotateKonvolutHeadTips(store, items), openKonvolute);
  }

  renderRows(items);

  visibleRecords = recordCount;
  if (sidebar) sidebar.update();

  // Compact state stamp for Playwright and manual debugging.
  logStamp('bestand', [
    ['konvolute', konvolutCount],
    ['records', recordCount],
    ['gefiltert', isFiltered ? 'ja' : ''],
    ['stand', facetValues(shared, 'stand').join('+') || 'alle'],
  ]);

  return recordCount;
}

const COLUMNS = ['archiv-col-signatur', 'archiv-col-titel', 'archiv-col-typ',
  'archiv-col-datum', 'archiv-col-links', 'archiv-col-korb'];

function buildTable() {
  const table = el('table', { className: 'archiv-table' });
  const colgroup = el('colgroup');
  for (const cls of COLUMNS) colgroup.appendChild(el('col', { className: cls }));
  table.appendChild(colgroup);
  table.appendChild(buildHead());
  const tbody = el('tbody');
  tbody.id = 'bestand-tbody';
  table.appendChild(tbody);
  // Delegated, so it survives every rebuild of the tbody.
  table.addEventListener('keydown', onTableKeydown);
  return table;
}

/** The head is a label row, not a control: the table keeps the Signatur order
 *  of the Tektonik, other orders belong to the Chronik and the facets (E-203).
 *  It sticks above the sticky Konvolut head, which offsets itself by the
 *  header height in bestand.css. */
const HEAD_LABELS = { 'archiv-col-signatur': 'Signatur', 'archiv-col-titel': 'Titel',
  'archiv-col-typ': 'Typ', 'archiv-col-datum': 'Datum',
  'archiv-col-links': 'Entitäten' };

/** Only where the label alone does not say what the column carries. */
const HEAD_TIPS = {
  'archiv-col-links': 'Personen, Institutionen, Orte und Werke, die im Dokument vorkommen',
};

function buildHead() {
  const tr = el('tr');
  for (const cls of COLUMNS) {
    const th = el('th', {
      className: cls, scope: 'col',
      dataset: HEAD_TIPS[cls] ? { tip: HEAD_TIPS[cls], tipWrap: '' } : {},
    }, HEAD_LABELS[cls] || '');
    tr.appendChild(th);
  }
  return el('thead', {}, tr);
}

function renderRows(items) {
  currentItems = items;
  const tbody = document.getElementById('bestand-tbody');
  if (!tbody) return;
  clear(tbody);

  for (const item of items) {
    const r = item.record;
    const sig = formatSignatur(r['rico:identifier']);
    const docType = getDocTypeId(r);
    const docLabel = dftLabel(store, docType) || '';
    const docGloss = glossOf(store, docType);
    const recordId = r['@id'];
    const isOpen = item.isKonvolut && openKonvolute.has(item.konvolutId);

    let rowClass = '';
    if (item.isKonvolut) rowClass = 'archiv-row--konvolut' + (isOpen ? ' archiv-row--konvolut-open' : '');
    else if (item.isChild) rowClass = 'archiv-row--child';

    if (expandedRecord === recordId) rowClass += ' archiv-row--active';

    const meta = item.isKonvolut ? store.konvolutMeta.get(item.konvolutId) : null;
    // The badge counts the visible children, not the raw meta.childCount, or it
    // drifts against the rows actually rendered.
    const childCount = item.visibleChildCount ?? (meta ? meta.childCount : 0);
    const parentSig = item.isChild
      ? formatSignatur(store.konvolute.get(item.konvolutId)?.['rico:identifier']) : '';

    // Children show the Folio part only; in the flattened filter mode the
    // Konvolut head is missing as context, so the full Signatur is shown.
    const displaySig = (item.isChild && !item.flattened)
      ? formatChildSignatur(r['rico:identifier'], store.konvolute.get(item.konvolutId)?.['rico:identifier'])
      : sig;

    // Konvolute use the title derived from their Folio record. A child whose
    // title merely repeats the Konvolut title (inherited collective title) keeps
    // an empty cell, the context already stands in the head.
    let displayTitle;
    if (item.isKonvolut) {
      displayTitle = meta?.title || r['rico:identifier'] || '';
    } else if (item.isChild) {
      const childTitle = r['rico:title'] || '';
      const parentTitle = store.konvolutMeta.get(item.konvolutId)?.title || '';
      displayTitle = (childTitle && childTitle === parentTitle) ? '' : (childTitle || '');
    } else {
      displayTitle = r['rico:title'] || '(ohne Titel)';
    }

    // Date: a Konvolut shows the span of its children, an object row its own.
    // Without `rico:date` the row falls back to the derived Zeitanker of the
    // data layer (contract A4, E-141), so a record dated only through an
    // annotated Auftritt shows its year instead of reading as undated.
    const anchor = item.isKonvolut ? null : primaryYear(store, r);
    const derivedYear = (!item.isKonvolut && !r['rico:date'] && anchor.year != null)
      ? String(anchor.year) : '';
    let displayDate = item.isKonvolut
      ? (meta?.dateDisplay || '')
      : (formatDate(r['rico:date']) || derivedYear || 'o. D.');
    if (item.isChild && !item.flattened
      && isRedundantChildDate(displayDate, store.konvolutMeta.get(item.konvolutId)?.dateDisplay)) {
      displayDate = '';
    }
    // Only a rendered year is marked as derived; where the redundancy rule
    // above emptied the cell there is nothing to explain.
    const isDerived = derivedYear !== '' && displayDate === derivedYear;
    const isUndated = isUndatedItem(item, store);

    const titelEl = el('span', {
      className: 'archiv-titel',
      dataset: displayTitle.length > 80
        ? { tip: displayTitle, tipWrap: '', tipPos: 'bottom-left' } : {},
    }, truncate(displayTitle, 80));

    const trProps = { className: rowClass };
    if (item.isKonvolut) {
      trProps.onClick = () => toggleKonvolut(item.konvolutId);
      trProps['aria-expanded'] = String(isOpen);
      // Heads are the keyboard waypoints of the table: arrow keys walk them,
      // Enter and Space toggle, Escape closes (Projektleitung, 2026-09-04).
      trProps.tabindex = '0';
      // The datasets stay, the DOM verification tool reads the hierarchy from them.
      trProps.dataset = { konvolutHeader: item.konvolutId };
    } else {
      trProps.onClick = () => toggleRecordInline(recordId);
      trProps['aria-expanded'] = String(expandedRecord === recordId);
      // An object row is a control like the head: the arrow walk reaches it,
      // Enter opens its detail. tabindex -1 keeps it out of the tab sequence,
      // which would otherwise run through every row of the table
      // (Projektleitung, 2026-09-04).
      trProps.tabindex = '-1';
      trProps.dataset = item.isChild
        ? { konvolutChild: item.konvolutId, recordRow: recordId }
        : { recordRow: recordId };
    }

    const headTip = item.isKonvolut
      ? [meta && meta.childCount > childCount
        ? `Zeigt ${childCount} von ${meta.childCount} Objekten, der Rest ist ohne Verknüpfung`
        : `Enthält ${childCount} Objekte`, konvolutStandTip(meta),
        item.familyTip,
        isOpen ? 'Klick schließt das Konvolut' : 'Klick öffnet das Konvolut']
        .filter(Boolean).join('\n')
      : '';
    // The head has no Typ badge (Projektleitung, 2026-09-03); its tooltip
    // hangs on the title, ahead of the full title where that is truncated.
    if (item.isKonvolut) {
      Object.assign(titelEl.dataset, {
        tip: [displayTitle.length > 80 ? displayTitle : '', headTip].filter(Boolean).join('\n'),
        tipWrap: '', tipPos: 'bottom-left',
      });
      // The tip is set after construction, so el() cannot keep it out of the
      // accessible name here (Projektleitung, 2026-09-04).
      titelEl.setAttribute('aria-label', displayTitle);
    }
    const tr = el('tr', trProps,
      el('td', { className: 'archiv-col-signatur' },
        // One chevron, one meaning, aufklappen, on both levels of the table.
        // The head opens its Konvolut, the object row its inline detail; a
        // child row indents its chevron under the head's (E-217).
        el('span', {
          className: 'archiv-chevron'
            + (item.isChild ? ' archiv-chevron--child' : '')
            + ((item.isKonvolut ? isOpen : expandedRecord === recordId)
              ? ' archiv-chevron--open' : ''),
          'aria-hidden': 'true',
        }, '\u203a'),
        el('span', {
          className: 'archiv-signatur',
          dataset: (item.isChild && !item.flattened && parentSig)
            ? { tip: `Folio ${displaySig} in ${parentSig}` } : {},
        }, displaySig)
      ),
      el('td', { className: 'archiv-col-titel' },
        // The Konvolut head puts title and type chips into one wrapping flex
        // row; a td cannot be that container without leaving the table layout.
        // The type distribution stands in for the rows only while they are
        // hidden; once the Konvolut is open, the Typ column carries it.
        item.isKonvolut
          ? el('div', { className: 'archiv-titel-zeile' },
            titelEl, buildKonvolutChips(store, meta, !isOpen))
          : titelEl,
        item.isChild ? folioHintEl(r, item) : null,
        // In flat mode the Konvolut head is gone, so a quiet provenance hint
        // names the Konvolut the child row comes from.
        item.flattened ? (() => {
          const konvolut = store.konvolute.get(item.konvolutId);
          const kTitle = store.konvolutMeta.get(item.konvolutId)?.title
            || konvolut?.['rico:identifier'] || '';
          if (!kTitle) return null;
          const kSig = formatSignatur(konvolut?.['rico:identifier']);
          // The title is not the row's own, it comes from its Konvolut, so it
          // carries the mark of supplemented values (Projektleitung,
          // 2026-09-04).
          return el('span', { className: 'archiv-folio-hint archiv-folio-hint--konvolut' },
            'aus: ',
            el('span', {
              className: 'mark-derived',
              dataset: {
                tip: `ergänzt: Titel des Konvoluts ${kSig || item.konvolutId}`,
                tipWrap: '',
              },
            }, truncate(kTitle, 40)));
        })() : null,
      ),
      el('td', { className: 'archiv-col-typ' },
        buildDocTypeBadge(item, r, docType, docLabel, docGloss),
      ),
      el('td', { className: 'archiv-col-datum' },
        el('span', {
          // Absence keeps its own form; a derived year carries the one mark of
          // supplemented values (Projektleitung, 2026-09-04).
          className: 'archiv-datum'
            + (isUndated ? ' archiv-datum--undated' : '')
            + (isDerived ? ' mark-derived' : ''),
          dataset: isUndated ? { tip: 'ohne Datierung in der Quelle' }
            : (isDerived
              ? { tip: anchor.label
                ? `ergänzt: Jahr aus der Datierung „${roleLabel(anchor.label)}“`
                : 'ergänzt: Jahr aus einer Datierung des Belegs',
              tipWrap: '' }
              : {}),
        }, displayDate)
      ),
      el('td', { className: 'archiv-col-links' },
        // The open head legends the column for the rows it just revealed; the
        // closed head has no rows below it and keeps the cell empty
        // (Projektleitung, 2026-09-04).
        item.isKonvolut
          ? (isOpen ? buildKonvolutFamilyLegend() : null)
          : buildErschliessung(store, r),
      ),
      el('td', { className: 'archiv-col-korb' },
        // A Konvolut head is no document and carries no Korb control; it closes
        // through its own chevron and the whole-row click (E-217).
        item.isKonvolut ? null : buildKorbBtn(recordId, onKorbToggled),
      ),
    );
    tbody.appendChild(tr);

    // Inline detail expansion
    if (expandedRecord === recordId) {
      const detailTr = el('tr', { className: 'archiv-row--detail' });
      const detailTd = el('td', { colspan: '6' });
      detailTd.appendChild(buildInlineDetail(r, store, {
        onClose: () => closeDetail(recordId),
      }));
      detailTr.appendChild(detailTd);
      tbody.appendChild(detailTr);
    }
  }

  // A keyboard toggle rebuilds the tbody under the focused row; without this
  // the focus falls back to the document and the arrow walk starts over.
  if (pendingHeadFocus) {
    headRow(pendingHeadFocus)?.focus({ preventScroll: true });
    pendingHeadFocus = null;
  }
  // The detail is the new context, so the focus follows it into its head line
  // and comes back to the row when it closes (Projektleitung, 2026-09-04).
  if (pendingDetailFocus) {
    const tbodyEl = document.getElementById('bestand-tbody');
    tbodyEl?.querySelector('.inline-detail__head')?.focus({ preventScroll: true });
    pendingDetailFocus = false;
  }
  if (pendingRowFocus) {
    recordRow(pendingRowFocus)?.focus({ preventScroll: true });
    pendingRowFocus = null;
  }
}

/** Display form of a vocabulary role label, which the vocabulary keeps in lower
 *  case; the UI writes it capitalised like the Rollenfacette (E-184). */
function roleLabel(label) {
  return label ? label[0].toLocaleUpperCase('de-DE') + label.slice(1) : '';
}

/** Hint that tells apart children sharing the collective title of their
 *  Konvolut. The title cell carries no icons (E-217), so the hint is the bare
 *  participant name; it is a stand-in and not the row's own title, so it keeps
 *  the mark of supplemented values (Projektleitung, 2026-09-04). */
function folioHintEl(record, item) {
  const hint = getFolioHint(store, record, item.konvolutId);
  if (!hint) return null;
  return el('span', { className: 'archiv-folio-hint' },
    el('span', {
      className: 'mark-derived',
      dataset: {
        tip: 'ergänzt: erster Beteiligter statt des ererbten Sammeltitels',
        tipWrap: '',
      },
    }, hint));
}

/** Opening a Konvolut is a reading state; it survives no reload and appears in
 *  no URL. The head is parked under the sticky column head afterwards, so the
 *  rows that just appeared start at the top edge instead of below the fold.
 *  Only a toggle the reader triggered scrolls: the auto-open of the first head
 *  (E-206) and the deep link add to `openKonvolute` directly and keep their own
 *  scroll behaviour. */
function toggleKonvolut(konvolutId, { keepFocus = false } = {}) {
  konvolutTouched = true;
  const opening = !openKonvolute.has(konvolutId);
  if (opening) openKonvolute.add(konvolutId);
  else openKonvolute.delete(konvolutId);
  if (keepFocus) pendingHeadFocus = konvolutId;
  updateBestandView();
  // On close only when the head ran out of view: closing from the top of the
  // table must not move the page under the reader.
  scrollKonvolutUnderHead(konvolutId, { onlyWhenOutside: !opening });
}

/** The scrolling area of the view and the row of a Konvolut head in it. */
function mainEl() {
  return container ? container.querySelector('.archiv-main') : null;
}

function headRow(konvolutId) {
  const main = mainEl();
  return main ? main.querySelector(`tr[data-konvolut-header="${konvolutId}"]`) : null;
}

function recordRow(recordId) {
  const main = mainEl();
  return main ? main.querySelector(`tr[data-record-row="${CSS.escape(recordId)}"]`) : null;
}

/** The row a Konvolut parks under the sticky column head: its head in the
 *  structural view, its first row in the flattened cut, where the heads are
 *  gone (Projektleitung, 2026-09-04). */
function konvolutAnchorRow(konvolutId) {
  const main = mainEl();
  if (!main) return null;
  return headRow(konvolutId)
    || main.querySelector(`tr[data-konvolut-child="${konvolutId}"]`);
}

/** Height of the sticky column head, the band an opened Konvolut parks below. */
function headBand(main) {
  const thead = main.querySelector('.archiv-table thead');
  return thead ? thead.getBoundingClientRect().height : 0;
}

/**
 * Position of a row in the scroll space of `.archiv-main`. Rects are useless
 * here, because an open head is `position: sticky` and reports its parked
 * position, not the one to scroll to. `offsetTop` is free of that, but its base
 * is not: a static `tr` measures from the `table`, while a sticky head is
 * positioned and measures from `.archiv-main` directly. Summing the whole
 * offsetParent chain up to the scrolling area covers both regimes; taking the
 * row's own offsetTop and subtracting the table's mixed the two and came out
 * one table offset short for every row that was not sticky (Projektleitung,
 * 2026-09-04).
 */
function rowTopInScrollSpace(main, row) {
  let top = 0;
  for (let node = row; node && node !== main; node = node.offsetParent) {
    top += node.offsetTop;
  }
  return top;
}

/** Scrolls the target row of a Konvolut to sit directly under the sticky column
 *  head. */
function scrollKonvolutUnderHead(konvolutId, { onlyWhenOutside = false } = {}) {
  const main = mainEl();
  const row = konvolutAnchorRow(konvolutId);
  if (!main || !row) return;
  const band = headBand(main);
  const top = rowTopInScrollSpace(main, row);
  if (onlyWhenOutside
    && top >= main.scrollTop + band && top <= main.scrollTop + main.clientHeight - row.offsetHeight) {
    return;
  }
  main.scrollTo({
    top: Math.max(0, top - band),
    behavior: scrollBehavior(),
  });
}

/**
 * Keyboard walk over the rows. Arrow keys step through Konvolut heads and
 * object rows alike, Enter and Space open what the row carries, Escape closes
 * it again (Projektleitung, 2026-09-04). Keys inside a form field belong to that field,
 * and inside the open detail only Escape is the table's business.
 */
function onTableKeydown(e) {
  const target = e.target;
  if (!(target instanceof Element)) return;
  if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (target.closest('.inline-detail')) {
    if (e.key !== 'Escape' || expandedRecord == null) return;
    e.preventDefault();
    closeDetail(expandedRecord);
    return;
  }

  const row = target.closest('tr[data-konvolut-header], tr[data-record-row]');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const rows = [...document.querySelectorAll(
      '#bestand-tbody tr[data-konvolut-header], #bestand-tbody tr[data-record-row]')];
    if (rows.length === 0) return;
    e.preventDefault();
    const i = row ? rows.indexOf(row) : -1;
    const step = e.key === 'ArrowDown' ? 1 : -1;
    const next = i === -1 ? 0 : Math.min(rows.length - 1, Math.max(0, i + step));
    rows[next].focus();
    return;
  }
  if (!row) return;

  const konvolutId = row.dataset.konvolutHeader;
  if (konvolutId) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleKonvolut(konvolutId, { keepFocus: true });
    } else if (e.key === 'Escape' && openKonvolute.has(konvolutId)) {
      e.preventDefault();
      toggleKonvolut(konvolutId, { keepFocus: true });
    }
    return;
  }

  const recordId = row.dataset.recordRow;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleRecordInline(recordId);
  } else if (e.key === 'Escape' && expandedRecord === recordId) {
    e.preventDefault();
    closeDetail(recordId);
  }
}

/** Only when the same record is expanded does its second Korb control need to
 *  follow, which takes a full rebuild. */
function onKorbToggled(recordId) {
  if (expandedRecord === recordId) renderRows(currentItems);
}

function toggleRecordInline(recordId) {
  if (expandedRecord === recordId) { closeDetail(recordId); return; }
  expandedRecord = recordId;
  pendingDetailFocus = true;
  renderRows(currentItems);
}

function closeDetail(recordId) {
  expandedRecord = null;
  pendingRowFocus = recordId;
  renderRows(currentItems);
}

/** Programmatically expand a record's inline detail (used by cross-navigation). */
function expandRecord(recordId) {
  if (!recordId || !store) return;
  expandedRecord = recordId;
  // A record named by a jump has to open, so a cut that excludes it is widened
  // minimally instead of letting the row disappear without a word; every
  // widening shows up as a chip (Projektleitung, 2026-09-04).
  const { patch, blocked } = widenFilterForRecord(store, recordId, getFilter());
  if (Object.keys(patch).length > 0) setFilter(patch);
  if (blocked.length > 0) {
    console.warn('M³GIM: Datensatz', recordId,
      'bleibt ausgeschlossen durch', blocked.join(', '));
  }
  // A deep link or a jump from another view must not land in a closed Konvolut,
  // so the head holding the record opens with it.
  const konvolutId = konvolutIdOfRecord(store, recordId);
  if (konvolutId) openKonvolute.add(konvolutId);
  updateBestandView();
  // Scroll to the expanded row
  requestAnimationFrame(() => {
    const row = document.querySelector('.archiv-row--detail');
    if (row) {
      row.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' });
    }
  });
}

/** Navigate to a record in the Bestand view (used by Klick im Korb). */
export function selectArchivRecord(recordId) {
  if (!recordId || !store) return;
  expandRecord(recordId);
}
