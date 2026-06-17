/**
 * M³GIM Archiv Chronik View — scrollender Jahres-Zeitstrahl.
 * Records werden pro Jahr als Punkte/Chips an einer vertikalen Zeitlinie
 * angeordnet. Jahre ohne Records bleiben sichtbar (Erschliessungsspiegel),
 * Undatiertes landet am Ende. Die Toolbar (Suche, Typ, Person, Ort, Werk)
 * filtert die Record-Menge; Filter und Jahres-Gliederung sind unabhaengig.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur, getDocTypeId, ensureArray } from '../utils/format.js';
import { extractYear, formatDate } from '../utils/date-parser.js';
import { DOKUMENTTYP_LABELS } from '../data/constants.js';
import { buildFilterToolbar } from './_archive-toolbar.js';
import { filterByToolbarState, isToolbarFiltered, searchMatchChronik } from './_archive-filter.js';
import { logStamp } from '../utils/env.js';
import { selectRecord } from '../ui/router.js';
import { onViewNavigate } from '../ui/events.js';

let store = null;
let container = null;
let toolbar = null;
let viewContainer = null;

/** Ira Malaniuks Lebensspanne. Records davor/danach werden trotzdem gerendert
 *  (als zusaetzliche Jahresblocke vor/nach dem Band), damit der Nachlass-Stand
 *  ehrlich bleibt.  */
const YEAR_MIN = 1919;
const YEAR_MAX = 2009;

export function renderChronik(storeRef, containerEl) {
  store = storeRef;
  container = containerEl;
  clear(container);

  toolbar = buildFilterToolbar(store, {
    onChange: () => updateChronikView(),
  });
  container.appendChild(toolbar.element);

  viewContainer = el('div', { className: 'chronik-timeline-container' });
  container.appendChild(viewContainer);

  updateChronikView();

  // Chip-Klick in Inline-Detail dispatcht `filter` -> Toolbar hier setzen.
  onViewNavigate('chronik', (detail) => {
    const { filter } = detail || {};
    if (filter && filter.value) {
      if (filter.facet === 'person') toolbar.setPerson(filter.value);
      else if (filter.facet === 'location') toolbar.setLocation(filter.value);
      else if (filter.facet === 'werk') toolbar.setWerk(filter.value);
    }
  });
}

function updateChronikView() {
  const state = toolbar ? toolbar.getState() : {};
  clear(viewContainer);

  // Bearbeitete Records (die unverknuepften Massenrecords waeren als Punkte
  // nicht ansprechbar und wuerden den Zeitstrahl mit Platzhaltern fluten).
  let records = store.allRecords.filter(r => !store.unprocessedIds.has(r['@id']));

  // Fuenf Toolbar-Facetten (geteilte Pipeline mit Bestand, Tier 2.6).
  // Chronik filtert nackte Records -> getRecord ist Identity; Suche nur
  // Signatur + Titel (searchMatchChronik).
  records = filterByToolbarState(store, records, state, {
    getRecord: (r) => r,
    searchMatch: searchMatchChronik,
  });

  // Records nach Jahr gruppieren. extractYear liefert die erste vierstellige
  // Jahreszahl aus rico:date; fuer typisierte Datumsfelder (absendedatum etc.)
  // ist der Fallback in indexByYear schon im Loader -- hier halten wir die
  // View-Logik aber an rico:date fest, damit ein Record genau einem Punkt
  // entspricht und nicht dupliziert wird.
  const byYear = new Map();
  let undated = 0;
  for (const r of records) {
    const y = extractYear(r['rico:date']);
    if (typeof y === 'number' && Number.isFinite(y)) {
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y).push(r);
    } else {
      undated++;
    }
  }

  // Jahresraster: mindestens YEAR_MIN..YEAR_MAX, plus vorhandene Aussreisser.
  const years = [...byYear.keys()];
  const min = Math.min(YEAR_MIN, ...(years.length ? years : [YEAR_MIN]));
  const max = Math.max(YEAR_MAX, ...(years.length ? years : [YEAR_MAX]));

  // Max-Records-pro-Jahr fuer die Dichte-Skalierung der Jahres-Punkte.
  let maxPerYear = 0;
  for (const arr of byYear.values()) {
    if (arr.length > maxPerYear) maxPerYear = arr.length;
  }

  const isFiltered = isToolbarFiltered(state);

  const timeline = el('div', { className: 'chronik-timeline' });
  timeline.appendChild(el('div', { className: 'chronik-timeline__axis', 'aria-hidden': 'true' }));

  const isEmptyDecadeBoundary = (y) => y % 10 === 0;
  for (let y = min; y <= max; y++) {
    timeline.appendChild(renderYearRow(y, byYear.get(y) || [], maxPerYear, isEmptyDecadeBoundary(y)));
  }

  if (undated > 0) {
    timeline.appendChild(renderUndatedRow(records.filter(r => {
      const yr = extractYear(r['rico:date']);
      return !(typeof yr === 'number' && Number.isFinite(yr));
    })));
  }

  viewContainer.appendChild(timeline);

  // Count-Anzeige an der Toolbar
  const total = store.allRecords.filter(r => !store.unprocessedIds.has(r['@id'])).length;
  if (toolbar) {
    toolbar.setCount(isFiltered
      ? `${records.length} von ${total} Einheiten mit Datum / undatiert`
      : `${total} Einheiten`);
  }

  logStamp('chronik', [
    ['records', records.length],
    ['jahre-belegt', byYear.size],
    ['undatiert', undated],
    ['spanne', `${min}\u2013${max}`],
    ['gefiltert', isFiltered ? 'ja' : ''],
  ]);
}

function renderYearRow(year, recordsInYear, maxPerYear, isDecadeBoundary) {
  const isEmpty = recordsInYear.length === 0;
  const row = el('div', {
    className: `chronik-year ${isEmpty ? 'chronik-year--empty' : ''} ${isDecadeBoundary ? 'chronik-year--decade' : ''}`,
    dataset: { year: String(year) },
  });

  // Left: year label on axis
  row.appendChild(el('div', {
    className: 'chronik-year__label',
    title: isEmpty ? 'Kein bearbeitetes Material mit diesem Jahr' : `${recordsInYear.length} Einheit${recordsInYear.length === 1 ? '' : 'en'}`,
  }, String(year)));

  // Center: axis dot scaled by density
  const densityRatio = maxPerYear > 0 ? recordsInYear.length / maxPerYear : 0;
  row.appendChild(el('div', { className: 'chronik-year__marker', 'aria-hidden': 'true' },
    el('div', {
      className: `chronik-year__dot ${isEmpty ? 'chronik-year__dot--empty' : ''}`,
      style: isEmpty
        ? ''
        : `--density:${densityRatio}; transform:scale(${0.35 + densityRatio * 0.9});`,
    }),
  ));

  // Right: records as points
  const pointsWrap = el('div', { className: 'chronik-year__points' });
  if (!isEmpty) {
    recordsInYear
      .sort((a, b) => (a['rico:date'] || '').localeCompare(b['rico:date'] || ''))
      .forEach(r => pointsWrap.appendChild(renderRecordPoint(r)));
  }
  row.appendChild(pointsWrap);

  return row;
}

function renderUndatedRow(undatedRecords) {
  const row = el('div', { className: 'chronik-year chronik-year--undated' });
  row.appendChild(el('div', { className: 'chronik-year__label' }, 'Undatiert'));
  row.appendChild(el('div', { className: 'chronik-year__marker', 'aria-hidden': 'true' },
    el('div', { className: 'chronik-year__dot chronik-year__dot--undated' }),
  ));
  const pointsWrap = el('div', { className: 'chronik-year__points' });
  undatedRecords
    .sort((a, b) => (a['rico:identifier'] || '').localeCompare(b['rico:identifier'] || '', 'de-DE', { numeric: true }))
    .forEach(r => pointsWrap.appendChild(renderRecordPoint(r)));
  row.appendChild(pointsWrap);
  return row;
}

function renderRecordPoint(record) {
  const rid = record['@id'];
  const sig = formatSignatur(record['rico:identifier']);
  const title = record['rico:title'] || '(ohne Titel)';
  const docType = getDocTypeId(record) || '';
  const docLabel = DOKUMENTTYP_LABELS[docType] || docType || '';
  const dateDisplay = formatDate(record['rico:date']) || '';

  // Primaer-Ort aus m3gim:SpatiotemporalEvent (falls vorhanden), sonst
  // erster rico:hasOrHadLocation. Nur Name, keine Event-Rolle -- das ist
  // Leseanker, nicht semantische Spezifikation.
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

  return el('button', {
    className: `chronik-point chronik-point--${docType}`,
    onClick: (e) => { e.stopPropagation(); selectRecord(rid); },
    dataset: { tip: `${sig} — ${title}${place ? ' · ' + place : ''}`, tipWrap: '' },
  },
    el('span', { className: 'chronik-point__date' }, dateDisplay),
    el('span', { className: 'chronik-point__sig' }, sig),
    el('span', { className: 'chronik-point__title' }, title),
    docLabel && docType !== 'konvolut'
      ? el('span', { className: `chronik-point__badge badge badge--${docType}` }, docLabel)
      : null,
    place
      ? el('span', { className: 'chronik-point__place' }, place)
      : null,
  );
}
