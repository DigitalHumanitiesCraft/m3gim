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
import { isSharedFiltered, sharedFacetsActive, widenFilterForRecord } from './_bestand-filter.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { onViewNavigate } from '../ui/events.js';
import { logStamp } from '../utils/env.js';
import { getFilter, setFilter, addFacetValue, facetValues } from '../ui/filter-state.js';
import { yearBounds, recordsFor } from '../data/records-for.js';
import { getState, selectRecord } from '../ui/router.js';
import {
  getOrderedItems,
  flattenForFilter, isUndatedItem, pruneEmptyKonvolute,
  applyCollapse, annotateKonvolutHeadTips, isRedundantChildDate,
  konvolutIdOfRecord, shouldAutoOpenFirstKonvolut, firstKonvolutId,
  folioRowFacts, rowRecords,
} from './bestand-data.js';
import { folioOfPage } from './record-detail-data.js';
import {
  buildDocTypeBadge, buildErschliessung, buildKonvolutChips,
  konvolutStandTip, getFolioHint, buildKorbBtn,
  buildKonvolutFamilyLegend,
} from './bestand-rows.js';

let store = null;
let container = null;
let sidebar = null;
let expandedRecord = null; // only one at a time
/** The page of a Folio row the open detail shows. Null on every other row. It
 *  is no second selection: the row stays the Folio, only the detail turns
 *  (F8, Aufgabe 7 des Aufgabensatzes). */
let expandedPage = null;
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

/**
 * Render the Bestand view into the container.
 * @param {Object} storeRef
 * @param {HTMLElement} containerEl
 */
export function renderBestand(storeRef, containerEl) {
  store = storeRef;
  container = containerEl;

  clear(container);
  // Die Anwendung startet ungefiltert (E-253): der Erschliessungsstand ist eine
  // Facette wie jede andere und keine Voreinstellung mehr, die einen Teil des
  // Bestands hinter einem Filter zurueckhaelt.

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
  mainEl()?.style.removeProperty('--record-scroll-space');
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
  const cut = recordsFor(store, shared).ids;
  let items = getOrderedItems(store);

  // When filtering, flatten: remove Konvolut headers, keep children flagged so
  // renderRows still resolves their real doc-type badge (nicht Standalone).
  if (isFiltered) {
    items = flattenForFilter(items);
  }

  // The whole cut runs over the documents a row stands for. Every entity and
  // shared facet plus full text and document type resolves through recordsFor,
  // the single place in the frontend; Konvolut heads are RecordSets, carry none
  // of those axes and follow their children. A Folio row carries no
  // Verknuepfung of its own but stands for its pages, so it survives exactly as
  // long as one of its pages does -- otherwise grouping would drop the sheet
  // out of every cut its pages are in (F8).
  const stands = [];
  for (const item of items) {
    if (item.isKonvolut) continue;
    for (const record of rowRecords(item)) stands.push({ record, item });
  }
  const passing = stands.filter(s => cut.has(s.record['@id']));
  const passingRows = new Set(passing.map(s => s.item));
  items = items.filter(item => item.isKonvolut || passingRows.has(item));
  if (!isFiltered) items = pruneEmptyKonvolute(items);

  // Counted are documents, not rows: a Folio row stands for several, and the
  // sidebar figure means the same cut in every view.
  const recordCount = passing.length;
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

function renderRows(items, anchorRecord = null) {
  currentItems = items;
  const tbody = document.getElementById('bestand-tbody');
  if (!tbody) return;
  const anchorTop = anchorRecord ? recordRow(anchorRecord)?.getBoundingClientRect().top : null;
  clear(tbody);

  for (const item of items) {
    const r = item.record;
    const sig = formatSignatur(r['rico:identifier']);
    // What a Folio row takes from its pages where it carries none of its own.
    const facts = folioRowFacts(store, item);
    const docType = getDocTypeId(r) || facts.docType;
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
      const childTitle = r['rico:title'] || facts.title || '';
      const parentTitle = store.konvolutMeta.get(item.konvolutId)?.title || '';
      displayTitle = (childTitle && childTitle === parentTitle) ? '' : (childTitle || '');
    } else {
      displayTitle = r['rico:title'] || facts.title || '(ohne Titel)';
    }

    // Date: a Konvolut shows the span of its children, an object row the date of
    // its Zeitanker. Since F3 the anchor takes the ranghoechste anchoring
    // Datierung of the Verknuepfungen first and `rico:date` only as fallback,
    // so Bestand and Chronik name the same year for the same record; reading
    // `rico:date` here would print a date the timeline contradicts. A Folio row
    // without a dating of its own falls back to the one its pages agree on.
    const anchor = item.isKonvolut ? null : primaryYear(store, r);
    const fromLink = Boolean(anchor && anchor.year != null
      && !OBJECT_OWN_SOURCES.has(anchor.source));
    let displayDate = item.isKonvolut
      ? (meta?.dateDisplay || '')
      : (formatDate(anchor.date) || formatDate(r['rico:date'])
        || formatDate(facts.date) || facts.dateSpan || 'o. D.');
    if (item.isChild && !item.flattened
      && isRedundantChildDate(displayDate, store.konvolutMeta.get(item.konvolutId)?.dateDisplay)) {
      displayDate = '';
    }
    // Only a rendered date is marked as supplemented; where the redundancy rule
    // above emptied the cell there is nothing to explain. Supplemented means
    // either that the year comes from a Verknuepfung instead of the document's
    // own dating, or that a Folio row took the dating of its pages.
    const fromPages = Boolean(facts.date || facts.dateSpan)
      && displayDate !== '' && !r['rico:date'];
    const isDerived = displayDate !== '' && (fromLink || fromPages);
    const isUndated = isUndatedItem(item, store);

    const titelEl = el('span', {
      className: 'archiv-titel'
        // A Folio title taken from its pages carries the one mark of
        // supplemented values, like every other value the row did not record.
        + (facts.title && displayTitle === facts.title ? ' mark-derived' : ''),
      dataset: (facts.title && displayTitle === facts.title)
        ? { tip: `ergänzt: Titel der ${item.pages.length} Seiten dieses Blattes`
            + (displayTitle.length > 80 ? `\n${displayTitle}` : ''), tipWrap: '' }
        : (displayTitle.length > 80
          ? { tip: displayTitle, tipWrap: '', tipPos: 'bottom-left' } : {}),
    }, displayTitle);

    const trProps = {
      className: rowClass,
      onClick: (event) => {
        // Title text remains selectable without rebuilding the selected DOM.
        if (event.target.closest('.archiv-titel')) return;
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed
          && selection.containsNode(event.currentTarget, true)) return;
        if (item.isKonvolut) toggleKonvolut(item.konvolutId);
        else toggleRecordInline(recordId);
      },
    };
    if (item.isKonvolut) {
      trProps['aria-expanded'] = String(isOpen);
      // Heads are the keyboard waypoints of the table: arrow keys walk them,
      // Enter and Space toggle, Escape closes (Projektleitung, 2026-09-04).
      trProps.tabindex = '0';
      // The datasets stay, the DOM verification tool reads the hierarchy from them.
      trProps.dataset = { konvolutHeader: item.konvolutId };
    } else {
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

    // The denominator counts the rows the Konvolut would show, not the raw
    // children of the store: since B2 the pages of a Folio hang under their
    // sheet and are no rows, so meta.childCount would promise objects the table
    // never shows as such.
    const totalChildren = item.totalChildCount ?? (meta ? meta.childCount : 0);
    const headTip = item.isKonvolut
      ? [totalChildren > childCount
        ? `Zeigt ${childCount} von ${totalChildren} Objekten, der Rest ist ohne Verknüpfung`
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
        item.isChild && item.titleShared ? folioHintEl(r, item) : null,
        item.isKonvolut ? null : pageMarkEl(item),
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
        markPageValue(buildDocTypeBadge(item, r, docType, docLabel, docGloss),
          facts.docType && `Dokumenttyp der ${item.pages.length} Seiten dieses Blattes`),
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
              ? { tip: fromLink ? dateOriginTip(r, anchor)
                : 'ergänzt: Datierung der Seiten dieses Blattes', tipWrap: '' }
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
      detailTd.appendChild(buildDetail(item));
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
  // Closing a preceding detail changes the clicked row's position in the table.
  // Keep that row at its reading position after the rebuild.
  if (anchorTop != null) {
    const row = recordRow(anchorRecord);
    const main = mainEl();
    if (row && main) main.scrollTop += row.getBoundingClientRect().top - anchorTop;
  }
}

/** Display form of a vocabulary role label, which the vocabulary keeps in lower
 *  case; the UI writes it capitalised like the Rollenfacette (E-184). */
function roleLabel(label) {
  return label ? label[0].toLocaleUpperCase('de-DE') + label.slice(1) : '';
}

// The Zeitanker either stands at the document itself or comes from one of its
// Verknuepfungen; only the second case is marked, because only there is the
// shown date not the document's own. Same set as in the Chronik (F3).
const OBJECT_OWN_SOURCES = new Set(['rico:date', 'rico:creationDate']);

/**
 * Where a date taken from a Verknuepfung comes from. Since F3 such a Datierung
 * outranks the archival dating, so the row can show a different year than
 * `rico:date`; the source dating is then named as well, or the reader has no
 * way to see that the document itself carries another one.
 */
function dateOriginTip(record, anchor) {
  const own = formatDate(record['rico:date']);
  return [
    anchor.label
      ? `ergänzt: Jahr aus der Datierung „${roleLabel(anchor.label)}“`
      : 'ergänzt: Jahr aus einer Datierung des Belegs',
    own ? `Quelldatierung des Objekts: ${own}` : '',
  ].filter(Boolean).join('\n');
}

/** Marks an already built cell element as a value the row took from its pages;
 *  `what` empty leaves it untouched, so the caller needs no branch. */
function markPageValue(element, what) {
  if (!element || !what) return element;
  element.classList.add('mark-derived');
  Object.assign(element.dataset, {
    tip: [`ergänzt: ${what}`, element.dataset.tip].filter(Boolean).join('\n'),
    tipWrap: '',
  });
  return element;
}

/** The page count of a Folio row as the compact chip the Konvolut head already
 *  uses for its type distribution; the tooltip carries what the number affords,
 *  the row states no prose (design.md § Components). */
function pageMarkEl(item) {
  const count = (item.pages || []).length;
  if (count === 0) return null;
  return el('span', {
    className: 'chip chip--compact archiv-pages',
    dataset: { tip: 'Das Detail blättert durch die Seiten dieses Blattes', tipWrap: '' },
  }, `${count} ${count === 1 ? 'Seite' : 'Seiten'}`);
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
    if (expandedRecord == null) return;
    // Inside the open detail the arrow keys are free, so they turn the pages of
    // a Folio; the buttons of the control stay in the tab order beside them.
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const btn = target.closest('.inline-detail')
        .querySelector(`[data-page-step="${e.key === 'ArrowLeft' ? 'prev' : 'next'}"]`);
      if (!btn || btn.disabled) return;
      e.preventDefault();
      btn.click();
      return;
    }
    if (e.key !== 'Escape') return;
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
  if (expandedRecord === recordId) renderRows(currentItems, recordId);
}

/**
 * The detail of a row. A Folio row shows one of its pages and gets the page
 * control; every other row shows itself and gets none. The row does not change
 * while the reader turns pages, so the detail stays where it stands
 * (Aufgabe 7 des Aufgabensatzes).
 */
function buildDetail(item) {
  const pages = item.pages || [];
  if (pages.length === 0) return buildInlineDetail(item.record, store);
  const page = pages.find(p => p['@id'] === expandedPage) || pages[0];
  expandedPage = page['@id'];
  return buildInlineDetail(page, store, { pages, onPage: turnPage });
}

/** The row a record is shown in: a page is shown in the row of its Folio. */
function rowIdFor(recordId) {
  return folioOfPage(store, recordId) || recordId;
}

/** The page the URL names for the open row, empty for a row without pages. */
function pageOfRow(item, recordId) {
  const pages = item ? (item.pages || []) : [];
  if (pages.length === 0) return null;
  return pages.some(p => p['@id'] === recordId) ? recordId : pages[0]['@id'];
}

/**
 * Turn to a page. The address line is the one driver: it takes the page, and
 * the record handler of the router comes back through expandRecord, which finds
 * the row already open and only swaps the detail. So a page stays citable
 * without a second path that could drift from the first.
 */
function turnPage(pageId) {
  selectRecord(pageId);
}

/**
 * Swap the open detail for another page of the same Folio without rebuilding
 * the table: the row keeps its place, its scroll position and its open state.
 * The focus follows the button that was pressed, so repeated turning works from
 * the keyboard; at the end, where that button goes dead, it falls back to the
 * head line of the detail.
 */
function showPage(pageId) {
  if (expandedPage === pageId) return;
  const item = currentItems.find(i => i.record['@id'] === expandedRecord);
  const cell = container && container.querySelector('.archiv-row--detail td');
  if (!item || !cell) { expandedPage = pageId; renderRows(currentItems); return; }
  expandedPage = pageId;
  const active = document.activeElement;
  // The swap destroys the focused element. Where the focus stood in the detail
  // it goes back to the same button, and to the head line where that button has
  // gone dead at the end of the sheet or the arrow keys did the turning.
  const inDetail = Boolean(active && cell.contains(active));
  const step = inDetail && active.dataset ? active.dataset.pageStep : null;
  clear(cell);
  cell.appendChild(buildDetail(item));
  if (inDetail) {
    const next = (step && cell.querySelector(`[data-page-step="${step}"]:not([disabled])`))
      || cell.querySelector('.inline-detail__head');
    if (next) next.focus({ preventScroll: true });
  }
}

function toggleRecordInline(recordId) {
  if (expandedRecord === recordId) { closeDetail(recordId); return; }
  const item = currentItems.find(i => i.record['@id'] === recordId);
  expandedRecord = recordId;
  expandedPage = pageOfRow(item, recordId);
  pendingDetailFocus = true;
  renderRows(currentItems, recordId);
  selectRecord(expandedPage || recordId);
}

function closeDetail(recordId) {
  expandedRecord = null;
  expandedPage = null;
  pendingRowFocus = recordId;
  renderRows(currentItems, recordId);
  if (getState().selectedRecord) selectRecord(null);
}

/** Programmatically expand a record's inline detail (used by cross-navigation). */
function expandRecord(recordId) {
  if (!recordId || !store) return;
  // A page opens in the row of its Folio, so a deep link on a page opens the
  // sheet on that page (B2/F8). Is the row already open, only the detail turns;
  // widening the cut and rebuilding the table again would move the page under
  // the reader on every step.
  const rowId = rowIdFor(recordId);
  if (expandedRecord === rowId) { showPage(pageOfRow(
    currentItems.find(i => i.record['@id'] === rowId), recordId)); return; }
  expandedRecord = rowId;
  expandedPage = recordId === rowId ? null : recordId;
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
  // Keep the addressed title and detail below both sticky header layers.
  requestAnimationFrame(() => {
    if (expandedRecord !== rowId) return;
    const main = mainEl();
    const row = recordRow(rowId);
    if (!main || !row) return;
    main.style.removeProperty('--record-scroll-space');
    const parent = konvolutId ? headRow(konvolutId) : null;
    const band = headBand(main) + (parent?.getBoundingClientRect().height || 0);
    const top = Math.max(0, rowTopInScrollSpace(main, row) - band);
    // A late record may need trailing space to reach the top on a tall screen.
    const table = main.querySelector('.archiv-table');
    const contentBottom = rowTopInScrollSpace(main, table) + table.offsetHeight
      + parseFloat(getComputedStyle(main).paddingBottom);
    const extra = Math.max(0, top + main.clientHeight - contentBottom);
    main.style.setProperty('--record-scroll-space', `${Math.ceil(extra)}px`);
    main.scrollTo({
      top,
      behavior: 'instant',
    });
  });
}

/** Navigate to a record in the Bestand view (used by Klick im Korb). */
export function selectArchivRecord(recordId) {
  if (!recordId || !store) return;
  expandRecord(recordId);
}
