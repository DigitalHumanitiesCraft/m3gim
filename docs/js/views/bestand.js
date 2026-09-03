/**
 * M³GIM Archiv Bestand View — Tektonik: Fonds → Konvolute → Objekte.
 * Uses inline expansion instead of sidebar for record details.
 *
 * View orchestration and row rendering only: the ordering rules live in
 * bestand-data.js, the cell builders in bestand-rows.js.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur, formatChildSignatur, getDocTypeId, truncate, dftLabel, glossOf } from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { buildInlineDetail } from './record-detail.js';
import { filterBySharedState, isSharedFiltered, searchMatchBestand, sharedFacetsActive } from './_bestand-filter.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { onViewNavigate } from '../ui/events.js';
import { logStamp } from '../utils/env.js';
import { getFilter, applyViewDefault, addFacetValue, facetValues } from '../ui/filter-state.js';
import { yearBounds, baseIds, STAND_DEFAULT } from '../data/records-for.js';
import { applyZeitfenster } from '../ui/filter-sync.js';
import {
  getOrderedItems,
  flattenForFilter, isUndatedItem, pruneEmptyKonvolute,
  applyCollapse, annotateKonvolutHeadTips, isRedundantChildDate,
  konvolutIdOfRecord,
} from './bestand-data.js';
import {
  buildDocTypeBadge, buildErschliessung, buildKonvolutChips,
  konvolutStandTip, getFolioHint, buildKorbBtn,
} from './bestand-rows.js';

let store = null;
let container = null;
let sidebar = null;
let expandedRecord = null; // only one at a time
let currentItems = []; // kept in sync so closures never go stale
/** Open Konvolute of this session. A head starts closed, the chevron opens it;
 *  the set is deliberately neither persisted nor part of the hash, it is a
 *  reading state, not a cut (Projektleitung, 2026-09-03). */
const openKonvolute = new Set();
let visibleRecords = 0;  // documents on screen, for the sidebar status block

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

  // Family counts in the head tooltip aggregate over visible children, so they
  // are read before collapse takes those children out of the rows.
  if (!isFiltered) {
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
  return table;
}

/** The head is a label row, not a control: the table keeps the Signatur order
 *  of the Tektonik, other orders belong to the Chronik and the facets (E-203).
 *  It sticks above the sticky Konvolut head, which offsets itself by the
 *  header height in bestand.css. */
const HEAD_LABELS = { 'archiv-col-signatur': 'Signatur', 'archiv-col-titel': 'Titel',
  'archiv-col-typ': 'Typ', 'archiv-col-datum': 'Datum' };

function buildHead() {
  const tr = el('tr');
  for (const cls of COLUMNS) {
    tr.appendChild(el('th', { className: cls, scope: 'col' }, HEAD_LABELS[cls] || ''));
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
    let displayDate = item.isKonvolut
      ? (meta?.dateDisplay || '')
      : (formatDate(r['rico:date']) || 'o. D.');
    if (item.isChild && !item.flattened
      && isRedundantChildDate(displayDate, store.konvolutMeta.get(item.konvolutId)?.dateDisplay)) {
      displayDate = '';
    }
    const isUndated = isUndatedItem(item);

    const titelEl = el('span', {
      className: 'archiv-titel',
      dataset: displayTitle.length > 80
        ? { tip: displayTitle, tipWrap: '', tipPos: 'bottom-left' } : {},
    }, truncate(displayTitle, 80));

    const trProps = { className: rowClass };
    if (item.isKonvolut) {
      trProps.onClick = () => toggleKonvolut(item.konvolutId);
      trProps['aria-expanded'] = String(isOpen);
      // The datasets stay, the DOM verification tool reads the hierarchy from them.
      trProps.dataset = { konvolutHeader: item.konvolutId };
    } else {
      trProps.onClick = () => toggleRecordInline(recordId);
      if (item.isChild) trProps.dataset = { konvolutChild: item.konvolutId };
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
    }
    const tr = el('tr', trProps,
      el('td', { className: 'archiv-col-signatur' },
        item.isKonvolut
          ? el('span', {
            className: 'archiv-chevron' + (isOpen ? ' archiv-chevron--open' : ''),
            'aria-hidden': 'true',
          }, '\u203a')
          : null,
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
          const kTitle = store.konvolutMeta.get(item.konvolutId)?.title
            || store.konvolute.get(item.konvolutId)?.['rico:identifier'] || '';
          return kTitle ? el('span', {
            className: 'archiv-folio-hint archiv-folio-hint--konvolut',
            dataset: { tip: `Aus Konvolut: ${kTitle}` },
          }, `aus: ${truncate(kTitle, 40)}`) : null;
        })() : null,
      ),
      el('td', { className: 'archiv-col-typ' },
        buildDocTypeBadge(item, r, docType, docLabel, docGloss),
      ),
      el('td', { className: 'archiv-col-datum' },
        el('span', {
          className: `archiv-datum ${isUndated ? 'archiv-datum--undated' : ''}`,
          dataset: isUndated ? { tip: 'Ohne Datumsangabe in der Quelle' } : {},
        }, displayDate)
      ),
      el('td', { className: 'archiv-col-links' },
        item.isKonvolut ? null : buildErschliessung(store, r),
      ),
      el('td', { className: 'archiv-col-korb' },
        !item.isKonvolut ? buildKorbBtn(recordId, onKorbToggled) : null,
      ),
    );
    tbody.appendChild(tr);

    // Inline detail expansion
    if (expandedRecord === recordId) {
      const detailTr = el('tr', { className: 'archiv-row--detail' });
      const detailTd = el('td', { colspan: '6' });
      detailTd.appendChild(buildInlineDetail(r, store, {
        onClose: () => { expandedRecord = null; renderRows(currentItems); },
      }));
      detailTr.appendChild(detailTd);
      tbody.appendChild(detailTr);
    }
  }
}

/** Hint that tells apart children sharing the collective title of their
 *  Konvolut. The dot names the family the hint was read from, the tooltip the
 *  inherited title. */
function folioHintEl(record, item) {
  const hint = getFolioHint(store, record, item.konvolutId);
  if (!hint) return null;
  const collective = store.konvolutMeta.get(item.konvolutId)?.title || '';
  return el('span', {
    className: 'archiv-folio-hint',
    dataset: collective ? { tip: `Sammeltitel: ${collective}` } : {},
  },
    el('span', {
      className: `ersch-dot ersch-dot--on ersch-dot--${hint.family}`, 'aria-hidden': 'true',
    }),
    hint.name);
}

/** Opening a Konvolut is a reading state; it survives no reload and appears in
 *  no URL. */
function toggleKonvolut(konvolutId) {
  if (openKonvolute.has(konvolutId)) openKonvolute.delete(konvolutId);
  else openKonvolute.add(konvolutId);
  updateBestandView();
}

/** Only when the same record is expanded does its second Korb control need to
 *  follow, which takes a full rebuild. */
function onKorbToggled(recordId) {
  if (expandedRecord === recordId) renderRows(currentItems);
}

function toggleRecordInline(recordId) {
  expandedRecord = expandedRecord === recordId ? null : recordId;
  renderRows(currentItems);
}

/** Programmatically expand a record's inline detail (used by cross-navigation). */
export function expandRecord(recordId) {
  if (!recordId || !store) return;
  expandedRecord = recordId;
  // A deep link or a jump from another view must not land in a closed Konvolut,
  // so the head holding the record opens with it.
  const konvolutId = konvolutIdOfRecord(store, recordId);
  if (konvolutId) openKonvolute.add(konvolutId);
  updateBestandView();
  // Scroll to the expanded row
  requestAnimationFrame(() => {
    const row = document.querySelector('.archiv-row--detail');
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

/** Navigate to a record in the Bestand view (used by Klick im Korb). */
export function selectArchivRecord(recordId) {
  if (!recordId || !store) return;
  expandRecord(recordId);
}
