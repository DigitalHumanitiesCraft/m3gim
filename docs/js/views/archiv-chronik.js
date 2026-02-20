/**
 * M³GIM Archiv Chronik View — Zeit → Ort → Records.
 * Groups records by 5-year period and location to tell Malaniuk's mobility story.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur, getDocTypeId, truncate, ensureArray } from '../utils/format.js';
import { extractYear } from '../utils/date-parser.js';
import { DOKUMENTTYP_LABELS } from '../data/constants.js';
import { buildInlineDetail } from './archiv-inline-detail.js';

let store = null;
let container = null;
let expandedRecord = null;
let collapsedPeriods = new Set();
let currentFilters = {}; // kept in sync so closures never go stale

/** Karriere-Notizen pro Periode */
const KARRIERE_NOTIZEN = {
  'vor 1945':  'Lemberg / Jugend',
  '1945-1949': 'Graz / Nachkriegszeit',
  '1950-1954': 'Internationale Karriere',
  '1955-1959': 'Wien, Bayreuth, M\u00fcnchen',
  '1960-1964': 'Etablierte K\u00fcnstlerin',
  '1965-1969': 'Sp\u00e4te Karriere',
  '1970-1974': 'R\u00fcckzug / Z\u00fcrich',
  'nach 1974': 'Nachlass',
};

/**
 * Render the Chronik view.
 * @param {Object} storeRef
 * @param {HTMLElement} containerEl
 * @param {{ search: string, docType: string }} filters
 */
export function renderChronik(storeRef, containerEl, filters) {
  store = storeRef;
  container = containerEl;
  clear(container);
  updateChronikView(filters);
}

/**
 * Re-render with updated filters.
 */
export function updateChronikView(filters) {
  currentFilters = filters || {};
  const { search = '', docType = '' } = currentFilters;
  clear(container);

  let records = [...store.allRecords];

  // Search
  if (search) {
    const q = search.toLowerCase();
    records = records.filter(r => {
      const sig = (r['rico:identifier'] || '').toLowerCase();
      const title = (r['rico:title'] || '').toLowerCase();
      return sig.includes(q) || title.includes(q);
    });
  }

  // Doc type
  if (docType) {
    records = records.filter(r => getDocTypeId(r) === docType);
  }

  // Group by period → location
  const grouped = groupByPeriodAndLocation(records);

  // Render periods
  const wrapper = el('div', { className: 'chronik' });

  for (const [period, locationMap] of grouped) {
    const totalCount = [...locationMap.values()].reduce((sum, arr) => sum + arr.length, 0);
    const note = KARRIERE_NOTIZEN[period] || '';
    const isCollapsed = collapsedPeriods.has(period);

    const periodEl = el('div', { className: 'chronik-period' });

    // Period header
    const headerEl = el('div', {
      className: `chronik-period__header ${isCollapsed ? 'chronik-period__header--collapsed' : ''}`,
      onClick: () => {
        if (isCollapsed) collapsedPeriods.delete(period);
        else collapsedPeriods.add(period);
        updateChronikView(currentFilters);
      },
    },
      el('span', { className: 'chronik-period__toggle',
        html: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
      }),
      el('span', { className: 'chronik-period__label' }, period),
      note ? el('span', { className: 'chronik-period__note' }, note) : null,
      el('span', { className: 'chronik-period__count' }, `${totalCount}`),
    );
    periodEl.appendChild(headerEl);

    // Period body (locations + records)
    if (!isCollapsed) {
      const bodyEl = el('div', { className: 'chronik-period__body' });

      for (const [location, locRecords] of locationMap) {
        const isOhneOrt = location === '\u2014 Ohne Ort';

        const locEl = el('div', { className: 'chronik-location' });
        locEl.appendChild(el('div', { className: 'chronik-location__header' },
          el('span', {
            className: 'chronik-location__icon',
            html: isOhneOrt
              ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>'
              : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
          }),
          el('span', { className: 'chronik-location__name' }, location),
          el('span', { className: 'chronik-location__count' }, `(${locRecords.length})`),
        ));

        // Record rows within this location
        for (const r of locRecords) {
          const sig = formatSignatur(r['rico:identifier']);
          const docType = getDocTypeId(r);
          const docLabel = DOKUMENTTYP_LABELS[docType] || '';
          const agents = ensureArray(r['rico:hasOrHadAgent']);
          const agentNames = agents.slice(0, 3).map(a => a.name || a['skos:prefLabel'] || '').filter(Boolean);
          const recordId = r['@id'];

          const recordEl = el('div', {
            className: `chronik-record ${expandedRecord === recordId ? 'chronik-record--active' : ''}`,
            onClick: () => {
              expandedRecord = expandedRecord === recordId ? null : recordId;
              updateChronikView(currentFilters);
            },
          },
            el('span', { className: 'chronik-record__sig' }, sig),
            el('span', { className: 'chronik-record__title' }, truncate(r['rico:title'] || '(ohne Titel)', 60)),
            docLabel ? el('span', { className: `badge badge--${docType || ''}` }, docLabel) : null,
            agentNames.length > 0
              ? el('span', { className: 'chronik-record__agents' }, agentNames.join(', '))
              : null,
          );
          locEl.appendChild(recordEl);

          // Inline detail
          if (expandedRecord === recordId) {
            const detailEl = el('div', { className: 'chronik-record__detail' });
            detailEl.appendChild(buildInlineDetail(r, store, {
              onClose: () => { expandedRecord = null; updateChronikView(currentFilters); },
            }));
            locEl.appendChild(detailEl);
          }
        }

        bodyEl.appendChild(locEl);
      }

      periodEl.appendChild(bodyEl);
    }

    wrapper.appendChild(periodEl);
  }

  container.appendChild(wrapper);
}

/**
 * Group records into Map<period, Map<location, Record[]>>.
 * Sorted: periods chronologically, locations by count descending, "Ohne Ort" last.
 */
function groupByPeriodAndLocation(records) {
  const periodMap = new Map();

  for (const r of records) {
    const year = extractYear(r['rico:date']);
    const period = yearToPeriod(year);
    const locations = ensureArray(r['rico:hasOrHadLocation']);
    const locNames = locations
      .map(l => l.name || l['skos:prefLabel'] || '')
      .filter(n => n && !/^\d{4}(-\d{2}){0,2}/.test(n));

    if (!periodMap.has(period)) periodMap.set(period, new Map());
    const locMap = periodMap.get(period);

    if (locNames.length === 0) {
      const key = '\u2014 Ohne Ort';
      if (!locMap.has(key)) locMap.set(key, []);
      locMap.get(key).push(r);
    } else {
      // Add to first location (primary)
      const primary = locNames[0];
      if (!locMap.has(primary)) locMap.set(primary, []);
      locMap.get(primary).push(r);
    }
  }

  // Sort periods chronologically
  const periodOrder = [
    'vor 1945', '1945-1949', '1950-1954', '1955-1959',
    '1960-1964', '1965-1969', '1970-1974', 'nach 1974', 'Undatiert',
  ];

  const sorted = new Map();
  for (const p of periodOrder) {
    if (periodMap.has(p)) {
      sorted.set(p, sortLocationMap(periodMap.get(p)));
    }
  }
  // Any remaining periods not in our list
  for (const [p, locMap] of periodMap) {
    if (!sorted.has(p)) sorted.set(p, sortLocationMap(locMap));
  }

  return sorted;
}

/**
 * Sort locations within a period: by count descending, "Ohne Ort" last.
 * Also sort records within each location by signatur.
 */
function sortLocationMap(locMap) {
  const entries = [...locMap.entries()];
  entries.sort((a, b) => {
    if (a[0] === '\u2014 Ohne Ort') return 1;
    if (b[0] === '\u2014 Ohne Ort') return -1;
    return b[1].length - a[1].length;
  });

  const sorted = new Map();
  for (const [loc, records] of entries) {
    records.sort((a, b) =>
      (a['rico:identifier'] || '').localeCompare(b['rico:identifier'] || '', undefined, { numeric: true })
    );
    sorted.set(loc, records);
  }
  return sorted;
}

/**
 * Map a year to a named period.
 */
function yearToPeriod(year) {
  if (!year) return 'Undatiert';
  if (year < 1945) return 'vor 1945';
  if (year > 1974) return 'nach 1974';
  const start = Math.floor(year / 5) * 5;
  return `${start}-${start + 4}`;
}
