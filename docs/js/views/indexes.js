/**
 * M³GIM Indizes View — 4 compact grids showing Personen, Organisationen, Orte, Werke.
 * Supports cross-grid faceted filtering via activeFilter state.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur, getDocTypeId, truncate } from '../utils/format.js';
import { DOKUMENTTYP_LABELS, WIKIDATA_ICON_SVG, AGRELON_LABELS, bookmarkIcon } from '../data/constants.js';
import { selectRecord, navigateToView } from '../ui/router.js';
import { toggleKorb, isInKorb } from '../ui/basket.js';
import { logStamp } from '../utils/env.js';
import { buildToolbar } from './_toolbar.js';

let store = null;
let container = null;

/** Max records shown in expanded detail before "show all" link */
const DETAIL_LIMIT = 10;

// Per-grid state (Sort + Expanded). Suchterm und Wikidata-Filter sind
// global (Toolbar-Facetten, E-91).
const gridState = {
  personen:       { sort: 'count', dir: -1, expanded: null },
  organisationen: { sort: 'count', dir: -1, expanded: null },
  orte:           { sort: 'count', dir: -1, expanded: null },
  werke:          { sort: 'count', dir: -1, expanded: null },
};

/** Globaler Toolbar-State: Suche und Wikidata-Toggle. */
let toolbarState = { q: '', withWikidata: false };
let indizesToolbar = null;

/** Cross-grid facet filter: { gridKey, name, recordIds: Set<string> } | null */
let activeFilter = null;

// Memoisierte Entry-Listen pro Grid. getEntries() materialisiert je Aufruf
// die volle Liste aus der Store-Map; der Datenstand aendert sich aber nie nach
// dem Load. Cache wird in renderIndizes (Store-Wechsel) zurueckgesetzt.
const entriesCache = new Map();

function getGridEntries(gridKey, config) {
  let cached = entriesCache.get(gridKey);
  if (!cached) {
    cached = config.getEntries(store);
    entriesCache.set(gridKey, cached);
  }
  return cached;
}

const GRID_CONFIG = {
  personen: {
    label: 'Personen',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    getEntries: (s) => [...s.persons.entries()]
      .filter(([, data]) => data.records.size > 0)
      .map(([name, data]) => ({
        name, count: data.records.size, kategorie: data.kategorie, wikidata: data.wikidata, records: data.records,
        occupation: data.occupation || null, voiceType: data.voiceType || null,
        birthDate: data.birthDate || null, deathDate: data.deathDate || null,
      })),
    columns: [
      { key: 'name', label: 'Name', flex: 1 },
      { key: 'kategorie', label: 'Kategorie', width: '100px' },
      { key: 'count', label: 'Dok.', width: '50px', align: 'right' },
    ],
    renderCell: (entry, col) => {
      if (col.key === 'name') return renderNameCell(entry);
      if (col.key === 'kategorie') return renderKategorieCell(entry);
      if (col.key === 'count') return el('span', { className: 'idx-count' }, String(entry.count));
      return el('span');
    },
    searchFields: (e) => [e.name, e.kategorie].filter(Boolean).join(' '),
  },
  organisationen: {
    label: 'Organisationen',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>',
    getEntries: (s) => [...s.organizations.entries()]
      .filter(([, data]) => data.records.size > 0)
      .map(([name, data]) => ({
        name, count: data.records.size, wikidata: data.wikidata, records: data.records,
      })),
    columns: [
      { key: 'name', label: 'Name', flex: 1 },
      { key: 'count', label: 'Dok.', width: '50px', align: 'right' },
    ],
    renderCell: (entry, col) => {
      if (col.key === 'name') return renderNameCell(entry);
      if (col.key === 'count') return el('span', { className: 'idx-count' }, String(entry.count));
      return el('span');
    },
    searchFields: (e) => e.name,
  },
  orte: {
    label: 'Orte',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    getEntries: (s) => [...s.locations.entries()]
      .filter(([, data]) => data.records.size > 0)
      .map(([name, data]) => ({
        name, count: data.records.size, wikidata: data.wikidata, records: data.records,
      })),
    columns: [
      { key: 'name', label: 'Name', flex: 1 },
      { key: 'count', label: 'Dok.', width: '50px', align: 'right' },
    ],
    renderCell: (entry, col) => {
      if (col.key === 'name') return renderNameCell(entry);
      if (col.key === 'count') return el('span', { className: 'idx-count' }, String(entry.count));
      return el('span');
    },
    searchFields: (e) => e.name,
  },
  werke: {
    label: 'Werke',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    getEntries: (s) => [...s.works.entries()]
      .filter(([, data]) => data.records.size > 0)
      .map(([name, data]) => ({
        name, count: data.records.size, komponist: data.komponist || '', wikidata: data.wikidata, records: data.records,
      })),
    columns: [
      { key: 'name', label: 'Werk', flex: 1 },
      { key: 'komponist', label: 'Komponist', width: '120px' },
      { key: 'count', label: 'Dok.', width: '50px', align: 'right' },
    ],
    renderCell: (entry, col) => {
      if (col.key === 'name') return renderNameCell(entry);
      if (col.key === 'komponist') return el('span', { className: 'idx-komponist' }, entry.komponist);
      if (col.key === 'count') return el('span', { className: 'idx-count' }, String(entry.count));
      return el('span');
    },
    searchFields: (e) => [e.name, e.komponist].filter(Boolean).join(' '),
  },
};

/**
 * Expand a specific entry in a grid (called from router navigation).
 */
export function expandEntry(gridType, entityName) {
  if (!gridState[gridType]) return;
  gridState[gridType].expanded = entityName;

  // Also set facet filter for cross-grid filtering
  const config = GRID_CONFIG[gridType];
  if (config) {
    const entries = getGridEntries(gridType, config);
    const entry = entries.find(e => e.name === entityName);
    if (entry) {
      activeFilter = { gridKey: gridType, name: entityName, recordIds: entry.records };
    }
  }

  // Re-render if grids are already in DOM
  const wrapper = container?.querySelector('.idx-page');
  if (wrapper) renderAllGrids(wrapper);

  // Scroll to expanded entry after render
  requestAnimationFrame(() => {
    const expanded = document.querySelector('.idx-row--expanded');
    if (expanded) expanded.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

export function renderIndizes(storeRef, containerEl) {
  store = storeRef;
  container = containerEl;
  entriesCache.clear();  // Store kann sich geaendert haben -> Memo invalidieren
  clear(container);

  const wrapper = el('div', { className: 'idx-page' });

  // Globale Toolbar ueber die generische buildToolbar-Komponente (E-91).
  // Facetten: Suche (alle 4 Grids), Nur-mit-Wikidata-Toggle.
  indizesToolbar = buildToolbar(store, {
    initial: toolbarState,
    className: 'archiv-toolbar',
    showCount: false,
    facets: [
      { kind: 'search', key: 'q', placeholder: 'Alle Indizes durchsuchen\u2026' },
      { kind: 'toggle', key: 'withWikidata', label: 'Nur mit Wikidata' },
    ],
    onChange: (s) => {
      toolbarState = s;
      for (const key of Object.keys(gridState)) gridState[key].expanded = null;
      activeFilter = null;
      renderAllGrids(wrapper);
    },
  });
  wrapper.appendChild(indizesToolbar.element);

  // Separater Chip-Container fuer den Cross-Grid-Facet-Filter.
  const chipContainer = el('div', { className: 'idx-facet-chips', id: 'idx-facet-chips' });
  wrapper.appendChild(chipContainer);

  const gridsContainer = el('div', { className: 'idx-grids' });
  wrapper.appendChild(gridsContainer);

  container.appendChild(wrapper);
  renderAllGrids(wrapper);
}

function renderAllGrids(wrapper) {
  const gridsContainer = wrapper.querySelector('.idx-grids');
  if (!gridsContainer) return;
  clear(gridsContainer);

  // Render facet chip
  renderFacetChip(wrapper);

  const stampParts = [];
  const q = (toolbarState.q || '').toLowerCase();
  for (const [gridKey, config] of Object.entries(GRID_CONFIG)) {
    gridsContainer.appendChild(renderGrid(gridKey, config));
    const all = getGridEntries(gridKey, config);
    const total = all.length;
    let visible = all;
    visible = applyFacetFilter(visible, gridKey);
    if (toolbarState.withWikidata) {
      visible = visible.filter(e => e.wikidata && String(e.wikidata).startsWith('wd:'));
    }
    if (q) visible = visible.filter(e => config.searchFields(e).toLowerCase().includes(q));
    stampParts.push([gridKey, `${visible.length}/${total}`]);
  }
  if (activeFilter) stampParts.push(['facet', `${activeFilter.gridKey}=${activeFilter.name}`]);
  if (toolbarState.withWikidata) stampParts.push(['wd-only', 'ja']);
  logStamp('indizes', stampParts);
}

/** Set or clear the cross-grid facet filter */
function setFacetFilter(gridKey, name, recordIds) {
  if (activeFilter && activeFilter.gridKey === gridKey && activeFilter.name === name) {
    activeFilter = null; // toggle off
  } else {
    activeFilter = { gridKey, name, recordIds };
  }
  const wrapper = container?.querySelector('.idx-page');
  if (wrapper) renderAllGrids(wrapper);
}

function clearFacetFilter() {
  activeFilter = null;
  const wrapper = container?.querySelector('.idx-page');
  if (wrapper) renderAllGrids(wrapper);
}

function renderFacetChip(wrapper) {
  const chipContainer = wrapper.querySelector('#idx-facet-chips');
  if (!chipContainer) return;
  clear(chipContainer);
  if (!activeFilter) return;

  const gridLabel = GRID_CONFIG[activeFilter.gridKey]?.label || activeFilter.gridKey;
  const chip = el('div', { className: 'idx-facet-chip' },
    el('span', { className: 'idx-facet-chip__label' }, `${gridLabel}: `),
    el('span', { className: 'idx-facet-chip__name' }, activeFilter.name),
    el('span', { className: 'idx-facet-chip__count' }, `${activeFilter.recordIds.size} Dok.`),
    el('button', {
      className: 'idx-facet-chip__close',
      title: 'Filter entfernen',
      onClick: (e) => { e.stopPropagation(); clearFacetFilter(); },
      html: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    }),
  );
  chipContainer.appendChild(chip);
}

/**
 * Apply facet filter: for grids OTHER than the active filter's grid,
 * only show entries whose records overlap with the filter's recordIds.
 */
function applyFacetFilter(entries, gridKey) {
  if (!activeFilter || activeFilter.gridKey === gridKey) return entries;
  return entries.filter(e => {
    for (const id of e.records) {
      if (activeFilter.recordIds.has(id)) return true;
    }
    return false;
  });
}

function renderGrid(gridKey, config) {
  const state = gridState[gridKey];
  // Kopie der memoisierten Liste -- die Sortierung unten mutiert in-place.
  let entries = getGridEntries(gridKey, config).slice();

  // Apply cross-grid facet filter
  entries = applyFacetFilter(entries, gridKey);

  // Globale Toolbar-Filter (E-91)
  if (toolbarState.withWikidata) {
    entries = entries.filter(e => e.wikidata && String(e.wikidata).startsWith('wd:'));
  }
  const q = (toolbarState.q || '').toLowerCase();
  if (q) {
    entries = entries.filter(e => config.searchFields(e).toLowerCase().includes(q));
  }

  // Sort
  entries.sort((a, b) => {
    const key = state.sort;
    if (key === 'count') return (a.count - b.count) * state.dir;
    const va = (a[key] || '').toLowerCase();
    const vb = (b[key] || '').toLowerCase();
    return va.localeCompare(vb, 'de-DE') * state.dir;
  });

  const isFilterSource = activeFilter && activeFilter.gridKey === gridKey;
  const grid = el('div', { className: `idx-grid ${isFilterSource ? 'idx-grid--filter-source' : ''}` });

  // Header
  const allEntries = getGridEntries(gridKey, config);
  const totalCount = allEntries.length;
  const isFiltered = entries.length < totalCount;
  const countText = isFiltered ? `${entries.length} / ${totalCount}` : `${totalCount}`;

  // Reconciliation progress (count entries with Wikidata ID)
  const wdCount = allEntries.filter(e => e.wikidata && String(e.wikidata).startsWith('wd:')).length;
  const wdPct = totalCount > 0 ? Math.round(wdCount / totalCount * 100) : 0;

  const header = el('div', { className: 'idx-grid__header' },
    el('span', { className: 'idx-grid__icon', html: config.icon }),
    el('span', { className: 'idx-grid__title' }, config.label),
    el('span', { className: 'idx-grid__count' }, countText),
    wdCount > 0
      ? el('span', {
          className: 'idx-grid__wd-status',
          dataset: { tip: `${wdCount} von ${totalCount} mit Wikidata verkn\u00fcpft` },
          html: `${WIKIDATA_ICON_SVG} ${wdPct}\u2009%`,
        })
      : null,
  );
  grid.appendChild(header);

  // Column headers (sortable)
  const colRow = el('div', { className: 'idx-colheaders' });
  for (const col of config.columns) {
    const isActive = state.sort === col.key;
    const arrow = isActive ? (state.dir === 1 ? ' \u25B2' : ' \u25BC') : '';
    const colHeader = el('div', {
      className: `idx-colheader ${isActive ? 'idx-colheader--active' : ''} ${col.align === 'right' ? 'idx-colheader--right' : ''}`,
      style: col.flex ? `flex: ${col.flex}` : `width: ${col.width}`,
      onClick: () => {
        if (state.sort === col.key) {
          state.dir *= -1;
        } else {
          state.sort = col.key;
          state.dir = col.key === 'count' ? -1 : 1;
        }
        state.expanded = null;
        const parent = grid.parentElement;
        const newGrid = renderGrid(gridKey, config);
        parent.replaceChild(newGrid, grid);
      },
    }, col.label + arrow);
    colRow.appendChild(colHeader);
  }
  grid.appendChild(colRow);

  // Rows
  const body = el('div', { className: 'idx-grid__body' });
  for (const entry of entries) {
    const isExpanded = state.expanded === entry.name;
    const isFacetActive = activeFilter && activeFilter.gridKey === gridKey && activeFilter.name === entry.name;
    const row = el('div', {
      className: `idx-row ${isExpanded ? 'idx-row--expanded' : ''} ${isFacetActive ? 'idx-row--facet-active' : ''}`,
      onClick: () => {
        // Toggle expand
        state.expanded = state.expanded === entry.name ? null : entry.name;
        // Toggle facet filter for cross-grid filtering
        setFacetFilter(gridKey, entry.name, entry.records);
      },
    });
    for (const col of config.columns) {
      const cell = el('div', {
        className: `idx-cell ${col.align === 'right' ? 'idx-cell--right' : ''}`,
        style: col.flex ? `flex: ${col.flex}` : `width: ${col.width}`,
      });
      cell.appendChild(config.renderCell(entry, col));
      row.appendChild(cell);
    }
    body.appendChild(row);

    // Expanded detail
    if (isExpanded) {
      body.appendChild(renderExpandedRecords(entry, gridKey));
    }
  }
  grid.appendChild(body);

  return grid;
}

// =========================================================================
// Cell renderers
// =========================================================================

function renderNameCell(entry) {
  const frag = document.createDocumentFragment();
  frag.appendChild(el('span', { className: 'idx-name' }, entry.name));
  const wd = entry.wikidata ? String(entry.wikidata) : '';
  if (wd.startsWith('wd:')) {
    const qid = wd.replace('wd:', '');
    frag.appendChild(el('a', {
      className: 'badge badge--wikidata',
      href: `https://www.wikidata.org/entity/${qid}`,
      target: '_blank',
      rel: 'noopener noreferrer',
      title: wd,
      html: WIKIDATA_ICON_SVG,
      onClick: (e) => e.stopPropagation(),
    }));
  }
  // WD-Enrichment subtitle (Beruf · Stimmfach · Lebensdaten)
  const parts = [];
  if (entry.occupation) {
    const occ = Array.isArray(entry.occupation) ? entry.occupation : [entry.occupation];
    parts.push(occ.join(', '));
  }
  if (entry.voiceType) parts.push(entry.voiceType);
  if (entry.birthDate || entry.deathDate) {
    const birth = entry.birthDate ? entry.birthDate.slice(0, 4) : '?';
    const death = entry.deathDate ? entry.deathDate.slice(0, 4) : '';
    parts.push(death ? `${birth}\u2013${death}` : `*${birth}`);
  }
  if (parts.length > 0) {
    frag.appendChild(el('div', { className: 'idx-subtitle' }, parts.join(' \u00b7 ')));
  }
  // AgRelOn-Beziehungsbadges (Session 32, E-75): Chips pro Beziehungstyp mit
  // Mehrfachzaehlung und Klick-Durchstich zum Beleg-Record im Archiv.
  if (entry.relations && entry.relations.length > 0) {
    const relEl = buildRelationBadges(entry.relations);
    if (relEl) frag.appendChild(relEl);
  }
  return frag;
}

/**
 * Gruppiert Relationen pro Typ, zaehlt Mehrfach-Vorkommen, baut Chips.
 * Klick auf Chip oeffnet den Beleg-Record im Archiv via Hash-Navigation.
 */
function buildRelationBadges(relations) {
  const byType = new Map();
  for (const rel of relations) {
    if (!rel || !rel.type) continue;
    if (!byType.has(rel.type)) byType.set(rel.type, []);
    byType.get(rel.type).push(rel);
  }
  if (byType.size === 0) return null;

  const container = el('div', { className: 'idx-relations' });
  for (const [type, rels] of byType) {
    const label = AGRELON_LABELS[type] || type.replace(/^agrelon:Has/, '');
    const count = rels.length;
    const first = rels[0];
    const tipParts = [`Beleg: ${first.recordId.replace(/^m3gim:/, '')}`];
    if (first.xlsxSource && first.xlsxSource.row) {
      tipParts.push(`Quelle: ${first.xlsxSource.sheet || 'XLSX'} Zeile ${first.xlsxSource.row}`);
    }
    if (count > 1) tipParts.push(`${count} Belege gesamt`);
    const chip = el('span', {
      className: 'chip chip--role-pair chip--c-beziehung chip--clickable',
      dataset: { tip: tipParts.join(' \u00b7 ') },
      onClick: (e) => {
        e.stopPropagation();
        // Beleg-Record im Archiv oeffnen (erster Beleg dieses Typs).
        window.location.hash = '#archiv/' + encodeURIComponent(first.recordId);
      },
    },
      el('span', { className: 'chip-rolle' }, label.toUpperCase()),
      count > 1
        ? el('span', { className: 'chip-wert' }, `\u00d7 ${count}`)
        : el('span', { className: 'chip-wert' }, ''),
    );
    container.appendChild(chip);
  }
  return container;
}

function renderKategorieCell(entry) {
  return el('span', {
    className: 'idx-kategorie',
  }, entry.kategorie);
}

function renderExpandedRecords(entry, gridKey) {
  const recordIds = [...entry.records];
  const records = recordIds
    .map(id => store.records.get(id))
    .filter(Boolean)
    .sort((a, b) => (a['rico:identifier'] || '').localeCompare(b['rico:identifier'] || '', 'de-DE', { numeric: true }));

  const total = records.length;
  const limited = records.slice(0, DETAIL_LIMIT);

  const rows = limited.map(r => {
    const docType = getDocTypeId(r) || '';
    const docLabel = DOKUMENTTYP_LABELS[docType] || docType || '';
    const rid = r['@id'];
    const inKorb = isInKorb(rid);
    return el('div', {
      className: 'idx-detail-record',
      onClick: (e) => {
        e.stopPropagation();
        selectRecord(rid);
      },
    },
      el('span', { className: 'idx-detail-sig' }, formatSignatur(r['rico:identifier'])),
      el('span', { className: 'idx-detail-title' }, truncate(r['rico:title'] || '(ohne Titel)', 50)),
      docLabel ? el('span', { className: `badge badge--${docType}` }, docLabel) : null,
      el('button', {
        className: `bookmark-btn ${inKorb ? 'bookmark-btn--active' : ''}`,
        title: inKorb ? 'Aus Wissenskorb entfernen' : 'Zum Wissenskorb',
        dataset: { recordId: rid },
        html: bookmarkIcon(12, inKorb),
        onClick: (e) => {
          e.stopPropagation();
          toggleKorb(rid);
          // Statt alle 4 Grids neu zu zeichnen: alle Bookmark-Buttons dieses
          // Records in-place aktualisieren (dasselbe Record kann in mehreren
          // aufgeklappten Grids auftauchen).
          const nowIn = isInKorb(rid);
          const page = container?.querySelector('.idx-page');
          for (const b of (page ? page.querySelectorAll('.bookmark-btn') : [])) {
            if (b.dataset.recordId !== rid) continue;
            b.classList.toggle('bookmark-btn--active', nowIn);
            b.title = nowIn ? 'Aus Wissenskorb entfernen' : 'Zum Wissenskorb';
            b.innerHTML = bookmarkIcon(12, nowIn);
          }
        },
      }),
    );
  });

  const children = [
    el('div', { className: 'idx-detail__header' }, `${total} verkn\u00fcpfte Dokumente`),
    ...rows,
  ];

  // "Show all in Archiv" link when truncated
  if (total > DETAIL_LIMIT) {
    children.push(el('div', { className: 'idx-detail__show-all' },
      el('a', {
        href: '#archiv',
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          navigateToArchivFiltered(gridKey, entry.name);
        },
      }, `Alle ${total} im Archiv anzeigen \u2192`),
    ));
  }

  return el('div', { className: 'idx-detail' }, ...children);
}

/**
 * Navigate to Archiv tab with person filter pre-set.
 * Uses a custom event that main.js / archiv.js can listen for.
 * Delay slightly to ensure Archiv tab is rendered first (lazy rendering).
 */
function navigateToArchivFiltered(gridKey, name) {
  window.location.hash = '#archiv';
  // Small delay to ensure the Archiv tab is rendered before the event fires
  requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent('m3gim:archiv-filter', {
      detail: { type: gridKey, name },
    }));
  });
}
