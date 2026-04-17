/**
 * M3GIM Biogramm-Tab — chronologische Gesamtsicht auf Malaniuk.
 *
 * Vier visuelle Ebenen (Designgrundlage: interface-konzept § 2 + § Daten-
 * Praesentations-Muster):
 *   1. Lebensphasen-Band (1919–2009, gestrichelt unterteilt)
 *   2. Orte-Spur (aus store.mobilityEvents, horizontal nach Datum,
 *      vertikal nach Land)
 *   3. Belege-Spur (Records mit rico:date, farbig nach DFT-Typ)
 *   4. Flucht-Marker (vertikale Linie 1944, Signal-Rot)
 *
 * Kopplung: Phasenklick scrollt X-Scale; Brush filtert die Belege-Liste
 * im Detail-Panel darunter; Klick auf einen Beleg navigiert ins Archiv.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur } from '../utils/format.js';
import { buildRoleChip } from './archiv-inline-detail.js';
import { navigateToView } from '../ui/router.js';

const D3 = typeof d3 !== 'undefined' ? d3 : null;

// ---------------------------------------------------------------------------
// Lebensphasen — vorgegebene Partitionen aus dem Forschungsrahmen
// ---------------------------------------------------------------------------

const PHASES = [
  { key: 'jugend',       label: 'Jugend',              from: 1919, to: 1944, color: '#8B7355' },
  { key: 'nachkrieg',    label: 'Nachkriegs-Graz',     from: 1945, to: 1950, color: '#A05A3E' },
  { key: 'karriere',     label: 'Europaeische Karriere', from: 1951, to: 1965, color: '#2E7D4F' },
  { key: 'lehre',        label: 'Lehrtaetigkeit',      from: 1966, to: 2009, color: '#3F5B88' },
];

const FLUCHT_YEAR = 1944;

// ---------------------------------------------------------------------------
// Daten-Extraktion
// ---------------------------------------------------------------------------

function parseYear(dateStr) {
  if (!dateStr) return null;
  const m = String(dateStr).match(/\d{4}/);
  return m ? parseInt(m[0], 10) : null;
}

function extractBiogrammData(store) {
  // Orte-Spur: mobilityEvents mit Datum
  const orte = [];
  for (const ev of store.mobilityEvents.values()) {
    const year = parseYear(ev.date);
    if (!year) continue;
    orte.push({
      id: ev.id,
      year,
      date: ev.date,
      place: ev.place || '?',
      country: ev.placeCountry || 'Unbekannt',
      role: ev.role,
      recordId: ev.recordId,
      xlsxSource: ev.xlsxSource,
    });
  }
  orte.sort((a, b) => a.year - b.year);

  // Belege-Spur: alle Records mit Datum
  const belege = [];
  for (const rec of store.records.values()) {
    if (rec['@type'] === 'rico:RecordSet') continue;
    const year = parseYear(rec['rico:date']);
    if (!year) continue;
    const dft = rec['rico:hasDocumentaryFormType'];
    const dftId = (dft && dft['@id']) || (typeof dft === 'string' ? dft : null);
    belege.push({
      id: rec['@id'],
      year,
      date: rec['rico:date'],
      title: rec['rico:title'] || '(ohne Titel)',
      signatur: rec['rico:identifier'] || '',
      dft: dftId,
    });
  }
  belege.sort((a, b) => a.year - b.year);

  return { orte, belege };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

let _store = null;
let _container = null;
let _data = null;
let _xDomain = null;  // [fromYear, toYear] — aktuell gewaehlte Spanne
let _selectedBeleg = null;

export function renderBiogramm(store, container) {
  _store = store;
  _container = container;
  _data = extractBiogrammData(store);
  _xDomain = [1919, 2009];
  _selectedBeleg = null;
  draw();
}

function draw() {
  clear(_container);

  _container.appendChild(renderHeader());
  _container.appendChild(renderPhaseBar());

  const chartWrap = el('div', { className: 'biogramm__chart-wrap', id: 'biogramm-chart' });
  _container.appendChild(chartWrap);
  drawChart(chartWrap);

  _container.appendChild(renderDetailPanel());
}

function renderHeader() {
  return el('header', { className: 'biogramm__header' },
    el('h2', { className: 'biogramm__title' }, 'Biogramm'),
    el('p', { className: 'biogramm__subtitle' },
      'Chronologische Gesamtsicht: Orte und Belege entlang der Lebensspanne (1919–2009). ',
      'Rote Linie = Flucht 1944. Klick auf eine Phase zoomt den Zeitstrahl.'),
  );
}

function renderPhaseBar() {
  const bar = el('nav', { className: 'biogramm__phases' });
  // "Alles" zuerst
  bar.appendChild(phaseBtn({
    key: 'alles', label: 'Alles (1919–2009)', from: 1919, to: 2009,
    color: '#5C5651', active: _xDomain[0] === 1919 && _xDomain[1] === 2009,
  }));
  for (const p of PHASES) {
    bar.appendChild(phaseBtn({
      ...p,
      active: _xDomain[0] === p.from && _xDomain[1] === p.to,
    }));
  }
  return bar;
}

function phaseBtn({ key, label, from, to, color, active }) {
  return el('button', {
    className: `biogramm__phase-btn${active ? ' biogramm__phase-btn--active' : ''}`,
    onClick: () => {
      _xDomain = [from, to];
      _selectedBeleg = null;
      draw();
    },
    style: active ? `border-color: ${color}; color: ${color};` : '',
  },
    el('span', { className: 'biogramm__phase-label' }, label),
    el('span', { className: 'biogramm__phase-range' }, `${from}–${to}`),
  );
}

function drawChart(wrap) {
  if (!D3) {
    wrap.appendChild(el('div', { className: 'biogramm__no-d3' },
      'D3.js nicht verfuegbar — Biogramm-Diagramm kann nicht gerendert werden.'));
    return;
  }

  const width = wrap.clientWidth || 900;
  const marginLeft = 72, marginRight = 24, marginTop = 12, marginBottom = 32;
  const laneH = 90;        // Orte-Lane
  const belegLaneH = 48;   // Belege-Lane
  const height = marginTop + laneH + belegLaneH + marginBottom;

  const svg = D3.select(wrap).append('svg')
    .attr('class', 'biogramm__svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const xScale = D3.scaleLinear()
    .domain(_xDomain)
    .range([marginLeft, width - marginRight]);

  // Lane: Orte (gruppiert nach Land, Y bandScale)
  const orteInRange = _data.orte.filter(o => o.year >= _xDomain[0] && o.year <= _xDomain[1]);
  const countries = [...new Set(orteInRange.map(o => o.country))].sort();
  const yLand = D3.scaleBand()
    .domain(countries)
    .range([marginTop + 8, marginTop + laneH])
    .padding(0.15);

  // Land-Labels links
  svg.append('g')
    .selectAll('.biogramm__land-label')
    .data(countries)
    .join('text')
    .attr('class', 'biogramm__land-label')
    .attr('x', marginLeft - 8)
    .attr('y', c => yLand(c) + yLand.bandwidth() / 2 + 4)
    .attr('text-anchor', 'end')
    .attr('font-size', 10)
    .attr('fill', '#5C5651')
    .text(c => c.length > 14 ? c.slice(0, 13) + '…' : c);

  // Orte-Hintergrund-Grid pro Land
  svg.append('g')
    .selectAll('.biogramm__land-row')
    .data(countries)
    .join('rect')
    .attr('class', 'biogramm__land-row')
    .attr('x', marginLeft)
    .attr('y', c => yLand(c))
    .attr('width', width - marginLeft - marginRight)
    .attr('height', yLand.bandwidth())
    .attr('fill', (c, i) => i % 2 === 0 ? '#f9f4e9' : 'transparent');

  // Flucht-Marker (falls in Range)
  if (FLUCHT_YEAR >= _xDomain[0] && FLUCHT_YEAR <= _xDomain[1]) {
    const fluchtX = xScale(FLUCHT_YEAR);
    svg.append('line')
      .attr('class', 'biogramm__flucht-line')
      .attr('x1', fluchtX).attr('x2', fluchtX)
      .attr('y1', marginTop).attr('y2', height - marginBottom)
      .attr('stroke', '#C23B22')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 3');
    svg.append('text')
      .attr('x', fluchtX + 4)
      .attr('y', marginTop + 10)
      .attr('font-size', 10)
      .attr('fill', '#C23B22')
      .attr('font-weight', '600')
      .text('Flucht 1944');
  }

  // Orte-Punkte
  svg.append('g')
    .selectAll('.biogramm__ort-dot')
    .data(orteInRange)
    .join('circle')
    .attr('class', 'biogramm__ort-dot')
    .attr('cx', o => xScale(o.year))
    .attr('cy', o => yLand(o.country) + yLand.bandwidth() / 2)
    .attr('r', 4)
    .attr('fill', '#004A8F')
    .attr('fill-opacity', 0.6)
    .attr('stroke', '#004A8F')
    .attr('stroke-width', 0.8)
    .on('mouseenter', function (ev, o) {
      D3.select(this).attr('r', 6).attr('fill-opacity', 1);
      showTooltip(ev, `${o.place}, ${o.date}${o.role ? ' · ' + o.role : ''}`);
    })
    .on('mouseleave', function () {
      D3.select(this).attr('r', 4).attr('fill-opacity', 0.6);
      hideTooltip();
    })
    .on('click', (ev, o) => {
      if (o.recordId) navigateToView('archiv', { recordId: o.recordId });
    })
    .append('title').text(o => `${o.place}, ${o.date}`);

  // Belege-Lane unten
  const belegY = marginTop + laneH + 20;
  svg.append('text')
    .attr('x', marginLeft - 8).attr('y', belegY + 8)
    .attr('text-anchor', 'end').attr('font-size', 10).attr('fill', '#5C5651')
    .text('Belege');

  const belegeInRange = _data.belege.filter(b => b.year >= _xDomain[0] && b.year <= _xDomain[1]);
  svg.append('g')
    .selectAll('.biogramm__beleg-dot')
    .data(belegeInRange)
    .join('circle')
    .attr('class', 'biogramm__beleg-dot')
    .attr('cx', b => xScale(b.year))
    .attr('cy', belegY + (Math.random() * 16 - 8))  // leichte Jitter gegen Overplotting
    .attr('r', 2.5)
    .attr('fill', '#8B7355')
    .attr('fill-opacity', 0.55)
    .on('mouseenter', function (ev, b) {
      D3.select(this).attr('r', 4.5).attr('fill-opacity', 1);
      showTooltip(ev, `${b.signatur}: ${b.title} (${b.date})`);
    })
    .on('mouseleave', function () {
      D3.select(this).attr('r', 2.5).attr('fill-opacity', 0.55);
      hideTooltip();
    })
    .on('click', (ev, b) => {
      _selectedBeleg = b;
      drawDetailPanel();
    });

  // X-Achse
  const axis = D3.axisBottom(xScale).tickFormat(D3.format('d'));
  svg.append('g')
    .attr('transform', `translate(0, ${height - marginBottom + 2})`)
    .call(axis)
    .attr('font-size', 10);
}

function renderDetailPanel() {
  const panel = el('aside', { className: 'biogramm__detail', id: 'biogramm-detail' });
  drawDetailPanel(panel);
  return panel;
}

function drawDetailPanel(panel) {
  panel = panel || _container.querySelector('#biogramm-detail');
  if (!panel) return;
  clear(panel);

  if (!_selectedBeleg) {
    // Summary der sichtbaren Spanne
    const inRangeBelege = _data.belege.filter(b => b.year >= _xDomain[0] && b.year <= _xDomain[1]);
    const inRangeOrte = _data.orte.filter(o => o.year >= _xDomain[0] && o.year <= _xDomain[1]);
    panel.appendChild(el('h3', { className: 'biogramm__detail-title' }, 'Uebersicht'));
    const chips = el('div', { className: 'biogramm__detail-chips' });
    chips.appendChild(buildRoleChip({ prefix: 'ORTE',   value: String(inRangeOrte.length),   cluster: 'ort' }));
    chips.appendChild(buildRoleChip({ prefix: 'BELEGE', value: String(inRangeBelege.length), cluster: 'neutral' }));
    chips.appendChild(buildRoleChip({ prefix: 'JAHRE',  value: `${_xDomain[0]}–${_xDomain[1]}`, cluster: 'datum' }));
    panel.appendChild(chips);
    panel.appendChild(el('p', { className: 'biogramm__detail-hint' },
      'Klick auf einen Beleg-Punkt zeigt Details. Klick auf einen Ort-Punkt oeffnet den Record im Archiv.'));
    return;
  }

  const b = _selectedBeleg;
  panel.appendChild(el('h3', { className: 'biogramm__detail-title' }, b.title));
  panel.appendChild(el('div', { className: 'biogramm__detail-meta' },
    el('span', { className: 'biogramm__detail-sig' }, formatSignatur(b.signatur)),
    el('span', { className: 'biogramm__detail-date' }, b.date),
    b.dft ? el('span', { className: 'biogramm__detail-dft' }, b.dft.replace('m3gim-dft:', '')) : null,
  ));
  panel.appendChild(el('button', {
    className: 'biogramm__detail-cta',
    onClick: () => navigateToView('archiv', { recordId: b.id }),
  }, 'Im Archiv oeffnen →'));
  panel.appendChild(el('button', {
    className: 'biogramm__detail-close',
    onClick: () => { _selectedBeleg = null; drawDetailPanel(); },
  }, 'Schliessen'));
}

// ---------------------------------------------------------------------------
// Tooltip (minimal — shared mit Atlas-Stil, aber ohne globalen Controller)
// ---------------------------------------------------------------------------

let _tooltipEl = null;

function getTooltip() {
  if (!_tooltipEl) {
    _tooltipEl = document.createElement('div');
    _tooltipEl.className = 'biogramm__tooltip';
    document.body.appendChild(_tooltipEl);
  }
  return _tooltipEl;
}

function showTooltip(ev, text) {
  const t = getTooltip();
  t.textContent = text;
  t.style.left = (ev.clientX + 10) + 'px';
  t.style.top = (ev.clientY + 10) + 'px';
  t.style.opacity = '1';
}

function hideTooltip() {
  if (_tooltipEl) _tooltipEl.style.opacity = '0';
}

// ---------------------------------------------------------------------------
// Debug-Helper
// ---------------------------------------------------------------------------

export function biogrammData() {
  if (!_store) return null;
  return extractBiogrammData(_store);
}
