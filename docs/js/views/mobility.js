/**
 * M³GIM Karten-View — entitaetszentriert (D3-geo).
 *
 * Forschungswerkzeug fuer die Frage "wo war diese Entitaet praesent?". Man waehlt
 * eine Entitaet (Organisation oder Person) in der Sidebar; die Karte zeigt alle
 * Orte, die an ihren Records haengen, als Punkte. Ohne gewaehlte Entitaet zeigt
 * sie die Gesamt-Geografie des Bestands. Keine Verbindungslinien zwischen den
 * Knoten — die biografische Trajektorie (frueher E-111) ist bewusst entfernt;
 * die raeumliche Verteilung einer Entitaet ist die Aussage, nicht der Weg.
 *
 * Beispiel: "Bayreuther Festspiele" -> Bayreuth (Hauptort) plus die auswaertigen
 * Spielorte (Muenchen, Paris, Stuttgart, …), je nach Datenlage mit oder ohne
 * Koordinaten. Orte ohne Koordinaten werden ehrlich als Liste ausgewiesen, nicht
 * verschwiegen (Linie "Stand nicht kaschieren").
 *
 * Die Orte einer Entitaet werden in entity-map-data.js aus zwei Quellen
 * zusammengezogen (Record-Orte + STE). Knoten sind nach dominanter
 * Mobilitaetssicht (mobilityClusterFor, E-110) eingefaerbt, die Groesse traegt
 * die Belegzahl im Zeitfenster.
 */

import { el, clear } from '../utils/dom.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { buildRoleChip } from './archive-inline-detail.js';
import { cityOf } from '../utils/format.js';
import { formatDate, extractYear } from '../utils/date-parser.js';
import { logStamp } from '../utils/env.js';
import { mobilityClusterFor } from '../data/constants.js';
import { getFilter, setFilter, subscribe } from '../ui/filter-state.js';
import {
  zeitfensterToYearRange, yearRangeToZeitfenster, makeSyncGuard,
} from '../ui/filter-sync.js';
import { buildEntities, buildOccurrences } from './entity-map-data.js';
import { SICHTEN as SHARED_SICHTEN, SICHT_COLOR } from './statistics-data.js';

/* global d3 */

const GEO_URL = 'data/geo/countries-110m.geo.json';
let COUNTRIES = null;  // module-level cache, ueber Tab-Wechsel hinweg
let _unsubscribeFilter = null;       // geteilter Filter (M4), modul-lebend
const _syncGuard = makeSyncGuard();  // loop guard: Controls <-> setFilter

// Mobilitaetssichten als Farb-/Label-Schluessel der Knoten. Farben und die fuenf
// Basis-Sichten kommen aus der geteilten Quelle (statistics-data.js: SICHT_COLOR
// + SICHTEN), damit Karte, Statistik und Chronik dieselbe Sicht in derselben
// Farbe und mit demselben Label zeigen. Die Karte ergaenzt 'kontext' fuer
// Nicht-Cluster-Ortsrollen (Entstehung, Erwaehnung, Auftrag); null faellt
// dorthin. Reihenfolge: Basis-Sichten, dann kontext.
const KONTEXT_ID = 'kontext';
const SICHTEN = [
  ...SHARED_SICHTEN.map(s => ({ id: s.id, label: s.label, color: SICHT_COLOR[s.id] })),
  { id: KONTEXT_ID, label: 'Weiterer Ortsbezug', color: SICHT_COLOR.kontext },
];
const TYPE_BY_ID = new Map(SICHTEN.map(t => [t.id, t]));

const sichtOf = o => mobilityClusterFor(o.role) || KONTEXT_ID;
const colorOf = id => (TYPE_BY_ID.get(id) || TYPE_BY_ID.get(KONTEXT_ID)).color;
const hasGeo = o => typeof o.placeLat === 'number' && typeof o.placeLon === 'number';

// ---------------------------------------------------------------------------
// Haupteinstieg
// ---------------------------------------------------------------------------

export function renderMobilitaet(store, container) {
  clear(container);

  const entities = buildEntities(store);
  const allOcc = buildOccurrences(store);

  if (allOcc.length === 0) {
    container.appendChild(el('div', { className: 'mob-notice' },
      el('div', { className: 'mob-empty' }, 'Keine verorteten Belege im Datenstand.')));
    return;
  }
  if (typeof d3 === 'undefined') {
    container.appendChild(el('div', { className: 'mob-notice' },
      el('div', { className: 'mob-empty' }, 'D3 ist nicht geladen, die Karte kann nicht gezeichnet werden.')));
    return;
  }

  const withGeo = allOcc.filter(hasGeo);
  const datedYears = allOcc.map(o => extractYear(o.date)).filter(y => y != null);
  const minYear = datedYears.length ? Math.min(...datedYears) : 1940;
  const maxYear = datedYears.length ? Math.max(...datedYears) : 1980;
  const span = { min: minYear, max: maxYear };

  const state = {
    entity: null,          // gewaehlte Entitaet oder null (= alle)
    entityKind: 'all',     // 'all' | 'org' | 'person' (Filter der Auswahlliste)
    entityQuery: '',       // Freitextsuche der Auswahlliste
    yearFrom: minYear,
    yearTo: maxYear,
    selectedCity: null,
  };

  // Geteilten Filter (M4) initial nachziehen: zeitfenster -> Jahresfenster,
  // ort -> selectedCity. Die Sicht-Facette spielt in der Entitaets-Karte keine
  // Rolle (keine Sicht-Legende) und wird ignoriert.
  function pullSharedIntoState(shared) {
    const { yearFrom, yearTo } = zeitfensterToYearRange(shared.zeitfenster);
    state.yearFrom = yearFrom == null ? minYear : Math.max(minYear, yearFrom);
    state.yearTo = yearTo == null ? maxYear : Math.min(maxYear, yearTo);
    state.selectedCity = shared.ort || null;
  }
  pullSharedIntoState(getFilter());

  const inEntity = o => !state.entity || state.entity.records.has(o.recordId);
  const inWindow = o => {
    const y = extractYear(o.date);
    return y == null || (y >= state.yearFrom && y <= state.yearTo);
  };

  // Ereignis-Region (Statuszeile / Ortsauswahl).
  const detailRegion = el('div', { className: 'mob-panel__detail' });
  const panelNode = el('div', { className: 'mob-panel' }, detailRegion);

  // ---- Sidebar (deklarativ) ----
  const sidebar = createSidebar({
    sections: [
      {
        title: 'Entität',
        controls: [{
          kind: 'custom', className: 'mob-entity',
          build: region => buildEntityPicker(region, entities, state, () => {
            state.selectedCity = null;
            redraw();
          }),
          update: region => refreshEntityPicker(region, entities, state),
        }],
      },
      {
        title: 'Zeitraum',
        controls: [
          { kind: 'range', min: minYear, max: maxYear, fullLabel: true,
            from: () => state.yearFrom, to: () => state.yearTo,
            onChange: (f, t) => {
              state.yearFrom = f; state.yearTo = t;
              _syncGuard.run(() => setFilter({ zeitfenster: yearRangeToZeitfenster(f, t, span) }));
              redraw();
            } },
        ],
      },
      {
        title: 'Farbschlüssel',
        controls: [{
          kind: 'staticLegend',
          rows: SICHTEN.map(t => ({ color: t.color, label: t.label })),
        }],
      },
      {
        title: 'Verortung',
        controls: [{
          kind: 'staticLegend',
          rows: [
            { markerClass: 'mob-vmark mob-vmark--secured', label: 'gesichert (Ort/Stadt)' },
            { markerClass: 'mob-vmark mob-vmark--city', label: 'stadtgenau (Adresse → Stadt)' },
            { markerClass: 'mob-vmark mob-vmark--far', label: 'weit · prüfen' },
          ],
        }],
      },
      {
        controls: [{ kind: 'custom', node: panelNode }],
      },
    ],
  });

  // ---- Karte (volle Restbreite und -hoehe) ----
  const mapCell = el('div', { className: 'mob-map' },
    el('div', { className: 'mob-map__loading' }, 'Karte wird geladen …'));
  const main = el('div', { className: 'view-main' }, mapCell);

  container.appendChild(viewShell(sidebar.element, main));

  let draw = () => {};
  function redraw() { draw(); renderPanel(); sidebar.update(); }

  // Aktuell sichtbare Belege (Entitaet). Fuer die Detailliste eines gewaehlten Orts.
  const currentAll = () => allOcc.filter(inEntity);

  // Detail-Region: nur die gewaehlte Entitaet (Kopf mit Loesen) und, bei
  // Knoten-Klick, die Belege des Orts. Keine Status-/Zaehlzeile mehr.
  function renderPanel() {
    clear(detailRegion);

    if (state.entity) {
      detailRegion.appendChild(el('div', { className: 'mob-entity__active' },
        el('span', { className: 'mob-entity__activename' }, state.entity.name),
        el('button', { className: 'mob-detail__clear', type: 'button',
          onClick: () => { state.entity = null; state.selectedCity = null; redraw(); } }, 'Auswahl lösen')));
    }

    if (state.selectedCity) {
      const list = currentAll().filter(o => cityOf(o.place) === state.selectedCity);
      detailRegion.appendChild(el('div', { className: 'mob-detail__head' },
        el('h3', { className: 'mob-detail__title' }, state.selectedCity),
        el('button', { className: 'mob-detail__clear', type: 'button',
          onClick: () => { state.selectedCity = null; redraw(); } }, 'Ort lösen')));

      // Zuordnungen: Anteile nach Sicht (gestapelter Balken + Zeilen mit Zahl).
      const bd = breakdownByView(list);
      const bar = el('div', { className: 'mob-detail__bar' });
      for (const s of barSegments(bd)) {
        const seg = el('span', { title: `${s.label}: ${s.count}` });
        seg.style.width = s.pct + '%';
        seg.style.background = s.color;
        bar.appendChild(seg);
      }
      detailRegion.appendChild(bar);
      const rows = el('div', { className: 'mob-detail__rows' });
      for (const b of bd) {
        const sw = el('span', { className: 'mob-detail__sw' });
        sw.style.background = b.color;
        rows.appendChild(el('div', { className: 'mob-detail__row' },
          sw, el('span', { className: 'mob-detail__rowlabel' }, b.label),
          el('span', { className: 'mob-detail__rown' }, String(b.count))));
      }
      detailRegion.appendChild(rows);

      // Dokumente: alle verknuepften Belege, nach Datum. docCount = distinkte Records.
      const docCount = new Set(list.map(o => o.recordId).filter(Boolean)).size;
      detailRegion.appendChild(el('div', { className: 'mob-detail__subhead' },
        `Dokumente (${docCount})`));
      const chips = el('div', { className: 'mob-chips' });
      for (const o of sortOcc(list)) chips.appendChild(buildOccChip(o));
      detailRegion.appendChild(chips);
      return;
    }

    // Ohne Ortsauswahl: nicht verortbare Belege ehrlich ausweisen (kein
    // Kartenpunkt moeglich). Kompakt und eingeklappt, entitaetsbezogen.
    const unloc = currentAll().filter(o => o.placement === 'unlocatable');
    if (unloc.length) {
      const cities = [...new Set(unloc.map(o => cityOf(o.place)))];
      const det = el('details', { className: 'mob-unloc' });
      det.appendChild(el('summary', { className: 'mob-unloc__summary' },
        `${cities.length} Orte ohne Koordinate`));
      det.appendChild(el('div', { className: 'mob-detail__note' },
        'Erfasst, aber (noch) nicht mit Wikidata verortet — daher kein Kartenpunkt.'));
      const chips = el('div', { className: 'mob-chips' });
      for (const o of sortOcc(unloc)) chips.appendChild(buildOccChip(o));
      det.appendChild(chips);
      detailRegion.appendChild(det);
    }
  }

  // Geometrie laden (gecacht), dann zeichnen
  loadCountries().then(countries => {
    const map = buildMap(mapCell, countries, withGeo, state, {
      inEntity, inWindow,
      onSelectCity: city => {
        state.selectedCity = state.selectedCity === city ? null : city;
        _syncGuard.run(() => setFilter({ ort: state.selectedCity || '' }));
        redraw();
      },
    });
    draw = map.draw;
    redraw();
  }).catch(() => {
    clear(mapCell);
    mapCell.appendChild(el('div', { className: 'mob-empty' },
      'Ländergeometrie konnte nicht geladen werden. Liste in der Sidebar nutzen.'));
  });

  // Geteilter Filter (M4): externe Aenderung (zeitfenster/ort) anwenden.
  if (_unsubscribeFilter) _unsubscribeFilter();
  _unsubscribeFilter = subscribe((shared) => {
    if (_syncGuard.isActive()) return;
    pullSharedIntoState(shared);
    redraw();
  }, { immediate: false });

  logStamp('karte', [
    ['entitaeten', entities.length],
    ['orte', new Set(withGeo.map(o => cityOf(o.place))).size],
    ['belege', allOcc.length],
    ['unverortet', allOcc.length - withGeo.length],
    ['jahre', `${minYear}-${maxYear}`],
  ]);
}

// ---------------------------------------------------------------------------
// Entitaets-Auswahl (Sidebar-Custom-Control)
// ---------------------------------------------------------------------------

function buildEntityPicker(region, entities, state, onSelect) {
  const kinds = el('div', { className: 'mob-entity__kinds' });
  const kindBtn = (id, label) => {
    const b = el('button', { className: 'mob-entity__kind', type: 'button', 'data-kind': id }, label);
    b.addEventListener('click', () => { state.entityKind = id; refreshEntityPicker(region, entities, state); });
    return b;
  };
  kinds.append(kindBtn('all', 'Alle'), kindBtn('org', 'Organisationen'), kindBtn('person', 'Personen'));

  const search = el('input', { type: 'search', className: 'vs-search mob-entity__search',
    placeholder: 'Entität suchen…' });
  search.addEventListener('input', () => { state.entityQuery = search.value; refreshEntityPicker(region, entities, state); });

  const list = el('div', { className: 'mob-entity__list' });
  list.addEventListener('click', (ev) => {
    const item = ev.target.closest('[data-entity-id]');
    if (!item) return;
    const id = item.getAttribute('data-entity-id');
    state.entity = id === '__all__' ? null : entities.find(e => e.id === id) || null;
    onSelect();
  });

  region.append(kinds, search, list);
  refreshEntityPicker(region, entities, state);
}

function refreshEntityPicker(region, entities, state) {
  // Kind-Buttons markieren
  region.querySelectorAll('.mob-entity__kind').forEach(b =>
    b.classList.toggle('mob-entity__kind--on', b.getAttribute('data-kind') === state.entityKind));

  const list = region.querySelector('.mob-entity__list');
  if (!list) return;
  clear(list);

  const q = (state.entityQuery || '').trim().toLowerCase();
  const inKind = e => state.entityKind === 'all' || e.kind === state.entityKind;
  let matches = entities.filter(e => inKind(e) && (!q || e.name.toLowerCase().includes(q)));

  // "Alle …" als Reset-Option oben, mit der Gesamtzahl der aktuellen Art
  // (unabhaengig von der Suche), damit immer ersichtlich ist, wie viele es gibt.
  const kindTotal = entities.filter(inKind).length;
  const kindLabel = state.entityKind === 'org' ? 'Alle Organisationen'
    : state.entityKind === 'person' ? 'Alle Personen' : 'Alle Entitäten';
  const allRow = el('button', {
    className: 'mob-entity__item mob-entity__item--all' + (state.entity ? '' : ' mob-entity__item--on'),
    type: 'button', 'data-entity-id': '__all__' },
    el('span', { className: 'mob-entity__name' }, kindLabel),
    el('span', { className: 'mob-entity__count' }, String(kindTotal)));
  list.appendChild(allRow);

  const CAP = 60;  // lange Trefferlisten kappen, Hinweis ausweisen (kein Silent-Cut)
  for (const e of matches.slice(0, CAP)) {
    const row = el('button', {
      className: 'mob-entity__item' + (state.entity && state.entity.id === e.id ? ' mob-entity__item--on' : ''),
      type: 'button', 'data-entity-id': e.id,
      title: `${e.kind === 'org' ? 'Organisation' : 'Person'} · ${e.records.size} Records`,
    },
      el('span', { className: 'mob-entity__kindtag' }, e.kind === 'org' ? 'Org' : 'Pers'),
      el('span', { className: 'mob-entity__name' }, e.name),
      el('span', { className: 'mob-entity__count' }, String(e.records.size)));
    list.appendChild(row);
  }
  if (matches.length > CAP) {
    list.appendChild(el('div', { className: 'mob-entity__more' },
      `${matches.length - CAP} weitere — Suche eingrenzen`));
  }
  if (matches.length === 0) {
    list.appendChild(el('div', { className: 'mob-entity__more' }, 'Kein Treffer'));
  }
}

// ---------------------------------------------------------------------------
// Karte: Projektion, Knoten, Zoom (ohne Pfad)
// ---------------------------------------------------------------------------

function loadCountries() {
  if (COUNTRIES) return Promise.resolve(COUNTRIES);
  return fetch(GEO_URL).then(r => r.json()).then(geo => { COUNTRIES = geo; return geo; });
}

function buildMap(mapCell, countries, withGeo, state, opts) {
  clear(mapCell);
  const width = Math.max(320, mapCell.clientWidth || 960);
  const height = Math.max(440, mapCell.clientHeight || 600);

  // Projektion einmalig auf den europaeischen Schwerpunkt ALLER Belege einpassen
  // (nicht pro Entitaet), damit die Karte beim Wechsel der Auswahl nicht springt.
  const eur = withGeo.filter(o => o.placeLon > -15 && o.placeLon < 35 && o.placeLat > 34 && o.placeLat < 60);
  const fitPoints = {
    type: 'FeatureCollection',
    features: (eur.length ? eur : withGeo).map(o => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [o.placeLon, o.placeLat] },
    })),
  };
  const projection = d3.geoMercator();
  const pad = 60;
  projection.fitExtent([[pad, pad], [width - pad, height - pad]], fitPoints);
  const path = d3.geoPath(projection);

  // Knoten als Tortendiagramm: jeder Ort zeigt die Anteile der Mobilitaetssichten
  // (Auftritt, Engagement, Reise & Korrespondenz, Rezeption, Biografisch,
  // Weiterer Ortsbezug) als Kreissegmente. Reihenfolge stabil (sort null) entlang
  // der breakdown-Liste.
  const pieGen = d3.pie().value(s => s.count).sort(null);
  const arcGen = d3.arc();

  // HTML-Tooltip ueber dem SVG.
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
    const bd = d.breakdown || [];
    // Gestapelter Proportionsbalken: zeigt die Anteile auf einen Blick, bevor die
    // Detailzeilen die genauen Zahlen geben.
    const bar = `<div class="mob-tip__bar">` + barSegments(bd).map(s =>
      `<span style="width:${s.pct.toFixed(1)}%;background:${s.color}" title="${s.label}"></span>`).join('') + `</div>`;
    const rows = bd.map(b =>
      `<span class="mob-tip__row"><span class="mob-tip__sw" style="background:${b.color}"></span>` +
      `${b.label}<span class="mob-tip__n">${b.count}</span></span>`).join('');
    showTip(
      `<strong>${escapeHtml(d.city)}</strong>` + bar + rows +
      `<span class="mob-tip__row mob-tip__meta">${d.shown} Belege · ${span}</span>`,
      mx, my);
  }

  const svg = d3.select(mapCell).append('svg')
    .attr('class', 'mob-map__svg')
    .attr('width', width).attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  const gZoom = svg.append('g');
  // Basemap: Ozean kommt aus dem SVG-Hintergrund (deckt den ganzen Viewport,
  // robuster als eine Mercator-Sphere, deren Pole ins Unendliche laufen). Darauf
  // das Gradnetz, dann Land, dann Knoten. Alles lokal aus der Projektion erzeugt
  // — keine externe Quelle, voll GitHub-Pages-tauglich. non-scaling-stroke haelt
  // Gitter- und Grenzlinien beim Zoomen konstant duenn.
  gZoom.append('path').attr('class', 'mob-graticule')
    .attr('d', path(d3.geoGraticule().step([10, 10])()))
    .attr('vector-effect', 'non-scaling-stroke');
  const gLand = gZoom.append('g').attr('class', 'mob-land');
  const gNodes = gZoom.append('g').attr('class', 'mob-nodes');

  gLand.selectAll('path').data(countries.features).enter().append('path')
    .attr('d', path)
    .attr('fill', 'var(--color-parchment)')
    .attr('stroke', 'var(--color-sand)')
    .attr('stroke-width', 0.6)
    .attr('vector-effect', 'non-scaling-stroke');

  let currentK = 1;
  let maxShown = 1;
  const minK = 0.3, maxK = 12;
  const zoom = d3.zoom().scaleExtent([minK, maxK])
    .on('zoom', (ev) => {
      currentK = ev.transform.k;
      gZoom.attr('transform', ev.transform);
      applyLabelLayer();
    });
  svg.call(zoom);

  // Zoom-Steuerung (oben links)
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

  // Knoten je Stadt aus den aktuell sichtbaren (Entitaet x Geo) Belegen bauen.
  // Stadt-Schluessel case-insensitiv (mergt "wien"/"Wien"), Anzeigename = die
  // haeufigste Originalschreibung. Ferne Ausreisser (New-York-Fehlmatch AF-01)
  // werden als normaler Knoten gesetzt und sind per Herauszoomen erreichbar.
  function buildNodes() {
    const m = new Map();
    for (const o of withGeo) {
      if (!opts.inEntity(o)) continue;
      const cityRaw = cityOf(o.place);
      const key = cityRaw.toLowerCase();
      const [x, y] = projection([o.placeLon, o.placeLat]);
      if (!m.has(key)) m.set(key, { key, x, y, occ: [], casing: new Map() });
      const n = m.get(key);
      n.occ.push(o);
      n.casing.set(cityRaw, (n.casing.get(cityRaw) || 0) + 1);
    }
    for (const n of m.values()) {
      n.city = [...n.casing.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
    return m;
  }

  function drawMap() {
    const nodeByKey = buildNodes();
    const nodes = [...nodeByKey.values()].map(n => {
      const evsWin = n.occ.filter(opts.inWindow);
      // Anteile aus den Belegen im Zeitfenster (sonst aus allen), damit der
      // Zeitfilter die Tortenstuecke mitfiltert.
      const breakdown = breakdownByView(evsWin.length ? evsWin : n.occ);
      // Verortungs-Stufe des Knotens (entitaetsgefiltert): approx = keine
      // gesicherte Koordinate hier (nur stadtgenau hochgerollt); far = nur weit
      // entfernte Belege (Fehlmatch-Verdacht). Steuert den Ring-Stil.
      const nSecured = n.occ.filter(o => o.placement === 'secured').length;
      const nFar = n.occ.filter(o => o.placement === 'far').length;
      return { ...n, total: n.occ.length, shown: evsWin.length,
        dom: breakdown.length ? breakdown[0].id : KONTEXT_ID, breakdown,
        approx: nSecured === 0, far: nFar > 0 && nSecured === 0,
        firstYear: firstYear(n.occ), lastYear: lastYear(n.occ) };
    });
    maxShown = 1;
    for (const n of nodes) maxShown = Math.max(maxShown, n.shown);

    const sel = gNodes.selectAll('g.mob-node').data(nodes, d => d.key);
    sel.exit().remove();
    const enter = sel.enter().append('g').attr('class', 'mob-node')
      .style('cursor', 'pointer')
      .on('click', (_, d) => opts.onSelectCity(d.city))
      .on('mouseenter', (event, d) => showNodeTip(event, d))
      .on('mousemove', (event, d) => showNodeTip(event, d))
      .on('mouseleave', hideTip);
    enter.append('g').attr('class', 'mob-node__pie');
    enter.append('circle').attr('class', 'mob-node__ring');
    enter.append('text');
    // Groesserer Mindestradius, damit auch Orte mit nur einem Beleg klar sichtbar
    // sind (Kritik: minimale Datensaetze kaum erkennbar). sqrt-Skala von 7 bis 24.
    const radiusOf = d => d.shown === 0 ? 4 : 7 + Math.round(17 * Math.sqrt(d.shown / maxShown));
    const merged = enter.merge(sel)
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('opacity', d => d.shown === 0 ? 0.3 : 1);

    // Tortensegmente je Sicht. shown===0 (ausserhalb des Zeitfensters) -> kein
    // Pie, nur der gedaempfte Basis-Dot ueber den Ring. vector-effect haelt die
    // Trennlinien beim Zoomen konstant duenn.
    merged.each(function (d) {
      const g = d3.select(this).select('.mob-node__pie');
      arcGen.innerRadius(0).outerRadius(radiusOf(d));
      const data = d.shown === 0 ? [] : pieGen(d.breakdown);
      const slices = g.selectAll('path').data(data, s => s.data.id);
      slices.exit().remove();
      slices.enter().append('path')
        .merge(slices)
        .attr('d', arcGen)
        .style('fill', s => s.data.color)
        .attr('fill-opacity', 0.9)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('vector-effect', 'non-scaling-stroke');
    });

    // Ring drueckt die Verortungs-Sicherheit aus: durchgezogen = gesichert,
    // gestrichelt = stadtgenau (hochgerollt), gestrichelt-warnfarben = weit/
    // pruefen (Fehlmatch-Verdacht). Auswahl uebersteuert mit KUG-blauem Ring.
    // non-scaling-stroke haelt die Ringstaerke beim Zoomen konstant.
    const ringStroke = d => {
      if (state.selectedCity === d.city) return 'var(--color-kug-blau)';
      if (d.far) return '#A6552F';
      if (d.approx) return 'var(--color-sand)';
      return d.shown === 0 ? '#fff' : 'rgba(40,30,20,0.25)';
    };
    merged.select('.mob-node__ring')
      .attr('r', radiusOf)
      .attr('vector-effect', 'non-scaling-stroke')
      .style('fill', d => d.shown === 0 ? colorOf(d.dom) : 'none')
      .attr('fill-opacity', d => d.shown === 0 ? 0.5 : 0)
      .style('stroke', ringStroke)
      .attr('stroke-width', d => state.selectedCity === d.city ? 3
        : (d.far || d.approx ? 1.5 : (d.shown === 0 ? 1 : 0.8)))
      .attr('stroke-dasharray', d => (state.selectedCity !== d.city && (d.far || d.approx)) ? '3 2' : null);
    merged.select('text')
      .text(d => d.city)
      .attr('x', d => radiusOf(d) + 3)
      .attr('y', 4)
      .attr('class', 'mob-node__label');

    applyLabelLayer();
  }

  return { draw: drawMap };
}

// Segmente fuer den gestapelten Proportionsbalken: [{ pct, color, label, count }].
// Geteilt zwischen Hover-Tooltip (HTML) und Klick-Detail (DOM).
function barSegments(breakdown) {
  const sum = breakdown.reduce((s, b) => s + b.count, 0) || 1;
  return breakdown.map(b => ({ pct: b.count / sum * 100, color: b.color, label: b.label, count: b.count }));
}

// Sicht-Aufschluesselung eines Knotens, absteigend nach Haeufigkeit.
function breakdownByView(occ) {
  const c = new Map();
  for (const o of occ) { const id = sichtOf(o); c.set(id, (c.get(id) || 0) + 1); }
  return [...c.entries()]
    .map(([id, count]) => {
      const t = TYPE_BY_ID.get(id) || TYPE_BY_ID.get(KONTEXT_ID);
      return { id, label: t.label, color: t.color, count };
    })
    .sort((a, b) => b.count - a.count);
}
function firstYear(occ) {
  const ys = occ.map(o => extractYear(o.date)).filter(y => y != null);
  return ys.length ? Math.min(...ys) : null;
}
function lastYear(occ) {
  const ys = occ.map(o => extractYear(o.date)).filter(y => y != null);
  return ys.length ? Math.max(...ys) : null;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ---------------------------------------------------------------------------
// Listen-Helfer (Ortsauswahl)
// ---------------------------------------------------------------------------

function sortOcc(occ) {
  return occ.slice().sort((a, b) => {
    const ya = extractYear(a.date), yb = extractYear(b.date);
    if (ya != null && yb != null && ya !== yb) return ya - yb;
    if (ya != null && yb == null) return -1;
    if (ya == null && yb != null) return 1;
    const pa = (a.place || '').localeCompare(b.place || '', 'de-DE');
    return pa !== 0 ? pa : (a.role || '').localeCompare(b.role || '', 'de-DE');
  });
}

function buildOccChip(o) {
  const date = o.date ? (formatDate(o.date) || o.date) : '—';
  const place = o.place || 'unbekannt';
  // Verortungs-Notiz: macht die Sicherheit der Platzierung pro Beleg sichtbar.
  const note = o.placement === 'city' ? 'stadtgenau'
    : o.placement === 'far' ? 'weit · prüfen'
    : o.placement === 'unlocatable' ? (o.placeWikidata ? 'Q-ID ohne Koordinaten' : 'ohne Koordinate')
    : null;
  return buildRoleChip({
    prefix: o.role || (o.source === 'ste' ? 'EREIGNIS' : 'ORT'),
    value: `${place} · ${date}${note ? ' · ' + note : ''}`,
    xlsxSource: o.xlsxSource,
    wikidata: o.placeWikidata,
    tip: o.recordId || '',
    onClick: () => { if (o.recordId) window.location.hash = '#bestand/' + encodeURIComponent(o.recordId); },
  });
}
