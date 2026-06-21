/**
 * M³GIM Mobilitäts-View (E-111, D3-geo Trajektorie)
 *
 * Forschungswerkzeug fuer die raumzeitliche Mobilitaet Ira Malaniuks. Die
 * Karte ist das Zentrum und nimmt die volle Breite ein: eine projizierte
 * Stummkarte (D3-geo, lokale Ländergeometrie, keine externen Kartenserver),
 * Orte als Knoten farbcodiert nach Mobilitaetssicht, der biografische Pfad
 * als gerichtete, chronologisch eingefaerbte Pfeile zwischen den Orten.
 *
 * Statt beschreibender Texte traegt die Seite Bedienelemente: ein Zeitregler
 * mit Abspielen faehrt die Jahre ab und zeichnet den Pfad fortlaufend, die
 * Sicht-Legende filtert Knoten, Pfad und Detailstreifen zugleich. Datumslose
 * und unverortete Ereignisse stehen sichtbar (Knoten ohne Pfadanschluss bzw.
 * abseits der Karte), statt kaschiert zu werden.
 *
 * Pfad-Semantik: die datierten, verorteten Ereignisse werden chronologisch
 * geordnet und aufeinanderfolgende verschiedene Staedte mit einem Pfeil
 * verbunden. Echte Brief-Quelle-Ziel-Paare sind im Bestand zu duenn fuer
 * eine eigene Wegschicht (4 Absende-/Abreiseorte gegen 11 Zielorte); der
 * tragfaehige Pfad ist die biografische Trajektorie ueber die Karriere.
 *
 * Klassifikation lokal, deckt sich seit E-110 mit dem globalen
 * `mobilityClusterFor`, bleibt hier feiner (eigener Block fuer Nicht-
 * Mobilitaets-Ortsrollen: Entstehung, Erwaehnung, Auftrag).
 */

import { el, clear } from '../utils/dom.js';
import { buildRoleChip } from './archive-inline-detail.js';
import { cityOf } from '../utils/format.js';
import { formatDate, extractYear } from '../utils/date-parser.js';
import { logStamp } from '../utils/env.js';

/* global d3 */

const GEO_URL = 'data/geo/countries-110m.geo.json';
let COUNTRIES = null;  // module-level cache, ueber Tab-Wechsel hinweg

const SICHTEN = [
  {
    id: 'performativ', label: 'Performativ', frage: 'Wo trat sie auf?', color: '#3F5C8E',
    roles: ['auftritt', 'aufführung', 'auffuehrung', 'gastspiel', 'premiere',
      'wiederaufnahme', 'festvorstellung', 'probe', 'probenbeginn',
      'auftrittsdatum', 'auffuehrungsdatum', 'aufführungsdatum', 'probendatum',
      'premieredatum'],
  },
  {
    id: 'institutionell', label: 'Institutionell', frage: 'Wo war sie engagiert?', color: '#4A7A89',
    roles: ['spielzeit', 'spielzeitvon', 'spielzeitbis'],
  },
  {
    id: 'reise', label: 'Reise & Korrespondenz', frage: 'Woher, wohin, an wen?', color: '#A6844B',
    roles: ['zielort', 'absendeort', 'abreiseort', 'empfangsort', 'vertragsort',
      'absendedatum', 'empfangsdatum', 'abreisedatum'],
  },
  {
    id: 'diskursiv', label: 'Diskursiv', frage: 'Wo wurde über sie berichtet?', color: '#7A6F55',
    roles: ['erscheinungsdatum', 'ausstrahlung', 'ausstrahlungsdatum'],
  },
  {
    id: 'biografisch', label: 'Biografisch', frage: 'Wo wohnte und lebte sie?', color: '#8B6F5C',
    roles: ['wohnort', 'ausstellungsdatum', 'gespräch', 'gespraech'],
  },
];
const KONTEXT = {
  id: 'kontext', label: 'Weiterer Ortsbezug', frage: 'Sonstiger Ortsbezug', color: '#B0A99B',
  roles: ['entstehung', 'erwähnt', 'erwaehnt', 'auftrag'],
};
const ALL_TYPES = [...SICHTEN, KONTEXT];
const TYPE_BY_ID = new Map(ALL_TYPES.map(t => [t.id, t]));
const ROLE_TO_TYPE = (() => {
  const m = new Map();
  for (const t of ALL_TYPES) for (const r of t.roles) m.set(r, t.id);
  return m;
})();

const sichtOf = ev => ROLE_TO_TYPE.get(String(ev.role || '').trim().toLowerCase()) || KONTEXT.id;
const colorOf = id => (TYPE_BY_ID.get(id) || KONTEXT).color;
const hasGeo = ev => typeof ev.placeLat === 'number' && typeof ev.placeLon === 'number';

// ---------------------------------------------------------------------------
// Haupteinstieg
// ---------------------------------------------------------------------------

export function renderMobilitaet(store, container) {
  clear(container);
  const events = [...store.mobilityEvents.values()];

  const wrap = el('div', { className: 'mobilitaet' });
  container.appendChild(wrap);

  if (events.length === 0) {
    wrap.appendChild(el('div', { className: 'mob-empty' }, 'Keine raumzeitlichen Ereignisse im Datenstand.'));
    return;
  }
  if (typeof d3 === 'undefined') {
    wrap.appendChild(el('div', { className: 'mob-empty' }, 'D3 ist nicht geladen, die Karte kann nicht gezeichnet werden.'));
    return;
  }

  const withGeo = events.filter(hasGeo);
  const unverortet = events.filter(e => !hasGeo(e));
  const datedYears = events.map(e => extractYear(e.date)).filter(y => y != null);
  const minYear = datedYears.length ? Math.min(...datedYears) : 1940;
  const maxYear = datedYears.length ? Math.max(...datedYears) : 1980;

  // Gemeinsamer Filter-State
  const state = {
    active: new Set(ALL_TYPES.map(t => t.id)),
    showPath: true,
    cursor: maxYear,       // Zeitregler: Pfad bis zu diesem Jahr
    selectedCity: null,
    playing: false,
    timer: null,
  };

  // ---- Bedienleiste: Sicht-Filter + Pfad-Schalter ----
  const controls = el('div', { className: 'mob-controls' });
  controls.appendChild(buildLegend(events, state, () => redraw()));
  const layerBox = el('div', { className: 'mob-layers' });
  const pathToggle = el('button', { className: 'mob-toggle mob-toggle--on', type: 'button' },
    el('span', { className: 'mob-toggle__dot' }), 'Pfad');
  pathToggle.addEventListener('click', () => {
    state.showPath = !state.showPath;
    pathToggle.classList.toggle('mob-toggle--on', state.showPath);
    redraw();
  });
  layerBox.appendChild(pathToggle);
  controls.appendChild(layerBox);
  wrap.appendChild(controls);

  // ---- Karte (volle Breite) ----
  const mapCell = el('div', { className: 'mob-map' });
  wrap.appendChild(mapCell);

  // ---- Zeitregler ----
  const scrubber = buildScrubber(state, minYear, maxYear, () => redraw());
  wrap.appendChild(scrubber.elementWrap);

  // ---- Detailstreifen + Statuszeile ----
  const strip = el('div', { className: 'mob-strip' });
  wrap.appendChild(strip);

  // ---- einklappbare Voll-Liste (Pruefbarkeit) ----
  wrap.appendChild(buildBackbone(events));

  // Zeichenfunktion (wird nach Geometrie-Load und bei jeder State-Aenderung gerufen)
  let draw = () => {};
  function redraw() { draw(); renderStrip(); scrubber.update(); }

  function renderStrip() {
    clear(strip);
    const active = e => state.active.has(sichtOf(e));
    let list, title;
    if (state.selectedCity) {
      list = events.filter(e => active(e) && cityOf(e.place) === state.selectedCity);
      title = state.selectedCity;
    } else {
      // Statuszeile statt Prosa: was die aktuelle Auswahl umfasst
      const shown = withGeo.filter(active).length;
      strip.appendChild(el('div', { className: 'mob-strip__status' },
        el('span', {}, `${shown} verortet`),
        el('span', {}, `${events.filter(active).length} Ereignisse`),
        unverortet.length ? makeUnverortetButton(unverortet, state, strip, renderStrip) : null,
        (state.offMapEvents && state.offMapEvents.length)
          ? makeOffMapButton(state, strip, renderStrip) : null,
        el('span', { className: 'mob-strip__hint' }, 'Knoten anklicken für Details')));
      return;
    }
    strip.appendChild(el('div', { className: 'mob-strip__head' },
      el('h3', { className: 'mob-strip__title' }, title),
      el('button', { className: 'mob-strip__clear', type: 'button',
        onClick: () => { state.selectedCity = null; redraw(); } }, 'Auswahl lösen')));
    const chips = el('div', { className: 'mob-strip__chips' });
    for (const ev of sortEvents(list)) chips.appendChild(buildEventChip(ev));
    strip.appendChild(chips);
  }

  // Geometrie laden (gecacht), dann zeichnen
  mapCell.appendChild(el('div', { className: 'mob-map__loading' }, 'Karte wird geladen …'));
  loadCountries().then(countries => {
    draw = buildMap(mapCell, countries, withGeo, state, {
      minYear, maxYear,
      onSelectCity: city => { state.selectedCity = state.selectedCity === city ? null : city; redraw(); },
    });
    redraw();
  }).catch(() => {
    clear(mapCell);
    mapCell.appendChild(el('div', { className: 'mob-empty' },
      'Ländergeometrie konnte nicht geladen werden. Voll-Liste unten nutzen.'));
  });

  logStamp('mobilitaet', [
    ['events', events.length], ['verortet', withGeo.length],
    ['unverortet', unverortet.length], ['datiert', datedYears.length],
    ['jahre', `${minYear}-${maxYear}`],
  ]);
}

// ---------------------------------------------------------------------------
// Karte: Projektion, Knoten, Pfad, Zoom
// ---------------------------------------------------------------------------

function loadCountries() {
  if (COUNTRIES) return Promise.resolve(COUNTRIES);
  return fetch(GEO_URL).then(r => r.json()).then(geo => { COUNTRIES = geo; return geo; });
}

function buildMap(mapCell, countries, withGeo, state, opts) {
  clear(mapCell);
  const width = Math.max(320, mapCell.clientWidth || 960);
  const height = Math.round(Math.min(760, Math.max(440, window.innerHeight * 0.6)));

  // Projektion auf den europaeischen Schwerpunkt einpassen (Ausreisser wie
  // den New-York-Fehlmatch ausgeschlossen; per Zoom erreichbar).
  const eur = withGeo.filter(e => e.placeLon > -15 && e.placeLon < 35 && e.placeLat > 34 && e.placeLat < 60);
  const fitPoints = {
    type: 'FeatureCollection',
    features: (eur.length ? eur : withGeo).map(e => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [e.placeLon, e.placeLat] },
    })),
  };
  const projection = d3.geoMercator();
  const pad = 60;
  projection.fitExtent([[pad, pad], [width - pad, height - pad]], fitPoints);
  const path = d3.geoPath(projection);

  // HTML-Tooltip ueber dem SVG (SVG-Knoten tragen keine Pseudo-Elemente, E-36).
  const tip = el('div', { className: 'mob-tip', 'aria-hidden': 'true' });
  mapCell.appendChild(tip);
  function showTip(html, mx, my) {
    tip.innerHTML = html;
    tip.classList.add('mob-tip--on');
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = mx + 14, y = my + 14;
    if (x + w > width) x = mx - w - 14;
    if (y + h > height) y = my - h - 14;
    tip.style.left = Math.max(4, x) + 'px';
    tip.style.top = Math.max(4, y) + 'px';
  }
  function hideTip() { tip.classList.remove('mob-tip--on'); }
  function showNodeTip(event, d) {
    const [mx, my] = d3.pointer(event, mapCell);
    const t = TYPE_BY_ID.get(d.dom) || KONTEXT;
    const span = d.firstYear == null ? 'ohne Datum'
      : (d.lastYear != null && d.lastYear !== d.firstYear
          ? `${d.firstYear}–${d.lastYear}` : `${d.firstYear}`);
    showTip(
      `<strong>${escapeHtml(d.city)}</strong>` +
      `<span class="mob-tip__row"><span class="mob-tip__sw" style="background:${t.color}"></span>${t.label}</span>` +
      `<span class="mob-tip__row">${d.shown} Ereignis${d.shown === 1 ? '' : 'se'}</span>` +
      `<span class="mob-tip__row">${span}</span>`,
      mx, my);
  }

  const svg = d3.select(mapCell).append('svg')
    .attr('class', 'mob-map__svg')
    .attr('width', width).attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  // Arrowhead-Marker, nimmt die Strichfarbe der Linie (context-stroke)
  const defs = svg.append('defs');
  defs.append('marker')
    .attr('id', 'mob-arrow').attr('viewBox', '0 0 10 10')
    .attr('refX', 9).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7)
    .attr('orient', 'auto-start-reverse')
    .append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', 'context-stroke');

  const gZoom = svg.append('g');
  const gLand = gZoom.append('g').attr('class', 'mob-land');
  const gArcs = gZoom.append('g').attr('class', 'mob-arcs');
  const gNodes = gZoom.append('g').attr('class', 'mob-nodes');

  gLand.selectAll('path').data(countries.features).enter().append('path')
    .attr('d', path)
    .attr('fill', 'var(--color-parchment)')
    .attr('stroke', 'var(--color-sand)')
    .attr('stroke-width', 0.6);

  // Zoom + Pan; der Zoom-Faktor steuert die Label-Ausduennung und haelt
  // Beschriftung und Halo in etwa bildschirmkonstant (counter-scale).
  let currentK = 1;
  let maxShown = 1;
  const zoom = d3.zoom().scaleExtent([1, 12])
    .on('zoom', (ev) => {
      currentK = ev.transform.k;
      gZoom.attr('transform', ev.transform);
      applyLabelLayer();
    });
  svg.call(zoom);

  // Label-Schicht: bei wenig Zoom nur die ereignisreichsten Knoten beschriften
  // (Top-N nach Ereigniszahl), mit steigendem Zoom mehr, ab hohem Zoom alle.
  // Die ausgewaehlte Stadt traegt immer ihr Label. Font und Halo werden gegen
  // den Zoom skaliert, damit Beschriftung und Umriss bildschirmkonstant bleiben.
  const sichtbar = d => d.shown > 0 && (d.firstYear == null || d.firstYear <= state.cursor);
  function applyLabelLayer() {
    const sel = gNodes.selectAll('g.mob-node');
    const counts = [];
    sel.each(d => { if (sichtbar(d)) counts.push(d.shown); });
    counts.sort((a, b) => b - a);
    const topN = Math.min(counts.length, Math.max(3, Math.round(3 * currentK)));
    const cutoff = topN > 0 ? counts[topN - 1] : Infinity;
    const fontPx = (11 / currentK).toFixed(2) + 'px';
    const haloPx = (2.5 / currentK).toFixed(2) + 'px';
    sel.select('text')
      .style('font-size', fontPx)
      .style('stroke-width', haloPx)
      .attr('opacity', d => {
        if (!sichtbar(d)) return 0;
        if (state.selectedCity === d.city) return 1;
        return d.shown >= cutoff ? 1 : 0;
      });
  }

  // Knoten je Stadt. Orte, deren projizierter Punkt ausserhalb des
  // Kartenausschnitts liegt (z. B. der New-York-Fehlmatch AF-01, weit im
  // Westen), werden nicht an falscher Stelle gezeichnet und nicht mit Pfeilen
  // verbunden, sondern ehrlich als "abseits der Karte" im Detailstreifen
  // ausgewiesen (Datenfehler-Register AF-01).
  const onMargin = 8;
  const isOnMap = (x, y) =>
    x >= -onMargin && x <= width + onMargin && y >= -onMargin && y <= height + onMargin;
  function buildNodes() {
    const m = new Map();
    const offCities = new Map();
    for (const e of withGeo) {
      const city = cityOf(e.place);
      const [x, y] = projection([e.placeLon, e.placeLat]);
      if (!isOnMap(x, y)) {
        if (!offCities.has(city)) offCities.set(city, []);
        offCities.get(city).push(e);
        continue;
      }
      if (!m.has(city)) m.set(city, { city, x, y, events: [] });
      m.get(city).events.push(e);
    }
    state.offMapEvents = [].concat(...offCities.values());
    state.offMapCities = [...offCities.keys()];
    return m;
  }
  const nodeByCity = buildNodes();
  const onMapCities = new Set(nodeByCity.keys());

  // Zeitfarbskala fuer den Pfad (frueh hell, spaet dunkel, im Palettenton)
  const timeColor = d3.scaleLinear().domain([opts.minYear, opts.maxYear])
    .range(['#C9B68F', '#5B4A36']).interpolate(d3.interpolateLab).clamp(true);

  // Zeichenfunktion ueber State
  return function drawMap() {
    const active = e => state.active.has(sichtOf(e));

    // ---- Pfad (Segmente) ----
    let segments = [];
    if (state.showPath) {
      const seq = withGeo
        .filter(e => active(e) && extractYear(e.date) != null && onMapCities.has(cityOf(e.place)))
        .map(e => ({ city: cityOf(e.place), y: extractYear(e.date), date: e.date }))
        .sort((a, b) => a.y - b.y || String(a.date).localeCompare(String(b.date)));
      let prev = null;
      for (const v of seq) {
        if (prev && prev.city !== v.city) {
          segments.push({ from: prev.city, to: v.city, year: v.y });
        }
        prev = v;
      }
    }
    const arcs = gArcs.selectAll('path').data(segments, (d, i) => `${d.from}|${d.to}|${d.year}|${i}`);
    arcs.exit().remove();
    arcs.enter().append('path')
      .attr('fill', 'none')
      .attr('marker-end', 'url(#mob-arrow)')
      .merge(arcs)
        .attr('d', d => arcPath(nodeByCity.get(d.from), nodeByCity.get(d.to)))
        .attr('stroke', d => timeColor(d.year))
        .attr('stroke-width', 1.6)
        .attr('opacity', d => d.year <= state.cursor ? 0.85 : 0.06);

    // ---- Knoten ----
    const nodes = [...nodeByCity.values()].map(n => {
      const evs = n.events.filter(active);
      return { ...n, shown: evs.length, dom: dominantSicht(evs),
        firstYear: firstYear(evs), lastYear: lastYear(evs) };
    });
    maxShown = 1;
    for (const n of nodes) maxShown = Math.max(maxShown, n.shown);

    const sel = gNodes.selectAll('g.mob-node').data(nodes, d => d.city);
    sel.exit().remove();
    const enter = sel.enter().append('g').attr('class', 'mob-node')
      .style('cursor', 'pointer')
      .on('click', (_, d) => opts.onSelectCity(d.city))
      .on('mouseenter', (event, d) => showNodeTip(event, d))
      .on('mousemove', (event, d) => showNodeTip(event, d))
      .on('mouseleave', hideTip);
    enter.append('circle');
    enter.append('text');
    const merged = enter.merge(sel)
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('opacity', d => {
        if (d.shown === 0) return 0.12;
        if (d.firstYear != null && d.firstYear > state.cursor) return 0.18;
        return 1;
      });
    merged.select('circle')
      .attr('r', d => d.shown === 0 ? 3 : 4 + Math.round(9 * Math.sqrt(d.shown / maxShown)))
      .attr('fill', d => colorOf(d.dom))
      .attr('fill-opacity', 0.82)
      .attr('stroke', d => state.selectedCity === d.city ? '#1a1a1a' : '#fff')
      .attr('stroke-width', d => state.selectedCity === d.city ? 2.4 : 1);
    merged.select('text')
      .text(d => d.city)
      .attr('x', d => 6 + Math.round(9 * Math.sqrt(Math.max(1, d.shown) / maxShown)))
      .attr('y', 4)
      .attr('class', 'mob-node__label');

    // Label-Sichtbarkeit und Zoom-Gegenskalierung zentral (auch im Zoom-Handler).
    applyLabelLayer();
  };
}

function arcPath(a, b) {
  if (!a || !b) return '';
  const dx = b.x - a.x, dy = b.y - a.y;
  const dr = Math.hypot(dx, dy);
  // leicht gekruemmt, damit Hin- und Rueckwege nicht uebereinanderliegen
  const cx = (a.x + b.x) / 2 - dy * 0.12;
  const cy = (a.y + b.y) / 2 + dx * 0.12;
  // Endpunkt etwas vor dem Knoten, damit der Pfeil nicht im Kreis steckt
  const t = dr > 0 ? Math.min(10, dr * 0.18) / dr : 0;
  const ex = b.x - dx * t, ey = b.y - dy * t;
  return `M${a.x},${a.y} Q${cx},${cy} ${ex},${ey}`;
}

function dominantSicht(evs) {
  const c = new Map();
  for (const ev of evs) c.set(sichtOf(ev), (c.get(sichtOf(ev)) || 0) + 1);
  let best = KONTEXT.id, bestN = -1;
  for (const t of ALL_TYPES) {
    const n = c.get(t.id) || 0;
    if (n > bestN) { bestN = n; best = t.id; }
  }
  return best;
}
function firstYear(evs) {
  const ys = evs.map(e => extractYear(e.date)).filter(y => y != null);
  return ys.length ? Math.min(...ys) : null;
}
function lastYear(evs) {
  const ys = evs.map(e => extractYear(e.date)).filter(y => y != null);
  return ys.length ? Math.max(...ys) : null;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ---------------------------------------------------------------------------
// Zeitregler mit Abspielen
// ---------------------------------------------------------------------------

function buildScrubber(state, minYear, maxYear, onChange) {
  const wrap = el('div', { className: 'mob-scrub' });
  const play = el('button', { className: 'mob-scrub__play', type: 'button',
    'aria-label': 'Pfad über die Zeit abspielen' }, '▶');
  const range = el('input', {
    className: 'mob-scrub__range', type: 'range',
    min: String(minYear), max: String(maxYear), step: '1', value: String(state.cursor),
  });
  const label = el('span', { className: 'mob-scrub__year' }, String(state.cursor));

  function setCursor(y, fire = true) {
    state.cursor = y;
    range.value = String(y);
    label.textContent = y >= maxYear ? `bis ${y}` : String(y);
    if (fire) onChange();
  }
  range.addEventListener('input', () => setCursor(parseInt(range.value, 10)));

  function stop() {
    state.playing = false;
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
    play.textContent = '▶';
    play.classList.remove('mob-scrub__play--on');
  }
  function start() {
    state.playing = true;
    play.textContent = '⏸';
    play.classList.add('mob-scrub__play--on');
    if (state.cursor >= maxYear) setCursor(minYear, false);
    state.timer = setInterval(() => {
      const next = state.cursor + 1;
      if (next > maxYear) { setCursor(maxYear); stop(); return; }
      setCursor(next);
    }, 700);
  }
  play.addEventListener('click', () => { state.playing ? stop() : start(); });

  wrap.append(play, range, label);
  return {
    elementWrap: wrap,
    update() { range.value = String(state.cursor); label.textContent = state.cursor >= maxYear ? `bis ${state.cursor}` : String(state.cursor); },
  };
}

// ---------------------------------------------------------------------------
// Sicht-Legende (Filter)
// ---------------------------------------------------------------------------

function buildLegend(events, state, onChange) {
  const counts = new Map(ALL_TYPES.map(t => [t.id, 0]));
  for (const ev of events) counts.set(sichtOf(ev), (counts.get(sichtOf(ev)) || 0) + 1);

  const legend = el('div', { className: 'mob-legend', role: 'group', 'aria-label': 'Mobilitätssichten filtern' });
  for (const t of ALL_TYPES) {
    const item = el('button', { className: 'mob-legend__item', type: 'button',
      title: t.frage, 'aria-pressed': 'true' },
      el('span', { className: 'mob-legend__swatch' }),
      el('span', { className: 'mob-legend__label' }, t.label),
      el('span', { className: 'mob-legend__count' }, String(counts.get(t.id) || 0)));
    item.querySelector('.mob-legend__swatch').style.background = t.color;
    item.addEventListener('click', () => {
      if (state.active.has(t.id)) state.active.delete(t.id); else state.active.add(t.id);
      const on = state.active.has(t.id);
      item.classList.toggle('mob-legend__item--off', !on);
      item.setAttribute('aria-pressed', String(on));
      onChange();
    });
    legend.appendChild(item);
  }
  return legend;
}

// ---------------------------------------------------------------------------
// Detailstreifen-Helfer
// ---------------------------------------------------------------------------

function makeUnverortetButton(unverortet, state, strip, rerender) {
  const btn = el('button', { className: 'mob-strip__unverortet', type: 'button' },
    `${unverortet.length} unverortet`);
  btn.addEventListener('click', () => {
    const chips = el('div', { className: 'mob-strip__chips' });
    for (const ev of sortEvents(unverortet.filter(e => state.active.has(sichtOf(e)))))
      chips.appendChild(buildEventChip(ev));
    clear(strip);
    strip.appendChild(el('div', { className: 'mob-strip__head' },
      el('h3', { className: 'mob-strip__title' }, 'Unverortete Ereignisse'),
      el('button', { className: 'mob-strip__clear', type: 'button', onClick: rerender }, 'zurück')));
    strip.appendChild(chips);
  });
  return btn;
}

function makeOffMapButton(state, strip, rerender) {
  const evs = state.offMapEvents || [];
  const cities = state.offMapCities || [];
  const btn = el('button', { className: 'mob-strip__offmap', type: 'button',
    title: 'Orte ausserhalb des Kartenausschnitts, meist ein Koordinaten-Fehlmatch' },
    `${evs.length} abseits der Karte`);
  btn.addEventListener('click', () => {
    const chips = el('div', { className: 'mob-strip__chips' });
    for (const ev of sortEvents(evs.filter(e => state.active.has(sichtOf(e)))))
      chips.appendChild(buildEventChip(ev));
    clear(strip);
    strip.appendChild(el('div', { className: 'mob-strip__head' },
      el('h3', { className: 'mob-strip__title' }, 'Abseits der Karte'),
      el('button', { className: 'mob-strip__clear', type: 'button', onClick: rerender }, 'zurück')));
    if (cities.length) {
      strip.appendChild(el('div', { className: 'mob-strip__offmap-note' },
        `${cities.join(', ')}: ausserhalb des Kartenausschnitts projiziert, meist ein Koordinaten-Fehlmatch (Datenfehler-Register AF-01, New York).`));
    }
    strip.appendChild(chips);
  });
  return btn;
}

function sortEvents(evs) {
  return evs.slice().sort((a, b) => {
    const ya = extractYear(a.date), yb = extractYear(b.date);
    if (ya != null && yb != null && ya !== yb) return ya - yb;
    if (ya != null && yb == null) return -1;
    if (ya == null && yb != null) return 1;
    const pa = (a.place || '').localeCompare(b.place || '', 'de-DE');
    return pa !== 0 ? pa : (a.role || '').localeCompare(b.role || '', 'de-DE');
  });
}

function buildEventChip(ev) {
  const date = ev.date ? (formatDate(ev.date) || ev.date) : '—';
  const place = ev.place || 'unbekannt';
  const reason = !hasGeo(ev) ? (ev.placeWikidata ? 'Q-ID ohne Koordinaten' : 'ohne Q-ID') : null;
  return buildRoleChip({
    prefix: ev.role || 'EVENT',
    value: `${place} · ${date}${reason ? ' · ' + reason : ''}`,
    xlsxSource: ev.xlsxSource,
    wikidata: ev.placeWikidata,
    tip: ev.id,
    onClick: () => { if (ev.recordId) window.location.hash = '#bestand/' + encodeURIComponent(ev.recordId); },
  });
}

// ---------------------------------------------------------------------------
// Einklappbare Voll-Liste (Pruefbarkeit)
// ---------------------------------------------------------------------------

function buildBackbone(events) {
  const byType = new Map();
  for (const ev of events) {
    const t = sichtOf(ev);
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t).push(ev);
  }
  const details = el('details', { className: 'mob-backbone' });
  details.appendChild(el('summary', { className: 'mob-backbone__summary' },
    `Alle ${events.length} Ereignisse als Liste`));
  for (const t of ALL_TYPES) {
    const evs = byType.get(t.id) || [];
    if (evs.length === 0) continue;
    const block = el('div', { className: 'mob-backbone__block' });
    const sw = el('span', { className: 'mob-backbone__swatch' });
    sw.style.background = t.color;
    block.appendChild(el('div', { className: 'mob-backbone__head' },
      sw, el('span', { className: 'mob-backbone__label' }, t.label),
      el('span', { className: 'mob-backbone__count' }, String(evs.length))));
    const chips = el('div', { className: 'mob-strip__chips' });
    for (const ev of sortEvents(evs)) chips.appendChild(buildEventChip(ev));
    block.appendChild(chips);
    details.appendChild(block);
  }
  return details;
}
