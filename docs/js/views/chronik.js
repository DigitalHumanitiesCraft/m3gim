/**
 * M³GIM Mobilitäts-Chronik — scrollender Jahres-Zeitstrahl.
 * Records hängen als Chips an der Jahresachse; ein linker Akzent kodiert die
 * dominante Mobilitätssicht (geteilte SICHT_COLOR, Karte/Statistik). Records
 * ohne verortete Annotation bleiben monochrom — die Monochromie IST das Signal
 * "keine Sicht erschlossen". Leere Jahre bleiben sichtbar (Erschließungsspiegel,
 * E-88), undatierte landen am Ende; einige lassen sich sekundär datieren (über
 * die ranghöchste ankernde Datierung) und wandern markiert in ihre Jahreszeile. Ein
 * kollabierbarer Dekaden×Sicht-Header zeigt die zeitliche Entwicklung als
 * Aggregat, das per Klick auf seine belegenden Chips auflöst.
 */

import { el, clear, scrollBehavior } from '../utils/dom.js';
import { formatSignatur, getDocTypeId, ensureArray, dftLabel } from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { primaryYear } from '../data/loader.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { filterBySharedState, isSharedFiltered, searchMatchChronik, sharedFacetsActive } from './_bestand-filter.js';
import {
  sichtForRecord, aggregateDecadeStacks, SICHTEN, SICHT_COLOR,
} from './chronik-data.js';
import { logStamp } from '../utils/env.js';
import { selectRecord } from '../ui/router.js';
import { getFilter } from '../ui/filter-state.js';
import { yearBounds, baseRecords, YEAR_MIN, YEAR_MAX } from '../data/records-for.js';
import { applyZeitfenster } from '../ui/filter-sync.js';

let store = null;
let container = null;
let sidebar = null;
let viewContainer = null;
let visibleRecords = 0;    // Dokumente im Bild, fuer den Statusblock der Sidebar
let activeSegment = null;  // "decade|sicht" des aktiven Header-Segments

// Records vor YEAR_MIN und nach YEAR_MAX werden trotzdem gerendert (als
// zusaetzliche Jahresblocke vor/nach dem Band), damit der Nachlass-Stand
// ehrlich bleibt.

// Segment-Reihenfolge im Dekaden-Stapel: die fuenf Sichten, dann neutral.
const SICHT_ORDER = [...SICHTEN.map(s => s.id), 'neutral'];
const SICHT_LABEL = Object.fromEntries(SICHTEN.map(s => [s.id, s.label]));
SICHT_LABEL.neutral = 'ohne Sicht';

export function renderChronik(storeRef, containerEl) {
  store = storeRef;
  container = containerEl;
  clear(container);

  const main = el('div', { className: 'view-main archiv-main' });
  viewContainer = el('div', { className: 'chronik-timeline-container' });
  main.appendChild(viewContainer);

  if (sidebar) sidebar.destroy();
  sidebar = createSidebar(store, {
    yearSpan: yearBounds(store),
    getCount: () => visibleRecords,
    search: { placeholder: 'Signatur oder Titel' },
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

  // Der Zeitstrahl traegt den Bestand mit Erschliessungsstand; was davon
  // erscheint, entscheidet die Erschliessungsstand-Facette der geteilten Spalte
  // (E-162, Beschraenkung auf die drei Staende 2026-09-03).
  let records = baseRecords(store);

  // Alle schneidenden Facetten (inkl. Dokumenttyp) plus Freitext.
  records = filterBySharedState(store, records, shared, {
    getRecord: (r) => r,
    searchMatch: searchMatchChronik,
  });

  // On-Top-Facette: das Zeitfenster. Records sind nackt.
  records = applyZeitfenster(records, shared.zeitfenster, (r) => r, store);
  visibleRecords = records.length;
  if (sidebar) sidebar.update();

  // Pro Record einmal annotieren: Sicht (aus den verorteten Annotationen) +
  // Anzeigejahr. Der Zeitanker ist kanonisch rico:date (E-88); fehlt er, nennt
  // primaryYear die ranghoechste ankernde Datierung als SEKUNDAERE Herkunft,
  // die sichtbar markiert bleibt und nie mit rico:date gleichgesetzt wird
  // ("ein Record = ein Punkt").
  const annotated = records.map(r => {
    const sichtInfo = sichtForRecord(store, r['@id']);
    const anchor = primaryYear(store, r);
    const year = Number.isFinite(anchor.year) ? anchor.year : null;
    const secondary = (year != null && anchor.source !== 'rico:date') ? anchor : null;
    return { record: r, sichtInfo, year, secondary };
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
  const secondaryCount = annotated.filter(a => a.secondary).length;
  const sichtCovered = annotated.filter(a => a.sichtInfo.hasSte).length;

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

  const stacks = aggregateDecadeStacks(annotated.map(a => ({ year: a.year, sicht: a.sichtInfo.sicht })));
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
    ['sekundaer', secondaryCount],
    ['undatiert', undated.length],
    ['sicht-gedeckt', sichtCovered],
    ['spanne', `${min}–${max}`],
    ['gefiltert', isFiltered ? 'ja' : ''],
  ]);
}

/** Kollabierbarer Dekaden×Sicht-Stapel: zeitliche Entwicklung als Aggregat,
 *  das per Klick auf seine belegenden Chips auflöst. */
function renderDecadeHeader(stacks) {
  if (!stacks.rows.length) return null;
  const maxTotal = Math.max(...stacks.rows.map(r => r.total), 1);

  const wrap = el('div', { className: 'chronik-decades' });

  const legend = el('ul', { className: 'chronik-decades__legend' });
  for (const sid of SICHT_ORDER) {
    // Nur Sichten zeigen, die im aktuellen Schnitt vorkommen.
    if (!stacks.rows.some(r => r.bySicht[sid])) continue;
    legend.appendChild(el('li', { className: 'chronik-decades__legend-item' },
      el('span', { className: 'chronik-decades__swatch', style: `background:${SICHT_COLOR[sid] || SICHT_COLOR.neutral};` }),
      SICHT_LABEL[sid] || sid,
    ));
  }

  const head = el('div', { className: 'chronik-decades__head' },
    el('span', { className: 'chronik-decades__title' }, 'Jahrzehnte nach Mobilitätssicht'),
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
      for (const sid of SICHT_ORDER) {
        const c = row.bySicht[sid];
        if (!c) continue;
        const seg = el('button', {
          className: 'chronik-decades__seg',
          style: `flex:${c} 0 0; background:${SICHT_COLOR[sid] || SICHT_COLOR.neutral};`,
          dataset: { tip: `${row.decade}er · ${SICHT_LABEL[sid] || sid}: ${c}`, tipWrap: '' },
          'aria-label': `${row.decade}er, ${SICHT_LABEL[sid] || sid}: ${c} Einheiten`,
          onClick: () => toggleSegment(row.decade, sid),
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
function toggleSegment(decade, sicht) {
  const key = `${decade}|${sicht}`;
  const points = viewContainer.querySelectorAll('.chronik-point');
  if (activeSegment === key) {
    activeSegment = null;
    points.forEach(p => p.classList.remove('chronik-point--dim', 'chronik-point--hit'));
    return;
  }
  activeSegment = key;
  let first = null;
  points.forEach(p => {
    const match = p.dataset.decade === String(decade) && (p.dataset.sicht || 'neutral') === sicht;
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
      .sort((a, b) => (a.record['rico:date'] || '').localeCompare(b.record['rico:date'] || ''))
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

  const body = el('div', { className: 'chronik-year__points chronik-year__points--undated' });

  // Sicht-Mini-Stapel als Kopf: zeigt, dass das Datum-Loch v.a. die korrespon-
  // denz-lastigen Ortsrollen betrifft (E-110, bewusst datumslos).
  const counts = new Map();
  for (const a of undatedEntries) {
    const s = a.sichtInfo.sicht || 'neutral';
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  if (counts.size > 0) {
    const miniLine = el('div', { className: 'chronik-undated-mini-line' });
    const mini = el('div', { className: 'chronik-undated-mini', 'aria-hidden': 'true' });
    for (const sid of SICHT_ORDER) {
      const c = counts.get(sid);
      if (!c) continue;
      mini.appendChild(el('span', {
        className: 'chronik-undated-mini__seg',
        style: `flex:${c} 0 0; background:${SICHT_COLOR[sid] || SICHT_COLOR.neutral};`,
        dataset: { tip: `${SICHT_LABEL[sid] || sid}: ${c}`, tipWrap: '' },
      }));
    }
    miniLine.appendChild(mini);
    body.appendChild(miniLine);
  }

  const chips = el('div', { className: 'chronik-undated-chips' });
  undatedEntries
    .sort((a, b) => (a.record['rico:identifier'] || '').localeCompare(b.record['rico:identifier'] || '', 'de-DE', { numeric: true }))
    .forEach(a => chips.appendChild(renderRecordPoint(a)));
  body.appendChild(chips);
  row.appendChild(body);
  return row;
}

function renderRecordPoint(annot) {
  const { record, sichtInfo, year, secondary } = annot;
  const rid = record['@id'];
  const sig = formatSignatur(record['rico:identifier']);
  const title = record['rico:title'] || '(ohne Titel)';
  const docType = getDocTypeId(record) || '';
  const docLabel = dftLabel(store, docType) || '';

  // Datum nur zeigen, wenn es ueber die (an der Achse stehende) Jahreszahl
  // hinaus Information traegt (Tag/Monat). Reine Jahresangabe ist redundant.
  const dateDisplay = formatDate(record['rico:date']) || '';
  const showDate = dateDisplay && year != null && dateDisplay !== String(year);

  // Primaer-Ort: Ort der ersten verorteten Annotation, sonst erster
  // rico:hasOrHadLocation. Label roh (ehrlich, Orts-Casing-Befund,
  // Partner-Uebergabeliste).
  let place = '';
  const eventIds = store.recordToEvents?.get(rid) || [];
  if (eventIds.length > 0) {
    const ev = store.mobilityEvents.get(eventIds[0]);
    if (ev && ev.place) place = ev.place;
  }
  if (!place) {
    const locs = ensureArray(record['rico:hasOrHadLocation']);
    if (locs.length > 0) place = locs[0].name || '';
  }
  const decade = year != null ? String(Math.floor(year / 10) * 10) : 'undated';

  const children = [];
  // Sicht-Akzent: nur wenn ein STE existiert. Divergierend -> Mehrfach-Verlauf,
  // sonst Vollton; 'neutral' (STE ohne Sicht) -> graue Spur, kein STE -> kein Akzent.
  if (sichtInfo.hasSte) {
    let bg;
    if (sichtInfo.divergent && sichtInfo.sichten.length > 1) {
      const cols = sichtInfo.sichten.slice(0, 3).map(s => SICHT_COLOR[s] || SICHT_COLOR.neutral);
      bg = `linear-gradient(${cols.join(', ')})`;
    } else {
      bg = SICHT_COLOR[sichtInfo.sicht] || SICHT_COLOR.neutral;
    }
    children.push(el('span', { className: 'chronik-point__accent', style: `background:${bg};`, 'aria-hidden': 'true' }));
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
  // The chip sits in a year row it did not get from its own date; the mark of
  // supplemented values says so once, instead of a dashed chip plus a sign
  // (Projektleitung, 2026-09-04).
  if (secondary) {
    children.push(el('span', {
      className: 'chronik-point__secondary mark-derived',
      dataset: { tip: `ergänzt: Jahr aus ${secondary.label}`, tipWrap: '' },
    }, secondary.label));
  }

  return el('button', {
    className: `chronik-point ${sichtInfo.hasSte ? '' : 'chronik-point--nosicht'}`,
    onClick: (e) => { e.stopPropagation(); selectRecord(rid); },
    dataset: {
      rid,
      decade,
      sicht: sichtInfo.sicht || 'neutral',
      tip: `${sig} — ${title}${place ? ' · ' + place : ''}`,
      tipWrap: '',
    },
  }, ...children);
}
