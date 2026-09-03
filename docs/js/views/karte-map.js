/**
 * Kartenrendering: Projektion, Basemap, Knoten, Zoom und Tooltip (D3-geo).
 *
 * Kein State-Eigentum: `state` gehoert der View, `opts` liefert die Filter
 * (inEntity/inWindow) und den Klick-Kanal. Zurueck kommt nur `{ draw }`.
 */

/* global d3 */

import { el, clear, escapeHtml } from '../utils/dom.js';
import { cityOf } from '../utils/format.js';
import {
  KONTEXT_ID, colorOf, breakdownByView, barSegments, firstYear, lastYear,
} from './karte-data.js';

const GEO_URL = 'data/geo/countries-110m.geo.json';
let COUNTRIES = null;  // module-level cache, ueber Tab-Wechsel hinweg

export function loadCountries() {
  if (COUNTRIES) return Promise.resolve(COUNTRIES);
  return fetch(GEO_URL).then(r => r.json()).then(geo => { COUNTRIES = geo; return geo; });
}

export function buildMap(mapCell, countries, withGeo, state, opts) {
  clear(mapCell);
  // Ortsauswahl ist seit E-151 eine Liste; die Hervorhebung gilt jedem Wert.
  const isSelectedCity = (city) => state.selectedCities.includes(city);
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
    // style() statt attr(): var() loest in einem Presentation Attribute nicht auf.
    // The land takes the neutral grey, not the tinted surface step: a blue land
    // mass over a white sea inverts the reading of the map.
    .style('fill', 'var(--line)')
    .style('stroke', 'var(--line-strong)')
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
        if (isSelectedCity(d.city)) return 1;
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
        .style('stroke', 'var(--surface)')
        .attr('stroke-width', 1)
        .attr('vector-effect', 'non-scaling-stroke');
    });

    // Ring drueckt die Verortungs-Sicherheit aus: durchgezogen = gesichert,
    // gestrichelt = stadtgenau (hochgerollt), gestrichelt in Signalrot = weit/
    // pruefen (Fehlmatch-Verdacht). Auswahl uebersteuert mit KUG-blauem Ring.
    // non-scaling-stroke haelt die Ringstaerke beim Zoomen konstant.
    const ringStroke = d => {
      if (isSelectedCity(d.city)) return 'var(--accent)';
      if (d.far) return 'var(--color-error)';
      if (d.approx) return 'var(--line-strong)';
      return d.shown === 0 ? 'var(--surface)' : 'var(--line-strong)';
    };
    merged.select('.mob-node__ring')
      .attr('r', radiusOf)
      .attr('vector-effect', 'non-scaling-stroke')
      .style('fill', d => d.shown === 0 ? colorOf(d.dom) : 'none')
      .attr('fill-opacity', d => d.shown === 0 ? 0.5 : 0)
      .style('stroke', ringStroke)
      .attr('stroke-width', d => isSelectedCity(d.city) ? 3
        : (d.far || d.approx ? 1.5 : (d.shown === 0 ? 1 : 0.8)))
      .attr('stroke-dasharray', d => (!isSelectedCity(d.city) && (d.far || d.approx)) ? '3 2' : null);
    merged.select('text')
      .text(d => d.city)
      .attr('x', d => radiusOf(d) + 3)
      .attr('y', 4)
      .attr('class', 'mob-node__label');

    applyLabelLayer();
  }

  return { draw: drawMap };
}
