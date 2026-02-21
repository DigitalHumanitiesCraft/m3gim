/**
 * M³GIM Archiv Chronik View — Zeit → Ort → Records.
 * Groups records by 5-year period and location to tell Malaniuk's mobility story.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur, formatChildSignatur, getDocTypeId, truncate, ensureArray } from '../utils/format.js';
import { extractYear } from '../utils/date-parser.js';
import { DOKUMENTTYP_LABELS } from '../data/constants.js';
import { buildInlineDetail } from './archiv-inline-detail.js';

let store = null;
let container = null;
let expandedRecord = null;
let collapsedPeriods = new Set();
let initialRender = true; // first render collapses all periods
let currentFilters = {}; // kept in sync so closures never go stale
let currentGrouping = 'location'; // 'location' | 'person' | 'werk'

/** Set grouping mode from orchestrator. */
export function setChronikGrouping(mode) {
  currentGrouping = mode;
}

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
  const { search = '', docType = '', person = '' } = currentFilters;
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

  // Person filter
  if (person) {
    const personData = store.persons.get(person);
    if (personData) {
      records = records.filter(r => personData.records.has(r['@id']));
    }
  }

  // Group by period → grouping dimension
  const groupFn = currentGrouping === 'person' ? groupByPeriodAndPerson
    : currentGrouping === 'werk' ? groupByPeriodAndWerk
    : groupByPeriodAndLocation;
  const grouped = groupFn(records);

  // On first render, collapse all periods for overview
  if (initialRender) {
    for (const [period] of grouped) {
      collapsedPeriods.add(period);
    }
    initialRender = false;
  }

  // Render periods
  const wrapper = el('div', { className: 'chronik' });

  for (const [period, locationMap] of grouped) {
    const totalCount = [...locationMap.values()].reduce((sum, arr) => sum + arr.length, 0);
    const note = KARRIERE_NOTIZEN[period] || '';
    const isCollapsed = collapsedPeriods.has(period);

    // Aggregate summary for collapsed header
    const periodRecords = [...locationMap.values()].flat();
    const typeCounts = new Map();
    for (const r of periodRecords) {
      const t = getDocTypeId(r);
      if (t) typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
    }
    const topTypes = [...typeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t, c]) => `${c}\u00a0${DOKUMENTTYP_LABELS[t] || t}`);

    const topGroups = [...locationMap.entries()]
      .filter(([name]) => !name.startsWith('\u2014 '))
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([name]) => name);

    const summaryParts = [];
    if (topTypes.length) summaryParts.push(topTypes.join(' \u00b7 '));
    if (topGroups.length) summaryParts.push(topGroups.join(', '));
    const summaryText = summaryParts.join(' \u2014 ');

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
      period === 'Undatiert'
        ? el('span', { className: 'chronik-period__note' }, 'ohne Datumsangabe in der Quelle')
        : null,
      el('span', { className: 'chronik-period__count', dataset: { tip: `${totalCount} Archiveinheiten` } }, `${totalCount}`),
      summaryText
        ? el('span', { className: 'chronik-period__summary' }, summaryText)
        : null,
    );
    periodEl.appendChild(headerEl);

    // Period body (locations + records)
    if (!isCollapsed) {
      const bodyEl = el('div', { className: 'chronik-period__body' });

      for (const [groupName, groupRecords] of locationMap) {
        const isPlaceholder = groupName.startsWith('\u2014 ');

        const locEl = el('div', { className: 'chronik-location' });
        const headerChildren = [
          el('span', {
            className: 'chronik-location__icon',
            html: isPlaceholder
              ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>'
              : getGroupIcon(currentGrouping),
          }),
          el('span', { className: 'chronik-location__name' }, groupName),
          el('span', { className: 'chronik-location__count', dataset: { tip: `${groupRecords.length} Archiveinheiten` } }, `(${groupRecords.length})`),
        ];
        if (isPlaceholder) {
          const hintText = currentGrouping === 'location'
            ? 'Ort noch nicht erfasst (Schicht\u00a02)'
            : currentGrouping === 'person'
              ? 'Person noch nicht verknüpft (Schicht\u00a02)'
              : 'Werk noch nicht verknüpft (Schicht\u00a02)';
          headerChildren.push(
            el('span', { className: 'chronik-location__hint' }, hintText)
          );
        }
        locEl.appendChild(el('div', { className: 'chronik-location__header' }, ...headerChildren));

        // Record rows within this group
        for (const r of groupRecords) {
          const konvolutId = store.childToKonvolut?.get(r['@id']);
          const parentSig = konvolutId ? store.konvolute.get(konvolutId)?.['rico:identifier'] : null;
          const sig = parentSig
            ? formatChildSignatur(r['rico:identifier'], parentSig)
            : formatSignatur(r['rico:identifier']);
          const docType = getDocTypeId(r);
          const docLabel = DOKUMENTTYP_LABELS[docType] || '';
          const agents = ensureArray(r['rico:hasOrHadAgent']);
          const allAgentNames = agents.map(a => a.name || a['skos:prefLabel'] || '').filter(Boolean);
          const displayNames = allAgentNames.slice(0, 3);
          const recordId = r['@id'];

          const agentEl = displayNames.length > 0
            ? el('span', {
                className: 'chronik-record__agents',
                dataset: allAgentNames.length > 3
                  ? { tip: allAgentNames.join(', '), tipWrap: '', tipPos: 'bottom-left' }
                  : {},
              }, displayNames.join(', ') + (allAgentNames.length > 3 ? ` (+${allAgentNames.length - 3})` : ''))
            : null;

          const recordEl = el('div', {
            className: `chronik-record ${expandedRecord === recordId ? 'chronik-record--active' : ''}`,
            onClick: () => {
              expandedRecord = expandedRecord === recordId ? null : recordId;
              updateChronikView(currentFilters);
            },
          },
            el('span', { className: 'chronik-record__sig' }, sig),
            el('span', {
              className: 'chronik-record__title',
              dataset: (r['rico:title'] || '').length > 60 ? { tip: r['rico:title'], tipWrap: '', tipPos: 'bottom-left' } : {},
            }, truncate(r['rico:title'] || '(ohne Titel)', 60)),
            docLabel ? el('span', { className: `badge badge--${docType || ''}` }, docLabel) : null,
            agentEl,
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

  // Return count for counter update
  return records.length;
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
      (a['rico:identifier'] || '').localeCompare(b['rico:identifier'] || '', 'de-DE', { numeric: true })
    );
    sorted.set(loc, records);
  }
  return sorted;
}

/** Group records by period → person. */
function groupByPeriodAndPerson(records) {
  return groupByPeriodAndDimension(records, r => {
    const agents = ensureArray(r['rico:hasOrHadAgent']);
    return agents.map(a => a.name || a['skos:prefLabel'] || '').filter(Boolean);
  }, '\u2014 Ohne Person');
}

/** Group records by period → werk. */
function groupByPeriodAndWerk(records) {
  return groupByPeriodAndDimension(records, r => {
    const subjects = ensureArray(r['rico:hasOrHadSubject']);
    return subjects.map(s => s.name || s['skos:prefLabel'] || '').filter(Boolean);
  }, '\u2014 Ohne Werk');
}

/** Generic grouping: period → dimension values extracted by fn. */
function groupByPeriodAndDimension(records, extractFn, placeholder) {
  const periodMap = new Map();

  for (const r of records) {
    const year = extractYear(r['rico:date']);
    const period = yearToPeriod(year);
    const values = extractFn(r);

    if (!periodMap.has(period)) periodMap.set(period, new Map());
    const dimMap = periodMap.get(period);

    if (values.length === 0) {
      if (!dimMap.has(placeholder)) dimMap.set(placeholder, []);
      dimMap.get(placeholder).push(r);
    } else {
      const primary = values[0];
      if (!dimMap.has(primary)) dimMap.set(primary, []);
      dimMap.get(primary).push(r);
    }
  }

  return sortGroupedPeriods(periodMap, placeholder);
}

/** Sort periods chronologically and groups within by count. */
function sortGroupedPeriods(periodMap, placeholder) {
  const periodOrder = [
    'vor 1945', '1945-1949', '1950-1954', '1955-1959',
    '1960-1964', '1965-1969', '1970-1974', 'nach 1974', 'Undatiert',
  ];

  const sorted = new Map();
  for (const p of periodOrder) {
    if (periodMap.has(p)) {
      sorted.set(p, sortGroupMap(periodMap.get(p), placeholder));
    }
  }
  for (const [p, m] of periodMap) {
    if (!sorted.has(p)) sorted.set(p, sortGroupMap(m, placeholder));
  }
  return sorted;
}

/** Sort groups within a period by count, placeholder last. */
function sortGroupMap(groupMap, placeholder) {
  const entries = [...groupMap.entries()];
  entries.sort((a, b) => {
    if (a[0] === placeholder) return 1;
    if (b[0] === placeholder) return -1;
    return b[1].length - a[1].length;
  });
  const sorted = new Map();
  for (const [key, records] of entries) {
    records.sort((a, b) =>
      (a['rico:identifier'] || '').localeCompare(b['rico:identifier'] || '', 'de-DE', { numeric: true })
    );
    sorted.set(key, records);
  }
  return sorted;
}

/** Get SVG icon for a grouping mode. */
function getGroupIcon(mode) {
  if (mode === 'person') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  if (mode === 'werk') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
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
