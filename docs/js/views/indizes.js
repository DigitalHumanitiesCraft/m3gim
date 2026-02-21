/**
 * M³GIM Indizes View — 4 compact grids showing Personen, Organisationen, Orte, Werke.
 * Supports cross-grid faceted filtering via activeFilter state.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur, getDocTypeId, truncate } from '../utils/format.js';
import { PERSONEN_FARBEN, DOKUMENTTYP_LABELS, WIKIDATA_ICON_SVG } from '../data/constants.js';
import { selectRecord } from '../ui/router.js';
import { toggleKorb, isInKorb } from '../ui/korb.js';

let store = null;
let container = null;

/** Max records shown in expanded detail before "show all" link */
const DETAIL_LIMIT = 10;

// Per-grid state
const gridState = {
  personen:       { sort: 'count', dir: -1, search: '', expanded: null },
  organisationen: { sort: 'count', dir: -1, search: '', expanded: null },
  orte:           { sort: 'count', dir: -1, search: '', expanded: null },
  werke:          { sort: 'count', dir: -1, search: '', expanded: null },
};

/** Cross-grid facet filter: { gridKey, name, recordIds: Set<string> } | null */
let activeFilter = null;

const GRID_CONFIG = {
  personen: {
    label: 'Personen',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    getEntries: (s) => [...s.persons.entries()].map(([name, data]) => ({
      name, count: data.records.size, kategorie: data.kategorie, wikidata: data.wikidata, records: data.records,
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
    getEntries: (s) => [...s.organizations.entries()].map(([name, data]) => ({
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
    getEntries: (s) => [...s.locations.entries()].map(([name, data]) => ({
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
    getEntries: (s) => [...s.works.entries()].map(([name, data]) => ({
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
  gridState[gridType].search = '';

  // Also set facet filter for cross-grid filtering
  const config = GRID_CONFIG[gridType];
  if (config) {
    const entries = config.getEntries(store);
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
  clear(container);

  const wrapper = el('div', { className: 'idx-page' });

  // Toolbar: Search + Facet Chips on one line
  const chipContainer = el('div', { className: 'idx-facet-chips' });
  chipContainer.id = 'idx-facet-chips';

  const toolbar = el('div', { className: 'idx-toolbar' },
    el('input', {
      className: 'idx-search-input',
      type: 'text',
      placeholder: 'Alle Indizes durchsuchen\u2026',
      onInput: (e) => {
        const q = e.target.value.toLowerCase();
        for (const key of Object.keys(gridState)) {
          gridState[key].search = q;
          gridState[key].expanded = null;
        }
        activeFilter = null; // clear facet on global search
        renderAllGrids(wrapper);
      },
    }),
    chipContainer,
  );
  wrapper.appendChild(toolbar);

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

  for (const [gridKey, config] of Object.entries(GRID_CONFIG)) {
    gridsContainer.appendChild(renderGrid(gridKey, config));
  }
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
  let entries = config.getEntries(store);

  // Apply cross-grid facet filter
  entries = applyFacetFilter(entries, gridKey);

  // Filter
  if (state.search) {
    entries = entries.filter(e => config.searchFields(e).toLowerCase().includes(state.search));
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
  const allEntries = config.getEntries(store);
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
  return frag;
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
        html: inKorb
          ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>'
          : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
        onClick: (e) => {
          e.stopPropagation();
          toggleKorb(rid);
          // Re-render this grid to reflect bookmark state
          const wrapper = container?.querySelector('.idx-page');
          if (wrapper) renderAllGrids(wrapper);
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
