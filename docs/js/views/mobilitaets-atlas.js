/**
 * M³GIM Mobilitäts-Atlas
 *
 * Dreiteilige gekoppelte Ansicht fuer store.mobilityEvents:
 *   - Karte (Leaflet + OpenStreetMap-Tiles)
 *   - Zeitstrahl (D3, horizontal mit Brush)
 *   - Detailpanel (Chip-Pattern, Klick-Durchstich zum Archiv)
 *
 * State: { selectedPlace, selectedRange, unverortetMode } im Closure
 * des Renderers. Jede Darstellung re-rendert bei State-Aenderung.
 */

import { el, clear } from '../utils/dom.js';
import { buildRoleChip } from './archiv-inline-detail.js';
import { formatDate } from '../utils/date-parser.js';

// Leaflet wird via CDN in index.html geladen und exportiert window.L
/* global L, d3 */

const MARKER_COLOR = '#004A8F';       // KUG-Blau
const MARKER_COLOR_SELECTED = '#2E7D4F'; // Signal-Grün
const ROLE_PALETTE = {
  ort:       '#4A7A9C',
  datum:     '#8A7F6F',
  person:    '#5C6C88',
  rolle:     '#9A6A5F',
  beziehung: '#6B7E55',
  finanz:    '#7A6F55',
  neutral:   '#8A7F6F',
};

/**
 * Haupteinstieg. Wird von main.js/TAB_RENDERERS beim ersten Aktivieren
 * des Tabs aufgerufen.
 */
export function renderMobilitaetsAtlas(store, container) {
  clear(container);
  const events = [...store.mobilityEvents.values()];
  const withGeo = events.filter(
    (e) => typeof e.placeLat === 'number' && typeof e.placeLon === 'number'
  );
  const unverortet = events.filter(
    (e) => !(typeof e.placeLat === 'number' && typeof e.placeLon === 'number')
  );

  // Kopfzeile
  const header = el('header', { className: 'atlas-header' },
    el('h2', { className: 'atlas-title' }, 'Mobilitäts-Atlas'),
    el('div', { className: 'atlas-subtitle' },
      'Raumzeitliche Aktivität aus SpatiotemporalEvents · '),
    el('div', { className: 'atlas-badges' },
      makeBadge(`${withGeo.length} verortet`, 'atlas-badge--ok'),
      makeBadge(`${unverortet.length} unverortet`, 'atlas-badge--warn', () => {
        setState({ unverortetMode: !state.unverortetMode,
                   selectedPlace: null, selectedRange: null });
      }),
    ),
  );
  container.appendChild(header);

  if (events.length === 0) {
    container.appendChild(el('div', { className: 'atlas-empty' },
      'Keine SpatiotemporalEvents im Graph. Pipeline und Reconciliation pruefen.'));
    return;
  }

  // Grid-Layout
  const grid = el('div', { className: 'atlas-grid' });
  const mapCell = el('div', { className: 'atlas-map', id: 'atlas-map' });
  const timelineCell = el('div', { className: 'atlas-timeline' });
  const panelCell = el('div', { className: 'atlas-panel' });
  grid.append(mapCell, panelCell, timelineCell);
  container.appendChild(grid);

  // State + Setter
  const state = {
    selectedPlace: null,  // QID (wd:Qxxx) oder null
    selectedRange: null,  // [year0, year1] oder null
    unverortetMode: false,
  };
  function setState(patch) {
    Object.assign(state, patch);
    renderTimeline();
    renderPanel();
    syncMarkers();
  }

  // ---- Karte ----------------------------------------------------------
  // Fallback-Bounds ueber Malaniuk-Raum (Europa)
  const fallbackBounds = [[40, -5], [60, 25]];
  const map = L.map(mapCell, { preferCanvas: true })
    .setView([48.2, 11.5], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  // Ort-Aggregation (pro QID ein Marker mit Event-Liste)
  const placeMap = new Map();
  for (const e of withGeo) {
    const key = e.placeWikidata || e.place;
    if (!placeMap.has(key)) {
      placeMap.set(key, {
        key, name: e.place, qid: e.placeWikidata,
        lat: e.placeLat, lon: e.placeLon,
        country: e.placeCountry, events: [],
      });
    }
    placeMap.get(key).events.push(e);
  }

  const markers = new Map();
  for (const p of placeMap.values()) {
    const marker = L.circleMarker([p.lat, p.lon], {
      radius: 6 + Math.min(12, p.events.length),
      weight: 2,
      color: MARKER_COLOR,
      fillColor: MARKER_COLOR,
      fillOpacity: 0.55,
    }).addTo(map);
    marker.bindPopup(() => buildPopup(p));
    marker.on('click', () => {
      setState({
        selectedPlace: p.key,
        selectedRange: null,
        unverortetMode: false,
      });
    });
    markers.set(p.key, marker);
  }

  // Initial-Bounds: alle verorteten Orte
  if (placeMap.size > 0) {
    const latlngs = [...placeMap.values()].map(p => [p.lat, p.lon]);
    map.fitBounds(latlngs, { padding: [40, 40], maxZoom: 6 });
  } else {
    map.fitBounds(fallbackBounds);
  }
  // Leaflet braucht Reflow, wenn der Container initial hidden war
  setTimeout(() => map.invalidateSize(), 50);

  function syncMarkers() {
    for (const [key, marker] of markers) {
      const isActive = state.selectedPlace === key;
      const inRange = eventsInRange(placeMap.get(key).events).length > 0;
      marker.setStyle({
        color: isActive ? MARKER_COLOR_SELECTED : MARKER_COLOR,
        fillColor: isActive ? MARKER_COLOR_SELECTED : MARKER_COLOR,
        fillOpacity: inRange ? 0.55 : 0.15,
        weight: isActive ? 3 : 2,
      });
    }
  }

  // ---- Zeitstrahl -----------------------------------------------------
  const datedEvents = events.filter(e => parseYear(e.date) != null);
  const years = datedEvents.map(e => parseYear(e.date));
  const minYear = years.length ? Math.min(...years) : 1940;
  const maxYear = years.length ? Math.max(...years) : 1980;

  function renderTimeline() {
    clear(timelineCell);
    const width = timelineCell.clientWidth || 800;
    const height = 70;
    const margin = { top: 10, right: 20, bottom: 22, left: 20 };

    const svg = d3.select(timelineCell).append('svg')
      .attr('width', width)
      .attr('height', height);

    const x = d3.scaleLinear()
      .domain([minYear - 1, maxYear + 1])
      .range([margin.left, width - margin.right]);

    svg.append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(Math.min(12, maxYear - minYear + 2)))
      .selectAll('text')
        .style('font-family', 'var(--font-mono, monospace)')
        .style('font-size', '10px');

    const eventY = height - margin.bottom - 16;
    svg.append('g').selectAll('circle')
      .data(datedEvents)
      .enter().append('circle')
        .attr('cx', d => x(parseYear(d.date)))
        .attr('cy', eventY)
        .attr('r', d => state.selectedPlace && (d.placeWikidata || d.place) === state.selectedPlace ? 5 : 3.5)
        .attr('fill', d => ROLE_PALETTE[clusterForEvent(d)] || ROLE_PALETTE.neutral)
        .attr('fill-opacity', 0.75)
        .attr('stroke', d => state.selectedPlace && (d.placeWikidata || d.place) === state.selectedPlace ? MARKER_COLOR_SELECTED : 'transparent')
        .attr('stroke-width', 1.5)
        .on('click', (_, d) => {
          const key = d.placeWikidata || d.place;
          setState({ selectedPlace: key, selectedRange: null, unverortetMode: false });
        })
      .append('title').text(d => `${d.place || '?'} · ${d.date} · ${d.role || ''}`);

    // Brush
    const brush = d3.brushX()
      .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
      .on('end', (event) => {
        if (!event.selection) {
          if (state.selectedRange) setState({ selectedRange: null });
          return;
        }
        const [x0, x1] = event.selection.map(x.invert);
        setState({ selectedRange: [Math.floor(x0), Math.ceil(x1)], unverortetMode: false });
      });
    svg.append('g').attr('class', 'atlas-brush').call(brush);
  }

  // ---- Detailpanel ----------------------------------------------------
  function renderPanel() {
    clear(panelCell);
    const heading = el('div', { className: 'atlas-panel__heading' },
      el('span', { className: 'atlas-panel__kicker' }, 'AUSWAHL'),
      el('h3', { className: 'atlas-panel__title' }, panelTitle()));
    panelCell.appendChild(heading);

    const list = state.unverortetMode
      ? unverortet
      : filteredEvents();

    if (list.length === 0) {
      panelCell.appendChild(el('div', { className: 'atlas-panel__empty' },
        'Kein Event in der aktuellen Auswahl. Marker oder Zeitstrahl klicken.'));
      return;
    }

    const wrap = el('div', { className: 'atlas-panel__chips' });
    for (const ev of list) {
      wrap.appendChild(buildEventChip(ev));
    }
    panelCell.appendChild(wrap);
  }

  // ---- Initial render -------------------------------------------------
  renderTimeline();
  renderPanel();
  syncMarkers();

  // ---- Hilfsfunktionen (closures ueber state) -------------------------

  function eventsInRange(list) {
    if (!state.selectedRange) return list;
    const [y0, y1] = state.selectedRange;
    return list.filter(e => {
      const y = parseYear(e.date);
      return y != null && y >= y0 && y <= y1;
    });
  }

  function filteredEvents() {
    let list = state.selectedPlace
      ? (placeMap.get(state.selectedPlace)?.events || [])
      : withGeo;
    list = eventsInRange(list);
    return list.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }

  function panelTitle() {
    if (state.unverortetMode) return `Unverortete Events (${unverortet.length})`;
    if (state.selectedPlace) {
      const p = placeMap.get(state.selectedPlace);
      return p ? p.name + (p.country ? ' · ' + p.country : '') : 'Auswahl';
    }
    if (state.selectedRange) {
      return `Zeitraum ${state.selectedRange[0]}–${state.selectedRange[1]}`;
    }
    return `Alle verorteten Events (${withGeo.length})`;
  }

  function buildPopup(p) {
    const root = el('div', { className: 'atlas-popup' },
      el('div', { className: 'atlas-popup__title' }, p.name),
      p.country ? el('div', { className: 'atlas-popup__meta' }, p.country) : null,
      p.qid ? el('div', { className: 'atlas-popup__qid' }, p.qid) : null,
      el('div', { className: 'atlas-popup__count' },
        `${p.events.length} Event${p.events.length === 1 ? '' : 's'}`),
    );
    return root;
  }

  function buildEventChip(ev) {
    const date = ev.date ? formatDate(ev.date) || ev.date : '—';
    const placeLabel = ev.place || 'unbekannt';
    const reason = typeof ev.placeLat !== 'number' ? reasonForUnverortet(ev) : null;
    return buildRoleChip({
      prefix: (ev.role || 'EVENT'),
      value: `${placeLabel} · ${date}${reason ? ' · ' + reason : ''}`,
      xlsxSource: ev.xlsxSource,
      wikidata: ev.placeWikidata,
      tip: ev.id,
      onClick: () => {
        if (!ev.recordId) return;
        window.location.hash = '#archiv/' + encodeURIComponent(ev.recordId);
      },
    });
  }
}

// ---- Freistehende Helper ----------------------------------------------

function makeBadge(label, cls, onClick) {
  const attrs = { className: `atlas-badge ${cls || ''}` };
  if (onClick) {
    attrs.onClick = onClick;
    attrs.className += ' atlas-badge--clickable';
    attrs.role = 'button';
    attrs.tabindex = '0';
  }
  return el('span', attrs, label);
}

function parseYear(iso) {
  if (!iso) return null;
  const m = String(iso).match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}

function clusterForEvent(ev) {
  const role = (ev.role || '').toLowerCase();
  if (/datum$/.test(role)) return 'datum';
  if (role.includes('auffuehrung') || role.includes('aufführung')
      || role.includes('gastspiel') || role.includes('premiere')
      || role.includes('spielzeit') || role.includes('wiederaufnahme')) {
    return 'ort';
  }
  return 'neutral';
}

function reasonForUnverortet(ev) {
  if (!ev.placeWikidata) return 'ohne Q-ID';
  return 'Q-ID ohne Koordinaten';
}
