/**
 * M³GIM Archiv Bestand View — Tektonik: Fonds → Konvolute → Objekte.
 * Uses inline expansion instead of sidebar for record details.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur, formatChildSignatur, getDocTypeId, countLinks, truncate, ensureArray, dftLabel, glossOf } from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { primaryYear } from '../data/loader.js';
import { bookmarkIcon, CONTENT_FAMILIES } from '../data/constants.js';
import { buildInlineDetail, partitionRecord } from './archive-inline-detail.js';
import { filterBySharedState, isSharedFiltered, searchMatchBestand, sharedFacetsActive } from './_archive-filter.js';
import { toggleKorb, isInKorb } from '../ui/basket.js';
import { buildFacetSidebar } from './_facet-sidebar.js';
import { viewShell } from '../ui/sidebar.js';
import { onViewNavigate } from '../ui/events.js';
import { logStamp } from '../utils/env.js';
import { getFilter, setFilter, applyViewDefault } from '../ui/filter-state.js';
import { recordsFor } from '../data/records-for.js';
import { applySchaerfeEng, applyZeitfenster } from '../ui/filter-sync.js';

let store = null;
let container = null;
let sidebar = null;
let expandedRecord = null; // only one at a time
let currentItems = []; // kept in sync so closures never go stale
let sortDir = 1; // 1 = ascending, -1 = descending
let currentSortKey = 'signatur';
let lastResult = null;  // recordsFor result of the current cut (Sidebar-Status)

// Posters and sound carriers are out of the research focus on written records
// (design.md § Tab-Architektur). The exclusion holds in the fein scope only;
// the gesamt scope leaves nothing unreachable (E-157).
const EXCLUDED_DFT = new Set(['poster', 'soundCarrier']);

/** Scope rule on a document type id, the single place the exclusion lives. */
function dftOutOfScope(dft, gesamt) {
  return !gesamt && EXCLUDED_DFT.has(dft);
}

/**
 * Whether a record falls out of the current scope (E-157).
 * @param {object} record
 * @param {boolean} gesamt
 * @returns {boolean}
 */
export function isOutOfScope(record, gesamt) {
  return dftOutOfScope(getDocTypeId(record), gesamt);
}

/**
 * Content families of a record in CONTENT_FAMILIES order, from the same
 * partition the inline detail renders. DOM-free so the typed display of the
 * table stays testable.
 * @param {object} record
 * @param {object} store
 * @returns {Array<{key: string, label: string, count: number}>}
 */
export function familiesForRecord(record, store) {
  const p = partitionRecord(record, store);
  // Same de-duplication as eventChipEls: a location already carried by an event
  // is not counted twice.
  const eventPlaces = new Set(p.events.map(e => (e.place || '').toLowerCase()));
  const extraLocations = p.locations.filter(loc =>
    !eventPlaces.has(String(loc.name || loc['skos:prefLabel'] || '').toLowerCase()));
  const counts = {
    person: p.bucket.produktion.length + p.bucket.mitwirkende.length
      + p.bucket.erwaehnt.length + p.bucket.weitere.length,
    rolle: p.works.length + p.performanceRoles.length,
    ort: p.performances.length + p.events.length + p.eventDatings.length + extraLocations.length,
    datum: p.mentionedDatings.length,
    beziehung: p.agentRelations.length,
    finanz: p.finances.length,
  };
  return CONTENT_FAMILIES.map(f => ({ key: f.key, label: f.label, count: counts[f.key] }));
}

/** The Bestand is a record-centred view and therefore intrinsically weit. */
const VIEW_DEFAULTS = { schaerfe: 'weit' };

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
  sidebar = buildFacetSidebar(store, {
    facets: ['docType', 'person', 'ort', 'werk', 'rolle'],
    yearSpan: yearBounds(store),
    getResult: () => lastResult,
    showSearch: true,
    scope: { counts: () => scopeCounts() },
    onChange: () => updateBestandView(),
  });
  container.appendChild(viewShell(sidebar.element, main));
  updateBestandView();

  // Cross-navigation: Indizes "Alle im Archiv anzeigen", Korb-Klick,
  // Chip-Klick aus Inline-Detail (applyArchivFilter) oder Chronik-Punkt.
  onViewNavigate('bestand', (detail) => {
    const { type, name, recordId, filter } = detail || {};
    if (type === 'personen' && name) addSharedFacet('person', name);
    if (filter && filter.value) addSharedFacet(filter.facet, filter.value);
    if (recordId) expandRecord(recordId);
  });
}

/** Cross-navigation facets write into the shared state. `facet` still arrives
 *  in the former toolbar naming (person/location/werk); location -> ort. */
function addSharedFacet(facet, value) {
  const key = facet === 'location' ? 'ort' : facet;
  if (!['person', 'ort', 'werk', 'rolle', 'institution', 'docType'].includes(key)) return;
  const values = Array.isArray(value) ? value : [value];
  const current = facetOf(key);
  const merged = [...current];
  for (const v of values) if (v && !merged.includes(v)) merged.push(v);
  setFilter({ [key]: merged });
}

function facetOf(key) {
  const f = getFilter();
  return Array.isArray(f[key]) ? f[key] : [];
}

/** Counts behind the sidebar scope switch (E-116/E-157): how many units the
 *  current non-scope cut carries in either scope. Counts top-level units
 *  (Konvolute plus standalone records), not Folios. */
function scopeCounts() {
  const feinItems = getOrderedItems(false).filter(i => !i.isChild);
  const gesamtItems = getOrderedItems(true).filter(i => !i.isChild);
  return { fein: feinItems.length, gesamt: gesamtItems.length };
}

/** Year span of the holdings, for the sidebar time slider. */
function yearBounds(store) {
  let min = Infinity, max = -Infinity;
  if (store && store.byYear) {
    for (const y of store.byYear.keys()) {
      if (y < min) min = y;
      if (y > max) max = y;
    }
  }
  return { min: min === Infinity ? 1919 : min, max: max === -Infinity ? 2009 : max };
}

/**
 * Re-render rows; reads the whole cut from the shared filter state.
 */
function updateBestandView() {
  const shared = getFilter();
  const gesamt = shared.scope === 'gesamt';
  // Shared facets, Zeitfenster or the enge Schaerfe flatten the hierarchy: they
  // cut children away, and an emptied Konvolut head must not stay behind.
  const sharedActive = Array.isArray(shared.zeitfenster) || shared.schaerfe === 'eng'
    || isSharedFiltered(shared) || sharedFacetsActive(shared);
  const isFiltered = sharedActive;
  let items = getOrderedItems(gesamt);

  // When filtering, flatten: remove Konvolut headers, keep children flagged so
  // renderRows still resolves their real doc-type badge (nicht Standalone).
  if (isFiltered) {
    items = flattenForFilter(items);
  }

  // Every entity and shared facet plus full text and document type resolves
  // through recordsFor, the single place in the frontend. Bestand items are
  // wrapped, so getRecord unwraps them.
  items = filterBySharedState(store, items, shared, {
    getRecord: (item) => item.record,
    searchMatch: (record, q) => searchMatchBestand(record, q, store),
  });

  // Zeitfenster and Schaerfegrad act on top as plain item filters.
  const getRecord = (item) => item.record;
  items = applyZeitfenster(items, shared.zeitfenster, getRecord, store);
  if (shared.schaerfe === 'eng') {
    items = applySchaerfeEng(items, store, getRecord).items;
  }

  // Under an active filter the hierarchy is already dissolved, so sort flat.
  // In the structural view Konvolute keep their Signatur order and only their
  // children are sorted within the Konvolut, which preserves archival order.
  if (isFiltered) {
    items.sort((a, b) => sortFn(store, a.record, b.record, currentSortKey) * sortDir);
  } else if (currentSortKey !== 'signatur' || sortDir !== 1) {
    items = sortChildrenWithinKonvolute(items);
  }

  renderRows(items);

  const recordItems = items.filter(i => !i.isKonvolut);
  const recordCount = recordItems.length;
  const konvolutCount = items.filter(i => i.isKonvolut).length;
  const unerschlossenCount = recordItems.filter(
    i => store.unprocessedIds.has(i.record['@id'])).length;

  // Sidebar status from the visible record items: the weite set is what is on
  // screen, the enge one its spatio-temporally attested subset.
  const visibleIds = new Set(recordItems.map(i => i.record['@id']));
  lastResult = recordsFor(store, {}, { base: visibleIds });
  if (sidebar) sidebar.update();

  // Compact state stamp for Playwright and manual debugging.
  logStamp('bestand', [
    ['konvolute', konvolutCount],
    ['records', recordCount],
    ['sort', `${currentSortKey}${sortDir === -1 ? '-desc' : ''}`],
    ['gefiltert', isFiltered ? 'ja' : ''],
    ['erschliessung', gesamt ? 'alle' : 'erschlossen'],
    ['nicht-erschlossen', gesamt ? unerschlossenCount : ''],
  ]);

  return recordCount;
}

function buildTable() {
  const table = el('table', { className: 'archiv-table' });

  const columns = [
    { key: 'signatur', label: 'Signatur', className: 'archiv-col-signatur', title: 'Sortieren nach Signatur' },
    { key: 'titel', label: 'Titel', className: 'archiv-col-titel', title: 'Sortieren nach Titel' },
    { key: 'typ', label: 'Typ', className: 'archiv-col-typ', title: 'Sortieren nach Dokumenttyp' },
    { key: 'datum', label: 'Datum', className: 'archiv-col-datum', title: 'Sortieren nach Datum' },
    // The column shows the typed Erschliessungsanzeige (E-158); the sort key
    // stays the link count, which is what the dots aggregate.
    { key: 'links', label: 'Erschließung', className: 'archiv-col-links', title: 'Erschlossene Inhaltstypen; Sortierung nach Zahl der Verknüpfungen' },
  ];

  const headerRow = el('tr');
  for (const col of columns) {
    const isActive = currentSortKey === col.key;
    const arrow = isActive ? (sortDir === 1 ? ' \u25B2' : ' \u25BC') : '';
    const th = el('th', {
      className: `${col.className} archiv-th--sortable ${isActive ? 'archiv-th--active' : ''}`,
      title: col.title,
      onClick: () => {
        if (currentSortKey === col.key) {
          sortDir *= -1;
        } else {
          currentSortKey = col.key;
          sortDir = col.key === 'links' ? -1 : 1; // Links default descending
        }
        updateHeaderIndicators(headerRow, columns);
        updateBestandView();
      },
    }, col.label + arrow);
    headerRow.appendChild(th);
  }
  // Korb sits in its own narrow column so the bookmark is not read as part of
  // the Erschliessungsanzeige (E-158). Not sortable, label lives in the title.
  headerRow.appendChild(el('th', { className: 'archiv-col-korb', title: 'Wissenskorb' }));

  const thead = el('thead', {}, headerRow);
  table.appendChild(thead);
  const tbody = el('tbody');
  tbody.id = 'bestand-tbody';
  table.appendChild(tbody);
  return table;
}

function updateHeaderIndicators(headerRow, columns) {
  const ths = headerRow.querySelectorAll('th');
  columns.forEach((col, i) => {
    const th = ths[i];
    const isActive = currentSortKey === col.key;
    const arrow = isActive ? (sortDir === 1 ? ' \u25B2' : ' \u25BC') : '';
    th.textContent = col.label + arrow;
    th.classList.toggle('archiv-th--active', isActive);
  });
}

function getOrderedItems(showAll = false) {
  const items = [];
  const childIds = new Set();
  for (const children of store.konvolutChildren.values()) {
    for (const cid of children) childIds.add(cid);
  }

  // Standalone records (not children of any Konvolut). The fein scope keeps the
  // processed ones only; gesamt adds the unprocessed plus posters and sound
  // carriers (E-116/E-157).
  const standalone = store.allRecords.filter(r =>
    !childIds.has(r['@id'])
    && (showAll || !store.unprocessedIds.has(r['@id']))
    && !isOutOfScope(r, showAll)
  );

  // Merge standalone records + Konvolut RecordSets into one sorted list
  const topEntries = [];
  for (const record of standalone) {
    topEntries.push({ sig: record['rico:identifier'] || '', record, type: 'record' });
  }
  for (const [kid, konvolut] of store.konvolute) {
    topEntries.push({ sig: konvolut['rico:identifier'] || '', record: konvolut, type: 'konvolut', konvolutId: kid });
  }
  topEntries.sort((a, b) => naturalSort(a.sig, b.sig));

  // Build flat list: Konvolute get their children injected after them. The
  // "processed only" principle also holds inside a Konvolut, and a Konvolut left
  // without children disappears with its head. The gesamt scope shows the
  // unprocessed children and Konvolute too, greyed out in renderRows, so the
  // Erschliessungsstand stays visible instead of hidden. Folios (pure metadata
  // records) stay out in both scopes.
  for (const entry of topEntries) {
    if (entry.type === 'konvolut') {
      const meta = store.konvolutMeta.get(entry.konvolutId);
      if (!showAll && (meta?.totalLinks ?? 0) === 0) continue;  // empty Konvolute drop in the fein scope
      const children = (store.konvolutChildren.get(entry.konvolutId) || [])
        .filter(cid => !store.folioIds.has(cid))
        .filter(cid => showAll || !store.unprocessedIds.has(cid))
        .map(cid => store.records.get(cid))
        .filter(Boolean)
        .sort((a, b) => naturalSort(a['rico:identifier'] || '', b['rico:identifier'] || ''));
      if (children.length === 0) continue;  // nothing displayable left
      items.push({
        record: entry.record,
        isKonvolut: true,
        konvolutId: entry.konvolutId,
        visibleChildCount: children.length,
        linkedChildCount: children.filter(c => countLinks(c) > 0).length,
      });
      for (const child of children) {
        items.push({ record: child, isChild: true, konvolutId: entry.konvolutId });
      }
    } else {
      items.push({ record: entry.record });
    }
  }

  return items;
}

function sortFn(store, a, b, sort) {
  switch (sort) {
    case 'titel': {
      const ta = (a['rico:title'] || '').toLowerCase();
      const tb = (b['rico:title'] || '').toLowerCase();
      return ta.localeCompare(tb, 'de');
    }
    case 'datum': {
      const ya = primaryYear(store, a).year ?? 9999;
      const yb = primaryYear(store, b).year ?? 9999;
      return ya - yb;
    }
    case 'typ': {
      const ta = getDocTypeId(a) || 'zzz';
      const tb = getDocTypeId(b) || 'zzz';
      return ta.localeCompare(tb, 'de-DE');
    }
    case 'links':
      return countLinks(b) - countLinks(a);
    default:
      return naturalSort(a['rico:identifier'] || '', b['rico:identifier'] || '');
  }
}

/**
 * Undated marker of a row. Pure so the time anchor stays testable. The marker
 * hangs on `rico:date` alone; without that carrier every record counts as
 * undated. Konvolut heads never carry it, their span comes from konvolutMeta.
 * @param {{record: object, isKonvolut?: boolean}} item
 * @returns {boolean}
 */
export function isUndatedItem(item) {
  return !item.isKonvolut && !item.record['rico:date'];
}

/** Document type badge of a row, built from the DOM-free badge decision. */
function buildDocTypeBadge(item, record, docType, docLabel, docGloss, childCount) {
  const kind = badgeKindForItem(item, record, docLabel, isStandaloneKonvolut);
  switch (kind) {
    case 'konvolut-struct':
      return item.isKonvolut
        ? el('span', { className: 'badge badge--konvolut-struct', dataset: { tip: `Enthält ${childCount} Objekte` } }, `Konvolut (${childCount})`)
        : el('span', { className: 'badge badge--konvolut-struct', dataset: { tip: 'Noch nicht in Einzelobjekte aufgelöst' } }, 'Konvolut');
    case 'standalone-konvolut':
      return el('span', { className: 'badge badge--konvolut-struct', dataset: { tip: 'Noch nicht in Einzelobjekte aufgelöst' } }, 'Konvolut');
    case 'doctype':
      return el('span', { className: `badge badge--${docType || ''}${docGloss ? ' badge--glossed' : ''}`, title: docGloss }, docLabel);
    default:
      return el('span', { className: 'badge badge--unclassified' }, 'Nicht klassifiziert');
  }
}

function renderRows(items) {
  currentItems = items;
  const tbody = document.getElementById('bestand-tbody');
  if (!tbody) return;
  clear(tbody);
  const gesamt = getFilter().scope === 'gesamt';

  for (const item of items) {
    const r = item.record;
    const sig = formatSignatur(r['rico:identifier']);
    const docType = getDocTypeId(r);
    const docLabel = dftLabel(store, docType) || '';
    const docGloss = glossOf(store, docType);
    const recordId = r['@id'];

    let rowClass = '';
    if (item.isKonvolut) rowClass = 'archiv-row--konvolut';
    else if (item.isChild) rowClass = 'archiv-row--child';

    // "nicht erschlossen" means no Verknuepfungen. Only reachable in the gesamt
    // scope (E-116), where the row is greyed out. A Konvolut head counts as
    // unprocessed when its whole link balance is zero.
    const unerschlossen = item.isKonvolut
      ? ((store.konvolutMeta.get(item.konvolutId)?.totalLinks ?? 0) === 0)
      : store.unprocessedIds.has(recordId);
    if (unerschlossen) rowClass += ' archiv-row--unerschlossen';

    if (expandedRecord === recordId) rowClass += ' archiv-row--active';

    const meta = item.isKonvolut ? store.konvolutMeta.get(item.konvolutId) : null;
    // The badge counts the visible children, not the raw meta.childCount, or it
    // drifts against the rows actually rendered.
    const childCount = item.visibleChildCount ?? (meta ? meta.childCount : 0);

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

    // Date: Konvolute show date range from children, Records show formatted date
    const displayDate = item.isKonvolut
      ? (meta?.dateDisplay || '')
      : (formatDate(r['rico:date']) || 'o.\u2009D.');
    const isUndated = isUndatedItem(item);

    const trProps = { className: rowClass };
    // Konvolut heads are permanent group heads (E-158); the record detail is the
    // only collapse left in the table.
    if (!item.isKonvolut) trProps.onClick = () => toggleRecordInline(recordId);
    // The datasets stay, the DOM verification tool reads the hierarchy from them.
    if (item.isKonvolut) trProps.dataset = { konvolutHeader: item.konvolutId };
    else if (item.isChild) trProps.dataset = { konvolutChild: item.konvolutId };
    const tr = el('tr', trProps,
      el('td', { className: 'archiv-col-signatur' },
        el('span', { className: 'archiv-signatur' }, displaySig)
      ),
      el('td', { className: 'archiv-col-titel' },
        el('span', {
          className: 'archiv-titel',
          dataset: displayTitle.length > 80 ? { tip: displayTitle, tipWrap: '', tipPos: 'bottom-left' } : {},
        }, truncate(displayTitle, 80)),
        item.isChild ? (() => {
          const hint = getFolioHint(r, item.konvolutId);
          return hint ? el('span', { className: 'archiv-folio-hint' }, hint) : null;
        })() : null,
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
        item.isKonvolut ? buildKonvolutChips(meta, gesamt) : null,
      ),
      el('td', { className: 'archiv-col-typ' },
        buildDocTypeBadge(item, r, docType, docLabel, docGloss, childCount),
        (!item.isKonvolut && unerschlossen)
          ? el('span', {
              className: 'badge badge--unerschlossen',
              dataset: { tip: 'Im Bestand vorhanden, aber noch nicht erschlossen (keine Verkn\u00fcpfungen).' },
            }, 'nicht erschlossen')
          : null,
      ),
      el('td', { className: 'archiv-col-datum' },
        el('span', {
          className: `archiv-datum ${isUndated ? 'archiv-datum--undated' : ''}`,
          dataset: isUndated ? { tip: 'Ohne Datumsangabe in der Quelle' } : {},
        }, displayDate)
      ),
      el('td', { className: 'archiv-col-links' },
        item.isKonvolut ? buildKonvolutErschliessung(item) : buildErschliessung(r),
      ),
      el('td', { className: 'archiv-col-korb' },
        !item.isKonvolut ? buildBookmarkBtn(recordId) : null,
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

function toggleRecordInline(recordId) {
  expandedRecord = expandedRecord === recordId ? null : recordId;
  renderRows(currentItems);
}

/**
 * Typed Erschliessungsanzeige of a record row: one dot per content family,
 * filled or empty. The family colours are the ones the inline detail carries on
 * its block titles, so the legend arises from proximity rather than from text
 * (E-158). The breakdown lives in the tooltip.
 */
function buildErschliessung(record) {
  const families = familiesForRecord(record, store);
  const belegt = families.filter(f => f.count > 0);
  const tip = belegt.length
    ? belegt.map(f => `${f.label} ${f.count}`).join(' · ')
    : 'keine Verknüpfungen';
  return el('span', { className: 'archiv-ersch', dataset: { tip, tipWrap: '' } },
    ...families.map(f => el('span', {
      className: `ersch-dot ersch-dot--${f.key} ${f.count > 0 ? 'ersch-dot--on' : 'ersch-dot--off'}`,
    })));
}

/** Konvolut head: how many of the visible children carry Verknuepfungen. */
function buildKonvolutErschliessung(item) {
  return el('span', {
    className: 'archiv-ersch archiv-ersch--konvolut',
    dataset: { tip: buildKonvolutTooltip(item.konvolutId), tipWrap: '' },
  }, `${item.linkedChildCount ?? 0} von ${item.visibleChildCount ?? 0}`);
}

/**
 * Meta chips under the Konvolut title: top three document types plus status mix,
 * read from store.konvolutMeta.
 */
function buildKonvolutChips(meta, gesamt) {
  if (!meta) return null;
  const chips = [];

  // Posters and sound carriers only appear in the gesamt scope, otherwise the
  // chips drift against the rows. Beyond three types a "+N weitere" chip follows.
  if (meta.docTypeCounts && meta.docTypeCounts.size > 0) {
    const all = [...meta.docTypeCounts.entries()]
      .filter(([dft]) => !dftOutOfScope(dft, gesamt))
      .sort((a, b) => b[1] - a[1]);
    const top = all.slice(0, 3);
    for (const [dft, count] of top) {
      const label = dftLabel(store, dft);
      chips.push(el('span', {
        className: 'chip chip--compact',
        dataset: { tip: `${count}\u00d7 ${label}` },
      }, `${count}\u00d7\u00a0${label}`));
    }
    const restTypes = all.slice(3);
    if (restTypes.length > 0) {
      const restCount = restTypes.reduce((sum, [, c]) => sum + c, 0);
      const tipLines = restTypes
        .map(([dft, c]) => `${c}\u00d7 ${dftLabel(store, dft)}`)
        .join(' \u00b7 ');
      chips.push(el('span', {
        className: 'chip chip--compact chip--rest',
        dataset: { tip: tipLines },
      }, `+${restCount}\u00a0weitere`));
    }
  }

  // Status mix as a quiet subtitle.
  const statusParts = [];
  if (meta.statusCounts && meta.statusCounts.size > 0) {
    const ordered = ['abgeschlossen', 'begonnen', 'zurueckgestellt'];
    for (const st of ordered) {
      const n = meta.statusCounts.get(st);
      if (n) statusParts.push(`${n}\u00a0${st}`);
    }
  }

  const container = el('span', { className: 'archiv-konvolut-meta' },
    ...chips,
    statusParts.length
      ? el('span', { className: 'archiv-konvolut-status' },
          statusParts.join(' \u00b7 '))
      : null,
  );
  return container;
}

function naturalSort(a, b) {
  return a.localeCompare(b, 'de-DE', { numeric: true, sensitivity: 'base' });
}

/**
 * Sorts children within each Konvolut, leaving heads and standalone records in
 * place, so sorting never tears the archival hierarchy apart.
 */
function sortChildrenWithinKonvolute(items) {
  const result = [];
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    if (!item.isKonvolut) {
      result.push(item);
      i++;
      continue;
    }
    result.push(item);
    i++;
    // Collect the children that follow this head.
    const children = [];
    while (i < items.length && items[i].isChild && items[i].konvolutId === item.konvolutId) {
      children.push(items[i]);
      i++;
    }
    children.sort((a, b) => sortFn(store, a.record, b.record, currentSortKey) * sortDir);
    result.push(...children);
  }
  return result;
}

/** Top-level Hauptbestand records are archival units (Konvolute), not single items.
 *  Plakate (NIM/PL_) and Tonträger (NIM_TT_) are actual single items. */
function isStandaloneKonvolut(record) {
  const sig = record['rico:identifier'] || '';
  if (sig.includes('/PL_') || sig.includes('_TT_')) return false;
  return true;
}

/**
 * Flattens the hierarchy for the filtered mode: Konvolut heads drop out, child
 * rows keep their `isChild`/`konvolutId` marks. Without the marks renderRows
 * treats children as standalone records and the Konvolut badge displaces their
 * real document type. Pure, so the badge decision stays testable.
 * @param {Array<{isKonvolut?:boolean, isChild?:boolean}>} items
 * @returns {Array}
 */
export function flattenForFilter(items) {
  return items
    .filter(item => !item.isKonvolut)
    .map(item => item.isChild ? { ...item, flattened: true } : item);
}

/**
 * Which badge a row carries, decided from the item alone so the rule is testable
 * without a DOM.
 *   - konvolut-struct     : Konvolut head
 *   - doctype             : real document type badge
 *   - unclassified        : child without a type, or typed 'konvolut'
 *   - standalone-konvolut : top-level collective row not yet resolved
 * @param {{isKonvolut?:boolean, isChild?:boolean}} item
 * @param {object} record
 * @param {string} docLabel
 * @param {(r:object)=>boolean} isStandalone
 * @returns {'konvolut-struct'|'doctype'|'unclassified'|'standalone-konvolut'}
 */
export function badgeKindForItem(item, record, docLabel, isStandalone) {
  if (item.isKonvolut) return 'konvolut-struct';
  if (item.isChild) {
    return (docLabel && getDocTypeId(record) !== 'konvolut') ? 'doctype' : 'unclassified';
  }
  if (isStandalone(record)) return 'standalone-konvolut';
  return docLabel ? 'doctype' : 'unclassified';
}

/**
 * For child records with duplicate titles within a Konvolut,
 * return a short distinguishing hint from the first verknüpfung.
 */
function getFolioHint(record, konvolutId) {
  if (!konvolutId) return null;
  const siblings = (store.konvolutChildren.get(konvolutId) || [])
    .filter(cid => !store.folioIds.has(cid))
    .map(cid => store.records.get(cid))
    .filter(Boolean);

  const title = record['rico:title'] || '';
  const dupes = siblings.filter(s => (s['rico:title'] || '') === title);
  if (dupes.length <= 1) return null;

  // Try agents, then mentioned persons (in subjects), then locations
  const agents = ensureArray(record['m3gim-ontology:hasAssociatedAgent']);
  if (agents.length > 0) {
    const name = agents[0].name || agents[0]['skos:prefLabel'] || '';
    if (name) return name;
  }
  const mentionedPersons = ensureArray(record['rico:hasOrHadSubject'])
    .filter(s => s['@type'] === 'rico:Person');
  if (mentionedPersons.length > 0) {
    const name = mentionedPersons[0].name || mentionedPersons[0]['skos:prefLabel'] || '';
    if (name) return name;
  }
  const locs = ensureArray(record['rico:hasOrHadLocation']);
  if (locs.length > 0) {
    const name = locs[0].name || locs[0]['skos:prefLabel'] || '';
    if (name) return name;
  }
  return null;
}

function buildKonvolutTooltip(konvolutId) {
  const childIds = (store.konvolutChildren.get(konvolutId) || []).filter(cid => !store.folioIds.has(cid));
  const agentCounts = new Map();
  const locationCounts = new Map();

  for (const cid of childIds) {
    const child = store.records.get(cid);
    if (!child) continue;
    for (const agent of ensureArray(child['m3gim-ontology:hasAssociatedAgent'])) {
      const name = agent.name || agent['skos:prefLabel'] || '';
      if (name) agentCounts.set(name, (agentCounts.get(name) || 0) + 1);
    }
    for (const loc of ensureArray(child['rico:hasOrHadLocation'])) {
      const name = loc.name || loc['skos:prefLabel'] || '';
      if (name && !/^\d{4}/.test(name)) locationCounts.set(name, (locationCounts.get(name) || 0) + 1);
    }
  }

  const parts = [];
  if (agentCounts.size > 0) {
    const top = [...agentCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
    parts.push(`Personen: ${top.join(', ')}`);
  }
  if (locationCounts.size > 0) {
    const top = [...locationCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);
    parts.push(`Orte: ${top.join(', ')}`);
  }
  return parts.join('\n');
}

function buildBookmarkBtn(recordId) {
  const active = isInKorb(recordId);
  return el('button', {
    className: `bookmark-btn ${active ? 'bookmark-btn--active' : ''}`,
    title: active ? 'Aus Wissenskorb entfernen' : 'Zum Wissenskorb hinzuf\u00fcgen',
    html: bookmarkIcon(14, active),
    onClick: (e) => {
      e.stopPropagation();
      toggleKorb(recordId);
      // Update the button in place instead of redrawing the whole table.
      const btn = e.currentTarget;
      const nowActive = isInKorb(recordId);
      btn.classList.toggle('bookmark-btn--active', nowActive);
      btn.title = nowActive ? 'Aus Wissenskorb entfernen' : 'Zum Wissenskorb hinzuf\u00fcgen';
      btn.innerHTML = bookmarkIcon(14, nowActive);
      // Only when the same record is expanded does its second Korb control need
      // to follow, which takes a full rebuild.
      if (expandedRecord === recordId) renderRows(currentItems);
    },
  });
}

/** Programmatically expand a record's inline detail (used by cross-navigation). */
export function expandRecord(recordId) {
  if (!recordId || !store) return;
  expandedRecord = recordId;
  renderRows(currentItems);
  // Scroll to the expanded row
  requestAnimationFrame(() => {
    const row = document.querySelector('.archiv-row--detail');
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

/** Navigate to a record in the Bestand view (used by Korb-Bookmark-Klick). */
export function selectArchivRecord(recordId) {
  if (!recordId || !store) return;
  expandRecord(recordId);
}
