/**
 * M³GIM Karten-View (E-111, D3-geo Trajektorie)
 *
 * Forschungswerkzeug fuer die raumzeitliche Mobilitaet Ira Malaniuks. Das
 * Layout nutzt die geteilte View-Sidebar (docs/js/ui/sidebar.js): eine
 * deklarativ erzeugte Filter-Spalte links, die Karte nimmt den restlichen
 * Viewport. Die Karte ist eine projizierte Stummkarte (D3-geo, lokale
 * Ländergeometrie, keine externen Kartenserver), Orte als Knoten farbcodiert
 * nach Mobilitaetssicht, der biografische Pfad als gerichtete, chronologisch
 * eingefaerbte Pfeile zwischen den Orten.
 *
 * Sidebar-Spec: die Sicht-Legende filtert Knoten, Pfad und Liste zugleich, ein
 * Zeitraum-Filter (von–bis statt Abspielen) blendet Ereignisse ausserhalb des
 * gewaehlten Jahresfensters aus, der Pfad-Schalter zeigt oder verbirgt die
 * Trajektorie. Die Ereignis-Region zeigt eine Statuszeile, bei Knotenwahl die
 * Ereignisse des Orts, darunter die einklappbare Voll-Liste. Datumslose und
 * unverortete Ereignisse bleiben sichtbar (Knoten ohne Pfadanschluss bzw.
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
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { buildRoleChip } from './archive-inline-detail.js';
import { cityOf } from '../utils/format.js';
import { formatDate, extractYear } from '../utils/date-parser.js';
import { logStamp } from '../utils/env.js';
import { onViewNavigate } from '../ui/events.js';
import { mobilityClusterFor } from '../data/constants.js';
import { getFilter, setFilter, subscribe } from '../ui/filter-state.js';
import {
  sichtToActiveSet, activeSetToSicht, zeitfensterToYearRange,
  yearRangeToZeitfenster, makeSyncGuard,
} from '../ui/filter-sync.js';

/* global d3 */

const GEO_URL = 'data/geo/countries-110m.geo.json';
let COUNTRIES = null;  // module-level cache, ueber Tab-Wechsel hinweg
let _unsubscribeFilter = null;       // geteilter Filter (M4), modul-lebend
const _syncGuard = makeSyncGuard();  // loop guard: Controls <-> setFilter

const SICHTEN = [
  {
    id: 'performativ', label: 'Performativ', frage: 'Wo trat sie auf?', color: 'var(--color-sicht-performativ)',
    roles: ['auftritt', 'aufführung', 'auffuehrung', 'gastspiel', 'premiere',
      'wiederaufnahme', 'festvorstellung', 'probe', 'probenbeginn',
      'auftrittsdatum', 'auffuehrungsdatum', 'aufführungsdatum', 'probendatum',
      'premieredatum'],
  },
  {
    id: 'institutionell', label: 'Institutionell', frage: 'Wo war sie engagiert?', color: 'var(--color-sicht-institutionell)',
    roles: ['spielzeit', 'spielzeitvon', 'spielzeitbis'],
  },
  {
    id: 'korrespondenz', label: 'Reise & Korrespondenz', frage: 'Woher, wohin, an wen?', color: 'var(--color-sicht-korrespondenz)',
    roles: ['zielort', 'absendeort', 'abreiseort', 'empfangsort', 'vertragsort',
      'absendedatum', 'empfangsdatum', 'abreisedatum'],
  },
  {
    id: 'diskursiv', label: 'Diskursiv', frage: 'Wo wurde über sie berichtet?', color: 'var(--color-sicht-diskursiv)',
    roles: ['erscheinungsdatum', 'ausstrahlung', 'ausstrahlungsdatum'],
  },
  {
    id: 'biografisch', label: 'Biografisch', frage: 'Wo wohnte und lebte sie?', color: 'var(--color-sicht-biografisch)',
    roles: ['wohnort', 'ausstellungsdatum', 'gespräch', 'gespraech'],
  },
];
const KONTEXT = {
  id: 'kontext', label: 'Weiterer Ortsbezug', frage: 'Sonstiger Ortsbezug', color: 'var(--color-sicht-kontext)',
  roles: ['entstehung', 'erwähnt', 'erwaehnt', 'auftrag'],
};
const ALL_TYPES = [...SICHTEN, KONTEXT];
const TYPE_BY_ID = new Map(ALL_TYPES.map(t => [t.id, t]));
const ALL_TYPE_IDS = ALL_TYPES.map(t => t.id);

// Sicht-Klassifikation ueber den kanonischen Klassifikator (E-117 M4): der
// view-lokale ROLE_TO_TYPE wurde durch mobilityClusterFor ersetzt, null faellt
// in den expliziten Bucket 'kontext' (Entstehung, Erwaehnung, Auftrag).
const sichtOf = ev => mobilityClusterFor(ev.role) || KONTEXT.id;
const colorOf = id => (TYPE_BY_ID.get(id) || KONTEXT).color;
const hasGeo = ev => typeof ev.placeLat === 'number' && typeof ev.placeLon === 'number';

// ---------------------------------------------------------------------------
// Haupteinstieg
// ---------------------------------------------------------------------------

export function renderMobilitaet(store, container) {
  clear(container);
  const events = [...store.mobilityEvents.values()];

  if (events.length === 0) {
    container.appendChild(el('div', { className: 'mob-notice' },
      el('div', { className: 'mob-empty' }, 'Keine raumzeitlichen Ereignisse im Datenstand.')));
    return;
  }
  if (typeof d3 === 'undefined') {
    container.appendChild(el('div', { className: 'mob-notice' },
      el('div', { className: 'mob-empty' }, 'D3 ist nicht geladen, die Karte kann nicht gezeichnet werden.')));
    return;
  }

  const withGeo = events.filter(hasGeo);
  const unverortet = events.filter(e => !hasGeo(e));
  const datedYears = events.map(e => extractYear(e.date)).filter(y => y != null);
  const minYear = datedYears.length ? Math.min(...datedYears) : 1940;
  const maxYear = datedYears.length ? Math.max(...datedYears) : 1980;

  // Gemeinsamer Filter-State. Der Zeitraum (yearFrom..yearTo) ist ein
  // beidseitiges Fenster, kein abspielender Cursor: Ereignisse und Pfad-
  // segmente ausserhalb des Fensters werden ausgeblendet.
  const span = { min: minYear, max: maxYear };
  const state = {
    active: new Set(ALL_TYPE_IDS),
    showPath: true,
    yearFrom: minYear,
    yearTo: maxYear,
    selectedCity: null,
  };

  // Geteilten Filter (M4) initial nachziehen: sicht -> active, zeitfenster ->
  // yearFrom/yearTo (an die View-Spanne geklemmt), ort -> selectedCity.
  function pullSharedIntoState(shared) {
    state.active = sichtToActiveSet(shared.sicht, ALL_TYPE_IDS);
    const { yearFrom, yearTo } = zeitfensterToYearRange(shared.zeitfenster);
    state.yearFrom = yearFrom == null ? minYear : Math.max(minYear, yearFrom);
    state.yearTo = yearTo == null ? maxYear : Math.min(maxYear, yearTo);
    state.selectedCity = shared.ort || null;
  }
  pullSharedIntoState(getFilter());

  const active = e => state.active.has(sichtOf(e));
  const inWindow = e => {
    const y = extractYear(e.date);
    return y == null || (y >= state.yearFrom && y <= state.yearTo);
  };

  // Sicht-Counts fuer die Legende
  const counts = new Map(ALL_TYPES.map(t => [t.id, 0]));
  for (const ev of events) counts.set(sichtOf(ev), (counts.get(sichtOf(ev)) || 0) + 1);

  // Ereignis-Region (Statuszeile / Ortsauswahl) plus einklappbare Voll-Liste.
  const detailRegion = el('div', { className: 'mob-panel__detail' });
  const panelNode = el('div', { className: 'mob-panel' }, detailRegion, buildBackbone(events));

  // ---- Sidebar (deklarativ) ----
  let mapApi = null;  // von buildMap gesetzt; die Fokus-Buttons greifen darauf zu
  const sidebar = createSidebar({
    sections: [
      {
        title: 'Sichten',
        controls: [{
          kind: 'legend',
          items: ALL_TYPES.map(t => ({ id: t.id, label: t.label, color: t.color,
            count: counts.get(t.id) || 0, title: t.frage })),
          isActive: id => state.active.has(id),
          onToggle: id => {
            if (state.active.has(id)) state.active.delete(id); else state.active.add(id);
            // Sicht ist geteilt (M4): genau eine aktive Sicht -> Facette, sonst ''.
            _syncGuard.run(() => setFilter({ sicht: activeSetToSicht(state.active, ALL_TYPE_IDS) }));
            redraw();
          },
        }],
      },
      {
        title: 'Darstellung',
        controls: [
          { kind: 'toggle', label: 'Pfad anzeigen',
            value: () => state.showPath,
            onChange: v => { state.showPath = v; redraw(); } },
          { kind: 'range', fromCap: 'Von', toCap: 'Bis', min: minYear, max: maxYear, fullLabel: true,
            from: () => state.yearFrom, to: () => state.yearTo,
            onChange: (f, t) => {
              state.yearFrom = f; state.yearTo = t;
              // Zeitfenster ist geteilt (M4): volle Spanne -> null (inaktiv).
              _syncGuard.run(() => setFilter({ zeitfenster: yearRangeToZeitfenster(f, t, span) }));
              redraw();
            } },
        ],
      },
      {
        title: 'Ansicht',
        controls: [{
          kind: 'buttons',
          items: [
            { label: 'Europa', title: 'Ganz Europa zeigen', onClick: () => mapApi && mapApi.resetView() },
            { label: 'Österreich', title: 'Auf Österreich zentrieren', onClick: () => mapApi && mapApi.focusCountry('Austria') },
            { label: 'Deutschland', title: 'Auf Deutschland zentrieren', onClick: () => mapApi && mapApi.focusCountry('Germany') },
          ],
        }],
      },
      {
        title: 'Ereignisse',
        controls: [{ kind: 'custom', node: panelNode }],
      },
    ],
  });

  // ---- Karte (volle Restbreite und -hoehe) ----
  const mapCell = el('div', { className: 'mob-map' },
    el('div', { className: 'mob-map__loading' }, 'Karte wird geladen …'));
  const main = el('div', { className: 'view-main' }, mapCell);

  container.appendChild(viewShell(sidebar.element, main));

  // Zeichenfunktion (wird nach Geometrie-Load und bei jeder State-Aenderung gerufen)
  let draw = () => {};
  function redraw() { draw(); renderPanel(); sidebar.update(); }

  function renderPanel() {
    clear(detailRegion);
    if (state.selectedCity) {
      const list = events.filter(e => active(e) && cityOf(e.place) === state.selectedCity);
      detailRegion.appendChild(el('div', { className: 'mob-detail__head' },
        el('h3', { className: 'mob-detail__title' }, state.selectedCity),
        el('button', { className: 'mob-detail__clear', type: 'button',
          onClick: () => { state.selectedCity = null; redraw(); } }, 'Auswahl lösen')));
      const chips = el('div', { className: 'mob-chips' });
      for (const ev of sortEvents(list)) chips.appendChild(buildEventChip(ev));
      detailRegion.appendChild(chips);
      return;
    }
    // Statuszeile: was die aktuelle Auswahl und der Zeitraum umfassen. Die
    // undatierte Menge wird ausgewiesen, weil sie immer sichtbar bleibt, aber
    // weder im Pfad noch im Zeitfilter erfasst ist.
    const verortet = withGeo.filter(e => active(e) && inWindow(e)).length;
    const total = events.filter(e => active(e) && inWindow(e)).length;
    const undatiert = events.filter(e => active(e) && extractYear(e.date) == null).length;
    detailRegion.appendChild(el('div', { className: 'mob-status' },
      el('span', {}, `${verortet} verortet`),
      el('span', {}, `${total} Ereignisse`),
      undatiert ? el('span', { className: 'mob-status__undated',
        title: 'Undatierte Ereignisse sind immer sichtbar, aber nicht im Pfad und nicht vom Zeitfilter erfasst' },
        `${undatiert} undatiert`) : null));
    const flags = el('div', { className: 'mob-status__flags' });
    if (unverortet.length) flags.appendChild(makeUnverortetButton(unverortet, state, detailRegion, renderPanel));
    if (state.offMapEvents && state.offMapEvents.length) flags.appendChild(makeOffMapButton(state, detailRegion, renderPanel, () => { if (mapApi) mapApi.focusAll(); }));
    if (flags.childNodes.length) detailRegion.appendChild(flags);
    detailRegion.appendChild(el('div', { className: 'mob-status__hint' },
      'Knoten auf der Karte anklicken für Details'));
  }

  // Cross-View: Klick auf einen Sicht-Balken in der Statistik oeffnet die Karte
  // mit genau dieser Sicht aktiv (Statistik dispatcht m3gim:navigate, events.js
  // replayt auch, falls das Event vor dem Geometrie-Load eintrifft).
  onViewNavigate('karte', (detail) => {
    const s = detail && detail.sicht;
    if (s && TYPE_BY_ID.has(s)) {
      state.active = new Set([s]);
      state.selectedCity = null;
      redraw();
    }
  });

  // Geometrie laden (gecacht), dann zeichnen
  loadCountries().then(countries => {
    const map = buildMap(mapCell, countries, withGeo, state, {
      minYear, maxYear,
      onSelectCity: city => {
        state.selectedCity = state.selectedCity === city ? null : city;
        // Ort ist geteilt (M4): Stadt-Auswahl -> ort-Facette (stadt-konsolidiert).
        _syncGuard.run(() => setFilter({ ort: state.selectedCity || '' }));
        redraw();
      },
    });
    mapApi = map;
    draw = map.draw;
    redraw();
  }).catch(() => {
    clear(mapCell);
    mapCell.appendChild(el('div', { className: 'mob-empty' },
      'Ländergeometrie konnte nicht geladen werden. Liste in der Sidebar nutzen.'));
  });

  // Geteilter Filter (M4): externe Aenderung (sicht/zeitfenster/ort) auf state
  // + redraw anwenden. Sidebar liest state ueber Getter -> sidebar.update()
  // zieht die Controls nach (in redraw enthalten).
  if (_unsubscribeFilter) _unsubscribeFilter();
  _unsubscribeFilter = subscribe((shared) => {
    if (_syncGuard.isActive()) return;
    pullSharedIntoState(shared);
    redraw();
  }, { immediate: false });

  logStamp('karte', [
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
  const height = Math.max(440, mapCell.clientHeight || 600);

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
    const span = d.firstYear == null ? 'ohne Datum'
      : (d.lastYear != null && d.lastYear !== d.firstYear
          ? `${d.firstYear}–${d.lastYear}` : `${d.firstYear}`);
    // Volle Sicht-Aufschluesselung statt nur der dominanten Farbe.
    const rows = (d.breakdown || []).map(b =>
      `<span class="mob-tip__row"><span class="mob-tip__sw" style="background:${b.color}"></span>` +
      `${b.label}<span class="mob-tip__n">${b.count}</span></span>`).join('');
    showTip(
      `<strong>${escapeHtml(d.city)}</strong>` + rows +
      `<span class="mob-tip__row mob-tip__meta">${d.shown} im Zeitraum · ${span}</span>`,
      mx, my);
  }
  function showArcTip(event, d) {
    const [mx, my] = d3.pointer(event, mapCell);
    showTip(
      `<strong>${escapeHtml(d.from)} → ${escapeHtml(d.to)}</strong>` +
      `<span class="mob-tip__row">${d.year}</span>` +
      `<span class="mob-tip__row mob-tip__meta">chronologische Folge, kein belegter Reiseweg</span>`,
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
  const gArcHit = gZoom.append('g').attr('class', 'mob-archits');  // unsichtbare Trefferspur
  const gNodes = gZoom.append('g').attr('class', 'mob-nodes');

  gLand.selectAll('path').data(countries.features).enter().append('path')
    .attr('d', path)
    .attr('fill', 'var(--color-parchment)')
    .attr('stroke', 'var(--color-sand)')
    .attr('stroke-width', 0.6);

  // Zoom + Pan; der Zoom-Faktor steuert die Label-Ausduennung und haelt
  // Beschriftung und Halo in etwa bildschirmkonstant (counter-scale). Die
  // Untergrenze < 1 erlaubt das Herauszoomen unter den Europa-Fit, um den
  // groesseren geografischen Kontext zu sehen.
  let currentK = 1;
  let maxShown = 1;
  const minK = 0.3, maxK = 12;
  const zoom = d3.zoom().scaleExtent([minK, maxK])
    .on('zoom', (ev) => {
      currentK = ev.transform.k;
      gZoom.attr('transform', ev.transform);
      applyLabelLayer();
      applyArcScale();
    });
  svg.call(zoom);

  // Linienstaerke der Pfad-Etappen gegen den Zoom konstant halten (wie die
  // Labels), damit die Karte beim Hineinzoomen nicht visuell zuwaechst. Der
  // Pfeil-Marker (markerUnits=strokeWidth) skaliert dabei mit.
  function applyArcScale() {
    gArcs.selectAll('path').attr('stroke-width', 1.6 / currentK);
    gArcHit.selectAll('path').attr('stroke-width', 12 / currentK);
  }
  // Basis-Deckkraft einer Etappe: ausserhalb des Jahresfensters fast
  // transparent; bei Ortsauswahl werden nur die Etappen der gewaehlten Stadt
  // betont und der Rest stark gedimmt; sonst eine ruhige mittlere Deckkraft
  // (weniger Linien-Wirrwarr als die fruehere 0.85).
  const arcBaseOpacity = (d) => {
    const inWin = d.year == null || (d.year >= state.yearFrom && d.year <= state.yearTo);
    if (!inWin) return 0.06;
    if (state.selectedCity) {
      return (d.from === state.selectedCity || d.to === state.selectedCity) ? 0.9 : 0.1;
    }
    return 0.55;
  };
  // Eine Etappe beim Hovern hervorheben (volle Deckkraft, nach vorn), ohne den
  // teuren Voll-Redraw, da nur ein Pfad betroffen ist.
  function highlightArc(d, on) {
    const sel = gArcs.selectAll('path').filter(dd => dd === d);
    sel.attr('opacity', on ? 1 : arcBaseOpacity(d));
    if (on) sel.raise();
  }

  // Auf eine Landesgrenze zentrieren (exakt ueber die projizierten Polygon-
  // Bounds), bzw. zurueck auf den Europa-Fit (Zoom-Identitaet).
  function focusCountry(name) {
    const feat = countries.features.find(f => f.properties && f.properties.name === name);
    if (!feat) return;
    const [[x0, y0], [x1, y1]] = path.bounds(feat);
    const bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0);
    const k = Math.max(minK, Math.min(maxK, 0.85 * Math.min(width / bw, height / bh)));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    svg.transition().duration(650).call(zoom.transform,
      d3.zoomIdentity.translate(width / 2 - k * cx, height / 2 - k * cy).scale(k));
  }
  function resetView() {
    svg.transition().duration(650).call(zoom.transform, d3.zoomIdentity);
  }
  // Alle verorteten Punkte einrahmen, also auch die fernen Ausreisser (New
  // York). Macht die sonst weit ausserhalb liegenden Punkte sichtbar.
  function focusAll() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const e of withGeo) {
      const [x, y] = projection([e.placeLon, e.placeLat]);
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (!isFinite(x0)) return;
    const bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0);
    const k = Math.max(minK, Math.min(maxK, 0.9 * Math.min(width / bw, height / bh)));
    svg.transition().duration(650).call(zoom.transform,
      d3.zoomIdentity.translate(width / 2 - k * (x0 + x1) / 2, height / 2 - k * (y0 + y1) / 2).scale(k));
  }

  // Zoom-Steuerung auf der Karte (oben links), analog zum Netzwerk-Tab.
  const zoomCtl = el('div', { className: 'mob-zoomctl' });
  const zoomBtn = (label, title, onClick) => {
    const b = el('button', { className: 'mob-zoomctl__btn', type: 'button', title, 'aria-label': title }, label);
    b.addEventListener('click', onClick);
    return b;
  };
  zoomCtl.append(
    zoomBtn('+', 'Hineinzoomen', () => svg.transition().duration(200).call(zoom.scaleBy, 1.5)),
    zoomBtn('−', 'Herauszoomen', () => svg.transition().duration(200).call(zoom.scaleBy, 1 / 1.5)));
  mapCell.appendChild(zoomCtl);

  // Label-Schicht: bei wenig Zoom nur die ereignisreichsten Knoten beschriften
  // (Top-N nach Ereigniszahl), mit steigendem Zoom mehr, ab hohem Zoom alle.
  // Die ausgewaehlte Stadt traegt immer ihr Label. Font und Halo werden gegen
  // den Zoom skaliert, damit Beschriftung und Umriss bildschirmkonstant bleiben.
  const sichtbar = d => d.shown > 0;
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

  // Alle verorteten Ereignisse werden als Knoten gezeichnet, auch solche weit
  // ausserhalb Europas (per Herauszoomen erreichbar). Geografische Ausreisser
  // (die drei New-York-Punkte, lat 43 / lon -75, ein Geocoding-Fehlmatch,
  // Datenfehler-Register AF-01) werden gesetzt und markiert, aber nicht in die
  // biografische Trajektorie eingewoben, damit der Pfad die Laufbahn nicht ueber
  // einen Datenfehler verzerrt.
  const isFar = e => !(e.placeLon > -15 && e.placeLon < 35 && e.placeLat > 34 && e.placeLat < 60);
  function buildNodes() {
    const m = new Map();
    const farEvents = [];
    const farCities = new Set();
    for (const e of withGeo) {
      const city = cityOf(e.place);
      const [x, y] = projection([e.placeLon, e.placeLat]);
      if (!m.has(city)) m.set(city, { city, x, y, events: [], far: isFar(e) });
      m.get(city).events.push(e);
      if (isFar(e)) { farEvents.push(e); farCities.add(city); }
    }
    state.offMapEvents = farEvents;
    state.offMapCities = [...farCities];
    return { nodes: m, farCities };
  }
  const { nodes: nodeByCity, farCities } = buildNodes();

  // Zeitfarbskala fuer den Pfad (frueh hell, spaet dunkel, im Palettenton)
  const timeColor = d3.scaleLinear().domain([opts.minYear, opts.maxYear])
    .range(['#C9B68F', '#5B4A36']).interpolate(d3.interpolateLab).clamp(true);

  // Zeichenfunktion ueber State
  function drawMap() {
    const active = e => state.active.has(sichtOf(e));
    const inWindow = y => y == null || (y >= state.yearFrom && y <= state.yearTo);

    // ---- Pfad (Segmente) ----
    // Die Trajektorie bleibt als Ganzes erhalten; Segmente ausserhalb des
    // Jahresfensters werden abgeblendet, statt die Kette zu zerreissen.
    let segments = [];
    if (state.showPath) {
      const seq = withGeo
        .filter(e => active(e) && extractYear(e.date) != null && !farCities.has(cityOf(e.place)))
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
    const segKey = (d, i) => `${d.from}|${d.to}|${d.year}|${i}`;
    const arcs = gArcs.selectAll('path').data(segments, segKey);
    arcs.exit().remove();
    arcs.enter().append('path')
      .attr('class', 'mob-arc')
      .attr('fill', 'none')
      .attr('marker-end', 'url(#mob-arrow)')
      .merge(arcs)
        .attr('d', d => arcPath(nodeByCity.get(d.from), nodeByCity.get(d.to)))
        .attr('stroke', d => timeColor(d.year))
        .attr('stroke-width', 1.6 / currentK)
        .attr('opacity', d => arcBaseOpacity(d));

    // Breite, unsichtbare Trefferspur unter den Knoten: macht die duennen
    // Linien robust hoverbar, ohne die Knoten-Hover zu stehlen.
    const hits = gArcHit.selectAll('path').data(segments, segKey);
    hits.exit().remove();
    hits.enter().append('path')
      .attr('class', 'mob-archit')
      .attr('fill', 'none')
      .attr('stroke', 'transparent')
      .on('mouseenter', (event, d) => { showArcTip(event, d); highlightArc(d, true); })
      .on('mousemove', (event, d) => showArcTip(event, d))
      .on('mouseleave', (event, d) => { hideTip(); highlightArc(d, false); })
      .merge(hits)
        .attr('d', d => arcPath(nodeByCity.get(d.from), nodeByCity.get(d.to)))
        .attr('stroke-width', 12 / currentK);

    // ---- Knoten ----
    // shown = aktive Ereignisse im Jahresfenster (steuert Groesse, Label,
    // Sichtbarkeit). active = aktive Ereignisse ueber alle Jahre (Halbschatten
    // fuer Orte, die ausserhalb des Fensters liegen, aber zur Auswahl gehoeren).
    const nodes = [...nodeByCity.values()].map(n => {
      const evsActive = n.events.filter(active);
      const evsWin = evsActive.filter(e => inWindow(extractYear(e.date)));
      const breakdown = breakdownByView(evsActive.length ? evsActive : n.events);
      return { ...n, active: evsActive.length, shown: evsWin.length,
        dom: breakdown.length ? breakdown[0].id : KONTEXT.id, breakdown,
        firstYear: firstYear(evsActive), lastYear: lastYear(evsActive) };
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
        if (d.active === 0) return 0.12;
        if (d.shown === 0) return 0.2;
        return 1;
      });
    merged.select('circle')
      .attr('r', d => d.shown === 0 ? 3 : 4 + Math.round(9 * Math.sqrt(d.shown / maxShown)))
      // style() statt attr(): der Wert ist `var(--color-sicht-*)`, SVG-Attribute
      // wuerden var() nicht aufloesen (analog Netzwerk-Knoten).
      .style('fill', d => colorOf(d.dom))
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
  }

  return { draw: drawMap, focusCountry, resetView, focusAll };
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

// Sicht-Aufschluesselung eines Knotens, absteigend nach Haeufigkeit. Das erste
// Element ist die dominante Sicht (Knotenfarbe), die ganze Liste der Mix.
function breakdownByView(evs) {
  const c = new Map();
  for (const ev of evs) { const id = sichtOf(ev); c.set(id, (c.get(id) || 0) + 1); }
  return [...c.entries()]
    .map(([id, count]) => {
      const t = TYPE_BY_ID.get(id) || KONTEXT;
      return { id, label: t.label, color: t.color, count };
    })
    .sort((a, b) => b.count - a.count);
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
// Listen-Helfer (Statuszeile, Ortsauswahl, Sonderfaelle)
// ---------------------------------------------------------------------------

function makeUnverortetButton(unverortet, state, region, rerender) {
  const btn = el('button', { className: 'mob-flag mob-flag--unverortet', type: 'button' },
    `${unverortet.length} unverortet`);
  btn.addEventListener('click', () => {
    const chips = el('div', { className: 'mob-chips' });
    for (const ev of sortEvents(unverortet.filter(e => state.active.has(sichtOf(e)))))
      chips.appendChild(buildEventChip(ev));
    clear(region);
    region.appendChild(el('div', { className: 'mob-detail__head' },
      el('h3', { className: 'mob-detail__title' }, 'Unverortete Ereignisse'),
      el('button', { className: 'mob-detail__clear', type: 'button', onClick: rerender }, 'zurück')));
    region.appendChild(chips);
  });
  return btn;
}

function makeOffMapButton(state, region, rerender, onFocus) {
  const evs = state.offMapEvents || [];
  const cities = state.offMapCities || [];
  const btn = el('button', { className: 'mob-flag mob-flag--offmap', type: 'button',
    title: 'Weit ausserhalb Europas verortet, mutmasslich ein Geocoding-Fehlmatch. Klick rahmt alle Punkte ein.' },
    `${evs.length} weit entfernt`);
  btn.addEventListener('click', () => {
    if (onFocus) onFocus();
    const chips = el('div', { className: 'mob-chips' });
    for (const ev of sortEvents(evs.filter(e => state.active.has(sichtOf(e)))))
      chips.appendChild(buildEventChip(ev));
    clear(region);
    region.appendChild(el('div', { className: 'mob-detail__head' },
      el('h3', { className: 'mob-detail__title' }, 'Weit entfernt verortet'),
      el('button', { className: 'mob-detail__clear', type: 'button', onClick: rerender }, 'zurück')));
    if (cities.length) {
      region.appendChild(el('div', { className: 'mob-detail__note' },
        `${cities.join(', ')}: weit ausserhalb Europas verortet, lat/lon deuten auf einen Geocoding-Fehlmatch (Datenfehler-Register AF-01). Die Punkte sind auf der Karte gesetzt und per Herauszoomen erreichbar, aber nicht in den Pfad eingewoben.`));
    }
    region.appendChild(chips);
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
    const chips = el('div', { className: 'mob-chips' });
    for (const ev of sortEvents(evs)) chips.appendChild(buildEventChip(ev));
    block.appendChild(chips);
    details.appendChild(block);
  }
  return details;
}
