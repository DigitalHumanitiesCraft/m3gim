/**
 * M³GIM Mobilitäts-Chronik — scrollender Jahres-Zeitstrahl.
 * Records hängen als Chips an der Jahresachse; ein linker Akzent kodiert die
 * Rolle der Datierung, die das Jahr trägt (Aufführung, Absendung,
 * Erscheinungsdatum, …). Ein undatierter Record hat keinen Akzent — die
 * Monochromie IST das Signal "kein Zeitanker". Leere Jahre bleiben sichtbar
 * (Erschließungsspiegel, E-88), undatierte landen am Ende; ein Chip, dessen
 * Jahr aus einer Verknüpfung statt aus der eigenen Datierung stammt, trägt die
 * Marke des Ergänzten. Ein Dekaden×Datierungsrolle-Header zeigt die zeitliche
 * Entwicklung als Aggregat, das per Klick auf seine belegenden Chips auflöst.
 */

import { el, clear, scrollBehavior } from '../utils/dom.js';
import { formatSignatur, getDocTypeId, dftLabel } from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { primaryYear } from '../data/loader.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { isSharedFiltered, sharedFacetsActive } from './_bestand-filter.js';
import {
  aggregateDecadeStacks, placeLabelFor, datingRoleScale, datingRoleKey,
} from './chronik-data.js';
import { logStamp } from '../utils/env.js';
import { selectRecord } from '../ui/router.js';
import { getFilter } from '../ui/filter-state.js';
import { yearBounds, recordsFor, baseRecords, YEAR_MIN, YEAR_MAX } from '../data/records-for.js';

let store = null;
let container = null;
let sidebar = null;
let viewContainer = null;
let visibleRecords = 0;    // Dokumente im Bild, fuer den Statusblock der Sidebar
let activeSegment = null;  // "decade|role" of the active header segment
let roleScale = new Map(); // dating role -> colour, ranked over the base set

// Records vor YEAR_MIN und nach YEAR_MAX werden trotzdem gerendert (als
// zusaetzliche Jahresblocke vor/nach dem Band), damit der Nachlass-Stand
// ehrlich bleibt.

// The Zeitanker either stands at the document itself or comes from one of its
// Verknuepfungen. Only the second case is marked, because only there does the
// year on the axis not belong to the document's own dating (task 8).
const OBJECT_OWN_SOURCES = new Set(['rico:date', 'rico:creationDate']);

export function renderChronik(storeRef, containerEl) {
  store = storeRef;
  container = containerEl;
  clear(container);

  const main = el('div', { className: 'view-main archiv-main' });
  viewContainer = el('div', { className: 'chronik-timeline-container' });
  main.appendChild(viewContainer);

  // The colour axis stands over the base set, not over the cut.
  roleScale = datingRoleScale(store, baseRecords(store));

  if (sidebar) sidebar.destroy();
  sidebar = createSidebar(store, {
    yearSpan: yearBounds(store),
    getCount: () => visibleRecords,
    search: { placeholder: 'Signatur, Titel, Typ oder Datum' },
    onChange: () => updateChronikView(),
  });
  main.insertBefore(sidebar.strip, main.firstChild);
  container.appendChild(viewShell(sidebar.element, main));

  updateChronikView();
}

function updateChronikView() {
  clear(viewContainer);
  activeSegment = null;

  const shared = getFilter();

  // Der Zeitstrahl traegt die Grundmenge des Frontends, also jedes Dokument mit
  // Verknuepfung (E-165); was davon erscheint, entscheiden allein die Facetten
  // der geteilten Spalte.
  const cut = recordsFor(store, shared).ids;
  const records = store.allRecords.filter(record => cut.has(record['@id']));
  visibleRecords = records.length;
  if (sidebar) sidebar.update();

  // Pro Record einmal annotieren: Anzeigejahr und die Rolle der Datierung, die
  // es traegt. Der Zeitanker kommt aus primaryYear und faellt seit F3 auf die
  // ranghoechste ankernde Datierung der Verknuepfungen, `rico:date` traegt nur
  // noch den Rest. Der Anker reist mit, weil der Chip sein Datum und seine
  // Herkunft aus ihm nimmt ("ein Record = ein Punkt").
  const annotated = records.map(r => {
    const anchor = primaryYear(store, r);
    const year = Number.isFinite(anchor.year) ? anchor.year : null;
    const fromLink = year != null && !OBJECT_OWN_SOURCES.has(anchor.source);
    return { record: r, year, anchor, fromLink, role: datingRoleKey(anchor, roleScale) };
  });

  // Nach Jahr gruppieren; echt-undatierte (auch ohne Sekundaerjahr) ans Ende.
  const byYear = new Map();
  const undated = [];
  for (const a of annotated) {
    if (a.year == null) { undated.push(a); continue; }
    if (!byYear.has(a.year)) byYear.set(a.year, []);
    byYear.get(a.year).push(a);
  }

  const datedCount = annotated.length - undated.length;
  const fromLinkCount = annotated.filter(a => a.fromLink).length;

  // Jahresraster: mindestens YEAR_MIN..YEAR_MAX, plus vorhandene Aussreisser.
  const years = [...byYear.keys()];
  const min = Math.min(YEAR_MIN, ...(years.length ? years : [YEAR_MIN]));
  const max = Math.max(YEAR_MAX, ...(years.length ? years : [YEAR_MAX]));

  let maxPerYear = 0;
  for (const arr of byYear.values()) {
    if (arr.length > maxPerYear) maxPerYear = arr.length;
  }

  const isFiltered = isSharedFiltered(shared) || sharedFacetsActive(shared)
    || Array.isArray(shared.zeitfenster);

  const stacks = aggregateDecadeStacks(annotated.map(a => ({ year: a.year, role: a.role })));
  const header = renderDecadeHeader(stacks);
  if (header) viewContainer.appendChild(header);

  // --- Zeitstrahl ------------------------------------------------------------
  const timeline = el('div', { className: 'chronik-timeline' });
  timeline.appendChild(el('div', { className: 'chronik-timeline__axis', 'aria-hidden': 'true' }));

  const isDecadeBoundary = (y) => y % 10 === 0;
  for (let y = min; y <= max; y++) {
    timeline.appendChild(renderYearRow(y, byYear.get(y) || [], maxPerYear, isDecadeBoundary(y)));
  }

  if (undated.length > 0) {
    timeline.appendChild(renderUndatedRow(undated));
  }

  viewContainer.appendChild(timeline);

  logStamp('chronik', [
    ['records', records.length],
    ['jahre-belegt', byYear.size],
    ['datiert', datedCount],
    ['aus-verknuepfung', fromLinkCount],
    ['undatiert', undated.length],
    ['datierungsrollen', roleScale.size],
    ['spanne', `${min}–${max}`],
    ['gefiltert', isFiltered ? 'ja' : ''],
  ]);
}

/** Dekaden×Datierungsrolle-Stapel: zeitliche Entwicklung als Aggregat, das per
 *  Klick auf seine belegenden Chips auflöst. */
function renderDecadeHeader(stacks) {
  if (!stacks.rows.length) return null;
  const maxTotal = Math.max(...stacks.rows.map(r => r.total), 1);
  const order = [...roleScale.keys()];
  const labelOf = key => (roleScale.get(key) || {}).label || key;
  const colorOf = key => (roleScale.get(key) || {}).color || 'var(--color-text-tertiary)';

  const wrap = el('div', { className: 'chronik-decades' });

  const legend = el('ul', { className: 'chronik-decades__legend' });
  for (const key of order) {
    // Only the roles the current cut actually carries.
    if (!stacks.rows.some(r => r.byRole[key])) continue;
    legend.appendChild(el('li', { className: 'chronik-decades__legend-item' },
      el('span', { className: 'chronik-decades__swatch', style: `background:${colorOf(key)};` }),
      labelOf(key),
    ));
  }

  const head = el('div', { className: 'chronik-decades__head' },
    el('span', { className: 'chronik-decades__title' }, 'Jahrzehnte nach Herkunft des Jahres'),
    legend,
  );
  wrap.appendChild(head);

  for (const row of stacks.rows) {
    const bar = el('div', { className: 'chronik-decades__row' });
    bar.appendChild(el('div', { className: 'chronik-decades__label' }, `${row.decade}er`));

    const track = el('div', { className: 'chronik-decades__track' });
    if (row.total === 0) {
      track.appendChild(el('div', { className: 'chronik-decades__empty' }));
    } else {
      // Track-Breite proportional zur groessten Dekade (ehrliche Mengenrelation).
      track.style.width = `${Math.max(8, (row.total / maxTotal) * 100)}%`;
      for (const key of order) {
        const c = row.byRole[key];
        if (!c) continue;
        const seg = el('button', {
          className: 'chronik-decades__seg',
          style: `flex:${c} 0 0; background:${colorOf(key)};`,
          dataset: { tip: `${row.decade}er · ${labelOf(key)}: ${c}`, tipWrap: '' },
          'aria-label': `${row.decade}er, ${labelOf(key)}: ${c} Einheiten`,
          onClick: () => toggleSegment(row.decade, key),
        });
        track.appendChild(seg);
      }
    }
    bar.appendChild(track);
    bar.appendChild(el('div', { className: 'chronik-decades__total' }, row.total ? String(row.total) : ''));
    wrap.appendChild(bar);
  }
  return wrap;
}

/** Header-Segment aktivieren: scrollt zur Dekade und hebt genau die Chips
 *  hervor, die das Segment aggregiert (Aggregat -> Einzelquellen). Erneuter
 *  Klick hebt die Hervorhebung auf. */
function toggleSegment(decade, role) {
  const key = `${decade}|${role}`;
  const points = viewContainer.querySelectorAll('.chronik-point');
  if (activeSegment === key) {
    activeSegment = null;
    points.forEach(p => p.classList.remove('chronik-point--dim', 'chronik-point--hit'));
    return;
  }
  activeSegment = key;
  let first = null;
  points.forEach(p => {
    const match = p.dataset.decade === String(decade) && p.dataset.role === role;
    p.classList.toggle('chronik-point--hit', match);
    p.classList.toggle('chronik-point--dim', !match);
    if (match && !first) first = p;
  });
  if (first) first.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
}

function renderYearRow(year, entriesInYear, maxPerYear, isDecadeBoundary) {
  const isEmpty = entriesInYear.length === 0;
  const row = el('div', {
    className: `chronik-year ${isEmpty ? 'chronik-year--empty' : ''} ${isDecadeBoundary ? 'chronik-year--decade' : ''}`,
    dataset: { year: String(year) },
  });

  row.appendChild(el('div', {
    className: 'chronik-year__label',
    dataset: {
      tip: isEmpty
        ? 'Kein erschlossenes Material mit diesem Jahr — nicht „keine Mobilität"'
        : `${entriesInYear.length} Einheit${entriesInYear.length === 1 ? '' : 'en'}`,
      tipWrap: '', tipPos: 'bottom',
    },
  }, String(year)));

  const densityRatio = maxPerYear > 0 ? entriesInYear.length / maxPerYear : 0;
  row.appendChild(el('div', { className: 'chronik-year__marker', 'aria-hidden': 'true' },
    el('div', {
      className: `chronik-year__dot ${isEmpty ? 'chronik-year__dot--empty' : ''}`,
      style: isEmpty ? '' : `--density:${densityRatio}; transform:scale(${0.35 + densityRatio * 0.9});`,
    }),
  ));

  const pointsWrap = el('div', { className: 'chronik-year__points' });
  if (!isEmpty) {
    entriesInYear
      .sort((a, b) => (a.anchor.date || '').localeCompare(b.anchor.date || ''))
      .forEach(a => pointsWrap.appendChild(renderRecordPoint(a)));
  }
  row.appendChild(pointsWrap);
  return row;
}

function renderUndatedRow(undatedEntries) {
  const row = el('div', { className: 'chronik-year chronik-year--undated' });
  row.appendChild(el('div', { className: 'chronik-year__label' }, 'Undatiert'));
  row.appendChild(el('div', { className: 'chronik-year__marker', 'aria-hidden': 'true' },
    el('div', { className: 'chronik-year__dot chronik-year__dot--undated' }),
  ));

  // No mini stack any more: an undated record has no Zeitanker and therefore
  // exactly one origin, so the stack would consist of a single segment.
  const body = el('div', { className: 'chronik-year__points chronik-year__points--undated' });

  const chips = el('div', { className: 'chronik-undated-chips' });
  undatedEntries
    .sort((a, b) => (a.record['rico:identifier'] || '').localeCompare(b.record['rico:identifier'] || '', 'de-DE', { numeric: true }))
    .forEach(a => chips.appendChild(renderRecordPoint(a)));
  body.appendChild(chips);
  row.appendChild(body);
  return row;
}

function renderRecordPoint(annot) {
  const { record, year, anchor, fromLink, role } = annot;
  const rid = record['@id'];
  const sig = formatSignatur(record['rico:identifier']);
  const title = record['rico:title'] || '(ohne Titel)';
  const docType = getDocTypeId(record) || '';
  const docLabel = dftLabel(store, docType) || '';

  // Shown is the date the chip is standing on, that is the one of the Zeitanker.
  // Reading `rico:date` here instead would print a date that contradicts the
  // year row wherever a Verknuepfung dates the record. Only beyond the year
  // (day, month, span) does the date carry anything the axis does not show.
  const dateDisplay = formatDate(anchor.date) || '';
  const showDate = dateDisplay && year != null && dateDisplay !== String(year);

  // Label roh (ehrlich, Orts-Casing-Befund, Partner-Uebergabeliste); die
  // Auswahl samt Datums-Leak-Regel steht in der Datenschicht.
  const place = placeLabelFor(store, record);
  const decade = year != null ? String(Math.floor(year / 10) * 10) : 'undated';

  const children = [];
  // The accent takes the colour of the header segment the chip belongs to. An
  // undated record carries none: it has no Zeitanker, and the monochrome chip
  // says exactly that.
  const roleEntry = role ? roleScale.get(role) : null;
  if (roleEntry) {
    children.push(el('span', {
      className: 'chronik-point__accent', style: `background:${roleEntry.color};`,
      'aria-hidden': 'true',
    }));
  }
  children.push(el('span', { className: 'chronik-point__sig' }, sig));
  children.push(el('span', { className: 'chronik-point__title' }, title));
  if (showDate) children.push(el('span', { className: 'chronik-point__date' }, dateDisplay));
  if (docLabel && docType !== 'konvolut') {
    children.push(el('span', { className: `chronik-point__badge badge badge--${docType}` }, docLabel));
  }
  if (place) {
    children.push(el('span', { className: 'chronik-point__place' }, place));
  }
  // The chip sits in a year row it did not get from its own dating; the mark of
  // supplemented values says so once, instead of a dashed chip plus a sign
  // (Projektleitung, 2026-09-04). Together with the date beside it the chip
  // names which Verknuepfungsdatierung carries the year (task 8).
  if (fromLink) {
    children.push(el('span', {
      className: 'chronik-point__secondary mark-derived',
      dataset: { tip: `ergänzt: Jahr aus ${anchor.label}`, tipWrap: '' },
    }, anchor.label));
  }

  return el('button', {
    className: 'chronik-point',
    onClick: (e) => { e.stopPropagation(); selectRecord(rid); },
    dataset: {
      rid,
      decade,
      role: role || '',
      tip: `${sig} — ${title}${place ? ' · ' + place : ''}`,
      tipWrap: '',
    },
  }, ...children);
}
