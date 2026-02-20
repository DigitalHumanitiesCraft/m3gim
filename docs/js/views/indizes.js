/**
 * M³GIM Indizes View — 4 compact grids showing Personen, Organisationen, Orte, Werke.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur, getDocTypeId, truncate } from '../utils/format.js';
import { PERSONEN_FARBEN, DOKUMENTTYP_LABELS } from '../data/constants.js';
import { selectRecord } from '../ui/router.js';

let store = null;
let container = null;

// Per-grid state
const gridState = {
  personen:       { sort: 'count', dir: -1, search: '', expanded: null },
  organisationen: { sort: 'count', dir: -1, search: '', expanded: null },
  orte:           { sort: 'count', dir: -1, search: '', expanded: null },
  werke:          { sort: 'count', dir: -1, search: '', expanded: null },
};

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
      name, count: data.records.size, records: data.records,
    })),
    columns: [
      { key: 'name', label: 'Name', flex: 1 },
      { key: 'count', label: 'Dok.', width: '50px', align: 'right' },
    ],
    renderCell: (entry, col) => {
      if (col.key === 'name') return el('span', { className: 'idx-name' }, entry.name);
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

  // Search bar across all grids
  const searchBar = el('div', { className: 'idx-global-search' },
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
        renderAllGrids(wrapper);
      },
    })
  );
  wrapper.appendChild(searchBar);

  const gridsContainer = el('div', { className: 'idx-grids' });
  wrapper.appendChild(gridsContainer);

  container.appendChild(wrapper);
  renderAllGrids(wrapper);
}

function renderAllGrids(wrapper) {
  const gridsContainer = wrapper.querySelector('.idx-grids');
  if (!gridsContainer) return;
  clear(gridsContainer);

  for (const [gridKey, config] of Object.entries(GRID_CONFIG)) {
    gridsContainer.appendChild(renderGrid(gridKey, config));
  }
}

function renderGrid(gridKey, config) {
  const state = gridState[gridKey];
  let entries = config.getEntries(store);

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
    return va.localeCompare(vb) * state.dir;
  });

  const grid = el('div', { className: 'idx-grid' });

  // Header
  const header = el('div', { className: 'idx-grid__header' },
    el('span', { className: 'idx-grid__icon', html: config.icon }),
    el('span', { className: 'idx-grid__title' }, config.label),
    el('span', { className: 'idx-grid__count' }, `${entries.length}`),
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
    const row = el('div', {
      className: `idx-row ${state.expanded === entry.name ? 'idx-row--expanded' : ''}`,
      onClick: () => {
        state.expanded = state.expanded === entry.name ? null : entry.name;
        const parent = grid.parentElement;
        const newGrid = renderGrid(gridKey, config);
        parent.replaceChild(newGrid, grid);
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
    if (state.expanded === entry.name) {
      body.appendChild(renderExpandedRecords(entry));
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
      onClick: (e) => e.stopPropagation(),
    }, 'WD'));
  }
  return frag;
}

function renderKategorieCell(entry) {
  return el('span', {
    className: 'idx-kategorie',
  }, entry.kategorie);
}

function renderExpandedRecords(entry) {
  const recordIds = [...entry.records];
  const records = recordIds
    .map(id => store.records.get(id))
    .filter(Boolean)
    .sort((a, b) => (a['rico:identifier'] || '').localeCompare(b['rico:identifier'] || '', undefined, { numeric: true }));

  const rows = records.map(r => {
    const docType = getDocTypeId(r) || '';
    const docLabel = DOKUMENTTYP_LABELS[docType] || docType || '';
    return el('div', {
      className: 'idx-detail-record',
      onClick: (e) => {
        e.stopPropagation();
        selectRecord(r['@id']);
      },
    },
      el('span', { className: 'idx-detail-sig' }, formatSignatur(r['rico:identifier'])),
      el('span', { className: 'idx-detail-title' }, truncate(r['rico:title'] || '(ohne Titel)', 50)),
      docLabel ? el('span', { className: `badge badge--${docType}` }, docLabel) : null,
    );
  });

  return el('div', { className: 'idx-detail' },
    el('div', { className: 'idx-detail__header' }, `${records.length} verknüpfte Dokumente`),
    ...rows,
  );
}
