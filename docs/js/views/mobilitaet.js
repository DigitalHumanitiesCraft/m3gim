/**
 * M³GIM Mobilität View — Layer-based narrative timeline (D3.js).
 *
 * Redesign: Vertical event markers (not Bézier arrows), aggregated
 * performance dots, 3-color scheme, focus mode with dimming.
 *
 * Layers (toggleable):
 *   - mobilitaet: Swim-lane bars + vertical event markers (FF4)
 *   - auftritte:  Aggregated performance dots + guest section (FF1, FF3)
 *   - netzwerk:   Network intensity overlay (FF1)
 *   - repertoire: Composer time-span bars (FF2)
 *   - sparkline:  Document-per-year area chart
 */

import { el, clear } from '../utils/dom.js';
import { extractYear } from '../utils/date-parser.js';
import { ensureArray } from '../utils/format.js';
import { loadPartitur } from '../data/loader.js';
import { navigateToIndex, navigateToView } from '../ui/router.js';
import {
  buildFFBadges, buildPhaseChips, buildLayerChips,
  createTooltip, viewLog,
} from '../utils/viz-components.js';

const log = viewLog('Mobilität', '#8B3A3A');

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LOCATION_ORDER = [
  'Lemberg', 'Wien', 'Graz', 'Bayreuth', 'München', 'Salzburg', 'Zürich',
];

const PLACE_STYLES = {
  wohnort:         { fill: '#004A8F', opacity: 0.50, label: 'Wohnort' },
  auffuehrungsort: { fill: '#9A7B4F', opacity: 0.40, label: 'Aufführungsort' },
  lehrstaette:     { fill: '#004A8F', opacity: 0.25, label: 'Lehrstätte', dashed: true },
};

/** 3-color scheme: KUG-Blau, Warm-Gold, Signal-Rot (only for Flucht). */
const COLOR_BLAU   = '#004A8F';
const COLOR_GOLD   = '#9A7B4F';
const COLOR_ROT    = '#8B3A3A';
const COLOR_GRAU   = '#5C5651';
const COLOR_SUBTLE = '#C4B49A';

const MOBILITY_LABELS = {
  erzwungen:   'Erzwungene Mobilität',
  geografisch: 'Geografische Mobilität',
  lebensstil:  'Lebensstil-Mobilität',
  national:    'Nationale Mobilität',
  bildung:     'Bildungsmobilität',
};

/** Short labels for event markers. */
const MOBILITY_SHORT = {
  erzwungen:   'Flucht',
  geografisch: 'Karriere',
  lebensstil:  'Privat',
  national:    'Staatsb.',
  bildung:     'Lehre',
};

/** Roles that indicate a performance at a location. */
const PERFORMANCE_ROLES = new Set([
  'auffuehrungsort', 'gastspiel', 'aufführung', 'spielzeit',
]);

const BREAK_YEAR = 1975;
const BREAK_RATIO = 0.74;

const GUEST_ROW_H = 20;
const GUEST_SECTION_GAP = 24;

const GUEST_DISPLAY_MAP = {
  'Italien': 'Italien (versch.)',
  'Palais Pallavicini': 'Wien \u2014 Palais Pallavicini',
};

const PHASE_ABBR = {
  'Kindheit & Jugend': 'Kindheit',
  'Flucht & Neuanfang': 'Flucht',
  'Erste Engagements': '1.\u00a0Engagem.',
  'Sp\u00e4tphase & Ruhestand': 'Sp\u00e4tphase',
};

/** Layer configuration. Mobilität + Auftritte ON by default. */
const LAYERS = [
  { id: 'mobilitaet', label: 'Mobilität',  active: true },
  { id: 'auftritte',  label: 'Auftritte',  active: true },
  { id: 'netzwerk',   label: 'Netzwerk',   active: false },
  { id: 'repertoire', label: 'Repertoire', active: false },
  { id: 'sparkline',  label: 'Dok./Jahr',  active: false },
];

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let rendered = false;
let tooltip = null;
let popupEl = null;
let focusedEvent = null; // index into mobilitaet[] or null

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function renderMobilitaet(store, container) {
  if (rendered) return;
  rendered = true;
  clear(container);
  container.appendChild(el('div', { className: 'matrix-loading' }, 'Lade Mobilit\u00e4tsansicht\u2026'));
  buildView(store, container).catch(err => {
    console.error('Mobilitaet view error:', err);
    container.appendChild(el('p', {
      style: 'padding: 40px; text-align: center; color: var(--color-text-tertiary);',
    }, 'Fehler beim Laden der Mobilitätsansicht.'));
  });
}

/* ------------------------------------------------------------------ */
/*  Guest-performance extraction from store                            */
/* ------------------------------------------------------------------ */

function extractGuestPerformances(store) {
  const mainCities = new Set(LOCATION_ORDER);
  const result = new Map();
  for (const [name, entry] of store.locations) {
    let isPerf = false;
    for (const r of entry.roles) { if (PERFORMANCE_ROLES.has(r)) { isPerf = true; break; } }
    if (!isPerf) continue;
    if (mainCities.has(name)) continue;
    if (LOCATION_ORDER.some(c => name.startsWith(c + ','))) continue;
    const displayName = GUEST_DISPLAY_MAP[name] || name;
    const years = result.get(displayName) || new Map();
    for (const recId of entry.records) {
      const rec = store.records.get(recId);
      if (!rec) continue;
      let year = extractYear(rec['rico:date']);
      if (!year) {
        for (const e of ensureArray(rec['m3gim:eventDate'])) { year = extractYear(e); if (year) break; }
      }
      if (year && year >= 1935 && year <= 2009) {
        if (!years.has(year)) years.set(year, { count: 0, records: [] });
        const b = years.get(year); b.count++; b.records.push(recId);
      }
    }
    if (years.size > 0) result.set(displayName, years);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Tooltip + Popup                                                    */
/* ------------------------------------------------------------------ */

function showPopup(event, records, store) {
  closePopup();
  const container = tooltip?.el.parentElement;
  if (!container) return;
  popupEl = el('div', { className: 'mob__popup' });
  for (const recId of records) {
    const rec = store.records.get(recId);
    const sig = rec?.['rico:identifier'] || recId;
    const title = rec?.['rico:title'] || '';
    const label = title ? `${sig} \u2014 ${title.slice(0, 60)}` : sig;
    popupEl.appendChild(el('button', {
      className: 'popup-item',
      onClick: () => { closePopup(); window.location.hash = '#archiv/' + encodeURIComponent(recId); },
    }, label));
  }
  const rect = container.getBoundingClientRect();
  popupEl.style.cssText = `position:absolute;left:${event.clientX - rect.left + 8}px;top:${event.clientY - rect.top + 8}px`;
  container.appendChild(popupEl);
  setTimeout(() => document.addEventListener('click', closePopupOutside, { once: true }), 0);
}
function closePopup() { if (popupEl) { popupEl.remove(); popupEl = null; } }
function closePopupOutside(e) { if (popupEl && !popupEl.contains(e.target)) closePopup(); }

/* ------------------------------------------------------------------ */
/*  Layer + Focus visibility                                           */
/* ------------------------------------------------------------------ */

function applyLayerVisibility(svg, activeLayers) {
  if (!svg) return;
  svg.querySelectorAll('[data-layer]').forEach(g => {
    g.classList.toggle('mob__layer--hidden', !activeLayers.has(g.dataset.layer));
  });
}

function applyFocus(svg, index, mobilitaet) {
  if (!svg) return;
  focusedEvent = index;
  // Remove old focus
  svg.querySelectorAll('.mob--event-dimmed').forEach(el => el.classList.remove('mob--event-dimmed'));
  svg.querySelectorAll('.mob--event-focused').forEach(el => el.classList.remove('mob--event-focused'));

  if (index === null) return;

  // Dim all event markers, highlight the focused one
  svg.querySelectorAll('.mob__event-marker').forEach((el, i) => {
    if (i === index) el.classList.add('mob--event-focused');
    else el.classList.add('mob--event-dimmed');
  });
}

/* ------------------------------------------------------------------ */
/*  View builder                                                       */
/* ------------------------------------------------------------------ */

async function buildView(store, container) {
  const data = await loadPartitur();
  clear(container);
  if (!data) {
    container.appendChild(el('p', {
      style: 'padding: 40px; text-align: center; color: var(--color-text-tertiary);',
    }, 'Fehler beim Laden der Mobilitätsdaten.'));
    return;
  }

  const auftritte = data.auftritte || [];

  log.group();
  log.log(`${data.orte.length} Orte, ${data.mobilitaet.length} Mobilitätsereignisse, ${auftritte.length} Auftritte`);
  log.log(`${(data.lebensphasen || []).length} Lebensphasen, ${(data.repertoire || []).length} Repertoire`);
  const cats = {};
  for (const a of auftritte) cats[a.kategorie] = (cats[a.kategorie] || 0) + 1;
  log.log('Auftritte:', cats);
  log.end();

  const guestData = extractGuestPerformances(store);
  const wrapper = el('div', { className: 'mob' });

  // ---- Toolbar ----
  const toolbarRow = el('div', { className: 'viz-toolbar__row' });
  const phaseSlot = el('div');
  const layerSlot = el('div');
  toolbarRow.appendChild(phaseSlot);
  toolbarRow.appendChild(el('span', { className: 'viz-toolbar__sep' }));
  toolbarRow.appendChild(layerSlot);
  toolbarRow.appendChild(buildFFBadges('FF1', 'FF2', 'FF3', 'FF4'));
  wrapper.appendChild(el('div', { className: 'viz-toolbar' }, toolbarRow));

  if (data.lebensphasen?.length > 0) {
    const { element } = buildPhaseChips(data.lebensphasen, (phase) => {
      applyMobPhaseFilter(wrapper, phase);
    }, { labelMode: 'short' });
    phaseSlot.appendChild(element);
  }

  let activeLayers = new Set(LAYERS.filter(l => l.active).map(l => l.id));
  const { element: layerEl } = buildLayerChips(LAYERS, (_id, _on, active) => {
    activeLayers = active;
    applyLayerVisibility(wrapper.querySelector('svg'), activeLayers);
  });
  layerSlot.appendChild(layerEl);

  const svgBox = el('div', { className: 'mob__container' });
  tooltip = createTooltip(svgBox);
  wrapper.appendChild(svgBox);
  wrapper.appendChild(buildLegend());

  const totalRecs = store.allRecords?.length || 0;
  wrapper.appendChild(el('div', { className: 'data-coverage' },
    `${data.orte.length} Orte, ${data.mobilitaet.length} Mobilitätsereignisse, ${auftritte.length} Auftritte \u00b7 ${store.locations?.size || 0} Orts-Verknüpfungen aus ${totalRecs} Datensätzen`,
  ));

  container.appendChild(wrapper);
  renderTimeline(data, auftritte, guestData, store, svgBox, activeLayers);
}

/* ------------------------------------------------------------------ */
/*  D3 Timeline                                                        */
/* ------------------------------------------------------------------ */

function renderTimeline(data, auftritte, guestData, store, svgBox, activeLayers) {
  const repCount = (data.repertoire?.length) || 0;
  const repSpace = repCount > 0 ? repCount * 7 + 16 : 0;
  const margin = { top: 80 + repSpace, right: 40, bottom: 44, left: 110 };
  const laneH = 44; // wider lanes for dots above bars
  const lanePad = 0.25;
  const chartW = Math.max(svgBox.clientWidth || 900, 800);

  const swimH = LOCATION_ORDER.length * Math.round(laneH / (1 - lanePad));

  const guestCities = sortedGuestCities(guestData);
  const guestH = guestCities.length > 0 ? GUEST_SECTION_GAP + guestCities.length * GUEST_ROW_H + 8 : 0;
  const sparkH = (data.dokumente?.length > 0) ? 40 : 0;
  const sparkGap = sparkH > 0 ? 12 : 0;
  const chartH = margin.top + swimH + guestH + sparkGap + sparkH + margin.bottom;

  const svg = d3.select(svgBox)
    .append('svg')
    .attr('viewBox', `0 0 ${chartW} ${chartH}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const usable = chartW - margin.left - margin.right;
  const x = d3.scaleLinear()
    .domain([1919, BREAK_YEAR, 2009])
    .range([margin.left, margin.left + usable * BREAK_RATIO, chartW - margin.right]);

  const y = d3.scaleBand()
    .domain(LOCATION_ORDER)
    .range([margin.top, margin.top + swimH])
    .padding(lanePad);

  const axisY = margin.top + swimH + guestH + sparkGap + sparkH;

  // Always visible
  drawPhaseBands(svg, data.lebensphasen, x, margin, axisY);
  drawScaleBreak(svg, x, margin, axisY);
  drawPhaseLabels(svg, data.lebensphasen, x, margin);

  // Mobilität layer
  drawGridLines(svg, LOCATION_ORDER, y, margin, chartW);
  drawBars(svg, data.orte, x, y);
  drawEventMarkers(svg, data.mobilitaet, x, y, margin, axisY, data.repertoire || []);

  // Auftritte layer
  drawAuftritte(svg, auftritte, x, y, store);
  if (guestCities.length > 0) {
    drawGuestDots(svg, guestCities, guestData, x, margin.top + swimH + GUEST_SECTION_GAP, margin, chartW, store);
  }

  // Repertoire layer
  if (data.repertoire?.length > 0) drawRepertoireOverlay(svg, data.repertoire, x, margin);

  // Sparkline layer
  if (sparkH > 0) drawDocSparkline(svg, data.dokumente, x, margin.top + swimH + guestH + sparkGap, sparkH, margin, chartW);

  // Network layer
  if (data.netzwerk?.length > 0) drawNetworkOverlay(svg, data.netzwerk, x, margin);

  // Axes (always visible)
  drawAxes(svg, x, y, margin, axisY);

  // Apply initial layer visibility
  applyLayerVisibility(svg.node(), activeLayers);

  // Doppelklick auf SVG = Reset-Fokus
  svg.on('dblclick', () => { applyFocus(svg.node(), null, data.mobilitaet); });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function sortedGuestCities(guestData) {
  const entries = [];
  for (const [city, years] of guestData) entries.push({ city, minYear: Math.min(...years.keys()) });
  entries.sort((a, b) => a.minYear - b.minYear);
  return entries.map(e => e.city);
}

/* ------------------------------------------------------------------ */
/*  Always-visible: phase bands, scale break, phase labels              */
/* ------------------------------------------------------------------ */

function drawPhaseBands(svg, phases, x, margin, bottomY) {
  const g = svg.append('g').attr('class', 'mob__phases');
  phases.forEach((p, i) => {
    g.append('rect')
      .attr('x', x(p.von)).attr('y', margin.top)
      .attr('width', x(p.bis) - x(p.von)).attr('height', bottomY - margin.top)
      .attr('fill', i % 2 === 0 ? '#F5F0E8' : 'transparent').attr('opacity', 0.5);
  });
}

function drawScaleBreak(svg, x, margin, bottomY) {
  const bx = x(BREAK_YEAR);
  const g = svg.append('g').attr('class', 'mob__break');
  g.append('line').attr('x1', bx).attr('x2', bx)
    .attr('y1', margin.top).attr('y2', bottomY)
    .attr('stroke', '#E0DCD6').attr('stroke-width', 1).attr('stroke-dasharray', '4,4');
  const amp = 5, by = bottomY - 4;
  g.append('path').attr('d', `M${bx - amp},${by} l${amp},-5 l${amp * 2},10 l${amp},-5`)
    .attr('fill', 'none').attr('stroke', '#8A857E').attr('stroke-width', 1.5);
  g.append('text').attr('x', bx).attr('y', bottomY + 28).attr('text-anchor', 'middle')
    .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', '8px').attr('fill', '#8A857E')
    .text('// komprimiert');
}

function drawPhaseLabels(svg, phases, x, margin) {
  const g = svg.append('g').attr('class', 'mob__phase-labels');
  const items = phases.map(p => {
    const px1 = x(p.von), px2 = x(p.bis);
    return { ...p, px1, px2, pxW: px2 - px1 };
  });
  const ROW_LO = margin.top - 18, ROW_HI = margin.top - 42;

  items.forEach(p => {
    const cx = (p.px1 + p.px2) / 2;
    const narrow = p.pxW < 65;
    const row = narrow ? ROW_HI : ROW_LO;
    let label = p.label;
    if (p.pxW < 30) label = PHASE_ABBR[p.label] || p.label.split(' ')[0];
    else if (p.pxW < 70) label = PHASE_ABBR[p.label] || p.label;
    const fontSize = p.pxW < 40 ? '9px' : '11px';
    if (narrow) {
      g.append('line').attr('x1', cx).attr('x2', cx)
        .attr('y1', row + 6).attr('y2', margin.top - 2)
        .attr('stroke', COLOR_SUBTLE).attr('stroke-width', 0.75).attr('stroke-dasharray', '2,2');
    }
    g.append('text').attr('x', cx).attr('y', row).attr('text-anchor', 'middle')
      .attr('font-family', "'Source Serif 4', Georgia, serif")
      .attr('font-size', fontSize).attr('font-style', 'italic').attr('fill', COLOR_GRAU).text(label);
    if (p.pxW >= 35) {
      g.append('text').attr('x', cx).attr('y', row + 13).attr('text-anchor', 'middle')
        .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', '8px').attr('fill', '#8A857E')
        .text(`${p.von}\u2013${p.bis}`);
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Mobilität layer: grid, bars, event markers                         */
/* ------------------------------------------------------------------ */

function drawGridLines(svg, locations, y, margin, chartW) {
  const g = svg.append('g').attr('class', 'mob__grid').attr('data-layer', 'mobilitaet');
  locations.forEach(loc => {
    g.append('line')
      .attr('x1', margin.left).attr('x2', chartW - 40)
      .attr('y1', y(loc) + y.bandwidth()).attr('y2', y(loc) + y.bandwidth())
      .attr('stroke', '#E0DCD6').attr('stroke-dasharray', '2,4');
  });
}

function drawBars(svg, orte, x, y) {
  const g = svg.append('g').attr('class', 'mob__bars').attr('data-layer', 'mobilitaet');
  orte.forEach(ort => {
    const style = PLACE_STYLES[ort.typ];
    if (!style) return;
    const x1 = x(ort.von), x2 = x(ort.bis), bw = y.bandwidth();

    // Position bars in the middle-lower zone of the lane (leave room for dots above)
    const barH = bw * 0.55;
    const barY = y(ort.ort) + bw * 0.30;

    const rect = g.append('rect')
      .attr('x', x1).attr('y', barY)
      .attr('width', Math.max(x2 - x1, 4)).attr('height', barH)
      .attr('rx', 3)
      .attr('fill', style.dashed ? 'none' : style.fill)
      .attr('opacity', style.opacity)
      .attr('stroke', style.fill)
      .attr('stroke-width', style.dashed ? 1.5 : 0.5)
      .attr('stroke-opacity', style.dashed ? 0.6 : 0.3)
      .attr('stroke-dasharray', style.dashed ? '5,3' : 'none')
      .attr('data-von', ort.von).attr('data-bis', ort.bis);

    rect.style('cursor', 'pointer')
      .on('mouseenter', (event) => {
        tooltip.show(event, `<strong>${ort.ort}</strong> (${style.label})<br>${ort.von}\u2013${ort.bis}`);
        d3.select(event.target).attr('stroke-width', 2).attr('stroke-opacity', 0.8);
      })
      .on('mousemove', (event) => tooltip.move(event))
      .on('mouseleave', (event) => {
        tooltip.hide();
        d3.select(event.target).attr('stroke-width', style.dashed ? 1.5 : 0.5).attr('stroke-opacity', style.dashed ? 0.6 : 0.3);
      })
      .on('click', (event) => {
        tooltip.hide();
        if (event.shiftKey) navigateToView('matrix');
        else navigateToIndex('orte', ort.ort);
      });
  });
}

/* ------------------------------------------------------------------ */
/*  Event markers (replaces Bézier arrows)                             */
/* ------------------------------------------------------------------ */

function drawEventMarkers(svg, events, x, y, margin, axisY, repertoire) {
  const g = svg.append('g').attr('class', 'mob__events').attr('data-layer', 'mobilitaet');
  const bw = y.bandwidth();

  // Pre-compute label positions with stagger to avoid overlap
  const labelItems = events.map((mov, idx) => ({
    idx, mov, mx: x(mov.jahr),
  }));
  // Sort by x-position for stagger
  labelItems.sort((a, b) => a.mx - b.mx);
  // Assign stagger rows: if two labels are < 60px apart, alternate rows
  const ROW_BASE = margin.top - 6;
  const ROW_HIGH = margin.top - 20;
  let lastX = -Infinity;
  let lastRow = 0;
  for (const item of labelItems) {
    if (item.mx - lastX < 55) {
      // Too close — use alternate row
      lastRow = lastRow === 0 ? 1 : 0;
    } else {
      lastRow = 0;
    }
    item.labelY = lastRow === 0 ? ROW_BASE : ROW_HIGH;
    lastX = item.mx;
  }

  // Restore original order for rendering
  labelItems.sort((a, b) => a.idx - b.idx);

  labelItems.forEach(({ idx, mov, mx, labelY }) => {
    const isForced = mov.form === 'erzwungen';
    const lineColor = isForced ? COLOR_ROT : COLOR_SUBTLE;
    const lineW = isForced ? 1.5 : 0.75;
    const labelColor = isForced ? COLOR_ROT : COLOR_GRAU;

    const markerG = g.append('g')
      .attr('class', 'mob__event-marker')
      .attr('data-year', mov.jahr);

    // Vertical line: only between start and target lanes (not full height)
    const fromY = y(mov.von);
    const toY = y(mov.nach);
    if (fromY !== undefined && toY !== undefined) {
      const startY = Math.min(fromY, toY) + bw * 0.3;
      const endY = Math.max(fromY, toY) + bw * 0.85;

      markerG.append('line')
        .attr('x1', mx).attr('x2', mx)
        .attr('y1', startY).attr('y2', endY)
        .attr('stroke', lineColor)
        .attr('stroke-width', lineW)
        .attr('stroke-dasharray', isForced ? 'none' : '2,4')
        .attr('stroke-opacity', isForced ? 0.5 : 0.25);

      // Direction chevron at midpoint
      const midY = (startY + endY) / 2;
      const dir = toY > fromY ? 1 : -1;
      markerG.append('path')
        .attr('d', `M${mx - 3},${midY - dir * 3} L${mx},${midY + dir * 3} L${mx + 3},${midY - dir * 3}`)
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', isForced ? 1.5 : 1)
        .attr('stroke-opacity', isForced ? 0.6 : 0.35);

      // Small dots at start and end of line
      [startY, endY].forEach(dotY => {
        markerG.append('circle')
          .attr('cx', mx).attr('cy', dotY).attr('r', isForced ? 2.5 : 1.5)
          .attr('fill', lineColor).attr('fill-opacity', isForced ? 0.5 : 0.3);
      });
    }

    // Staggered label: short text
    const shortLabel = MOBILITY_SHORT[mov.form] || mov.form;
    const labelText = mov.beschreibung.length <= 16 ? `${mov.jahr} ${mov.beschreibung}` : `${mov.jahr} ${shortLabel}`;

    // Connector line from label to marker position (when staggered high)
    if (labelY === ROW_HIGH && fromY !== undefined) {
      markerG.append('line')
        .attr('x1', mx).attr('x2', mx)
        .attr('y1', labelY + 4).attr('y2', Math.min(fromY, toY !== undefined ? toY : fromY) + bw * 0.3)
        .attr('stroke', lineColor).attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '1,3').attr('stroke-opacity', 0.2);
    }

    markerG.append('text')
      .attr('x', mx).attr('y', labelY)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-size', isForced ? '8px' : '7px')
      .attr('font-weight', isForced ? '700' : '500')
      .attr('fill', labelColor)
      .attr('opacity', isForced ? 1 : 0.7)
      .text(labelText);

    // Invisible hit area
    const hitTop = Math.min(labelY - 10, margin.top - 20);
    const hitBot = axisY;
    markerG.append('rect')
      .attr('x', mx - 14).attr('y', hitTop)
      .attr('width', 28).attr('height', hitBot - hitTop)
      .attr('fill', 'transparent').attr('cursor', 'pointer');

    // Tooltip with full context
    const activeRep = repertoire.filter(r => mov.jahr >= r.von && mov.jahr <= r.bis);
    const repLine = activeRep.length > 0
      ? `<br><span style="font-size:0.65rem;color:${COLOR_GOLD}">Repertoire: ${activeRep.map(r => r.komponist).join(', ')}</span>` : '';
    const ctxLine = mov.kontext
      ? `<br><span style="font-size:0.65rem;color:#8A857E;line-height:1.4;display:block;margin-top:3px">${mov.kontext}</span>` : '';
    const tipHtml = `<strong>${mov.von} \u2192 ${mov.nach}</strong> (${mov.jahr})<br>${MOBILITY_LABELS[mov.form] || mov.form}<br><em>${mov.beschreibung}</em>${repLine}${ctxLine}`;

    markerG
      .on('mouseenter', (event) => {
        tooltip.show(event, tipHtml);
        markerG.selectAll('line').attr('stroke-opacity', isForced ? 0.8 : 0.5);
        markerG.select('text').attr('font-weight', '700').attr('opacity', 1);
      })
      .on('mousemove', (event) => tooltip.show(event, tipHtml))
      .on('mouseleave', () => {
        tooltip.hide();
        markerG.selectAll('line').attr('stroke-opacity', isForced ? 0.5 : 0.25);
        markerG.select('text').attr('font-weight', isForced ? '700' : '500').attr('opacity', isForced ? 1 : 0.7);
      })
      .on('click', () => {
        tooltip.hide();
        applyFocus(svg.node(), focusedEvent === idx ? null : idx, events);
      });
  });
}

/* ------------------------------------------------------------------ */
/*  Auftritte layer: aggregated dots + guest section                   */
/* ------------------------------------------------------------------ */

function drawAuftritte(svg, auftritte, x, y, store) {
  const g = svg.append('g').attr('class', 'mob__auftritte').attr('data-layer', 'auftritte');
  if (!auftritte?.length) return;

  const mainCities = new Set(LOCATION_ORDER);

  // Aggregate: group by ort + jahr
  const buckets = new Map();
  for (const a of auftritte) {
    if (!a.ort || !mainCities.has(a.ort) || !a.jahr) continue;
    const key = `${a.ort}|${a.jahr}`;
    if (!buckets.has(key)) buckets.set(key, { ort: a.ort, jahr: a.jahr, items: [] });
    buckets.get(key).items.push(a);
  }

  for (const [, bucket] of buckets) {
    const cx = x(bucket.jahr);
    const bw = y.bandwidth();
    const baseY = y(bucket.ort);
    if (baseY === undefined) continue;

    // Position dots in the upper zone of lane (above the bar which starts at 30%)
    const cy = baseY + bw * 0.14;

    const count = bucket.items.length;
    const totalDocs = bucket.items.reduce((sum, a) => sum + (a.dokumente?.length || 0), 0);
    const r = Math.min(3 + totalDocs * 0.6, 7);

    // Color by ort type: Blau for engagement cities, Gold for performance cities
    const isEngagementCity = bucket.ort === 'Wien' || bucket.ort === 'Graz' || bucket.ort === 'Lemberg';
    const dotColor = isEngagementCity ? COLOR_BLAU : COLOR_GOLD;

    const dot = g.append('circle')
      .attr('cx', cx).attr('cy', cy).attr('r', r)
      .attr('fill', dotColor).attr('fill-opacity', 0.45)
      .attr('stroke', dotColor).attr('stroke-width', 1).attr('stroke-opacity', 0.3)
      .attr('data-year', bucket.jahr)
      .style('cursor', 'pointer');

    // Tooltip
    const werkList = bucket.items
      .filter(a => a.werk).map(a => a.werk + (a.komponist ? ` (${a.komponist})` : '')).join(', ');
    const docLabel = totalDocs === 1 ? '1 Dokument' : `${totalDocs} Dokumente`;
    const tipLines = [
      `<strong>${bucket.ort}</strong> (${bucket.jahr})`,
      count > 1 ? `${count} Auftritte` : (werkList || bucket.items[0]?.titel || '1 Auftritt'),
      werkList && count > 1 ? `<span style="font-size:0.65rem">${werkList}</span>` : '',
      docLabel,
    ].filter(Boolean);

    dot
      .on('mouseenter', (event) => {
        tooltip.show(event, tipLines.join('<br>'));
        dot.attr('fill-opacity', 0.75).attr('stroke-opacity', 0.7);
      })
      .on('mousemove', (event) => tooltip.move(event))
      .on('mouseleave', () => {
        tooltip.hide();
        dot.attr('fill-opacity', 0.45).attr('stroke-opacity', 0.3);
      });

    // Click → archive
    const allSigs = bucket.items.flatMap(a => a.dokumente || []);
    if (allSigs.length > 0) {
      dot.on('click', (event) => {
        tooltip.hide();
        const ids = [];
        for (const [id, rec] of store.records) {
          if (allSigs.includes(rec['rico:identifier'])) ids.push(id);
        }
        if (ids.length === 1) window.location.hash = '#archiv/' + encodeURIComponent(ids[0]);
        else if (ids.length > 1) showPopup(event, ids, store);
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Guest dots (auftritte layer)                                       */
/* ------------------------------------------------------------------ */

function drawGuestDots(svg, cities, guestData, x, top, margin, chartW, store) {
  const g = svg.append('g').attr('class', 'mob__guests').attr('data-layer', 'auftritte');
  const sepY = top - GUEST_SECTION_GAP / 2;

  g.append('line').attr('x1', margin.left).attr('x2', chartW - margin.right)
    .attr('y1', sepY).attr('y2', sepY).attr('stroke', '#E0DCD6').attr('stroke-width', 1);
  g.append('text').attr('x', margin.left).attr('y', sepY - 5)
    .attr('font-family', "'Source Serif 4', Georgia, serif")
    .attr('font-size', '10px').attr('font-style', 'italic').attr('fill', '#8A857E')
    .text('Internationale Auftritte');

  cities.forEach((city, i) => {
    const cy = top + i * GUEST_ROW_H + GUEST_ROW_H / 2;
    const years = guestData.get(city);

    g.append('text').attr('x', margin.left - 6).attr('y', cy + 4).attr('text-anchor', 'end')
      .attr('font-family', "'Inter', sans-serif").attr('font-size', '10px').attr('fill', COLOR_GRAU).text(city);

    for (const [year, bucket] of years) {
      const count = typeof bucket === 'number' ? bucket : bucket.count;
      const records = (typeof bucket === 'object' && bucket.records) ? bucket.records : [];
      const dotCx = x(year);
      const r = Math.min(4 + count * 1.5, 10);

      const dot = g.append('circle')
        .attr('cx', dotCx).attr('cy', cy).attr('r', r)
        .attr('fill', COLOR_GOLD).attr('fill-opacity', 0.45)
        .attr('stroke', COLOR_GOLD).attr('stroke-width', 1.2).attr('stroke-opacity', 0.3)
        .attr('data-year', year).style('cursor', records.length ? 'pointer' : 'default');

      const docLabel = count === 1 ? '1 Dokument' : `${count} Dokumente`;
      dot
        .on('mouseenter', (event) => {
          tooltip.show(event, `<strong>${city}</strong> (${year})<br>${docLabel}`);
          d3.select(event.target).attr('fill-opacity', 0.8).attr('stroke-opacity', 0.7);
        })
        .on('mousemove', (event) => tooltip.move(event))
        .on('mouseleave', (event) => {
          tooltip.hide();
          d3.select(event.target).attr('fill-opacity', 0.45).attr('stroke-opacity', 0.3);
        });

      if (records.length === 1) {
        dot.on('click', () => { tooltip.hide(); window.location.hash = '#archiv/' + encodeURIComponent(records[0]); });
      } else if (records.length > 1) {
        dot.on('click', (event) => { tooltip.hide(); showPopup(event, records, store); });
      }
    }

    if (i < cities.length - 1) {
      g.append('line').attr('x1', margin.left).attr('x2', chartW - margin.right)
        .attr('y1', cy + GUEST_ROW_H / 2).attr('y2', cy + GUEST_ROW_H / 2)
        .attr('stroke', '#EDE9E3').attr('stroke-dasharray', '1,4');
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Repertoire layer                                                   */
/* ------------------------------------------------------------------ */

function drawRepertoireOverlay(svg, repertoire, x, margin) {
  const g = svg.append('g').attr('class', 'mob__repertoire').attr('data-layer', 'repertoire');
  const baseY = margin.top - 6, barH = 5, gap = 7;
  const sorted = [...repertoire].sort((a, b) => a.von - b.von);

  sorted.forEach((rep, i) => {
    const x1 = x(Math.max(rep.von, 1919)), x2 = x(Math.min(rep.bis, 2009));
    const yPos = baseY - (sorted.length - i) * gap;

    g.append('rect').attr('x', x1).attr('y', yPos)
      .attr('width', Math.max(x2 - x1, 4)).attr('height', barH).attr('rx', 2)
      .attr('fill', rep.farbe).attr('opacity', 0.7);

    const midX = (x1 + x2) / 2;
    g.append('path').attr('d', `M${midX},${yPos - 2} l3,4 l-3,4 l-3,-4 z`)
      .attr('fill', rep.farbe).attr('opacity', 0.9).style('cursor', 'pointer')
      .on('click', () => navigateToView('zeitfluss', { komponist: rep.komponist }));

    g.append('text').attr('x', x2 + 4).attr('y', yPos + barH - 1)
      .attr('fill', rep.farbe).attr('font-size', '8px')
      .attr('font-family', 'var(--font-ui)').attr('font-weight', '600')
      .style('cursor', 'pointer')
      .text(`${rep.komponist} (${rep.dokumente})`)
      .on('click', () => navigateToView('zeitfluss', { komponist: rep.komponist }));
  });

  g.append('text').attr('x', margin.left - 4).attr('y', baseY - sorted.length * gap - 2)
    .attr('text-anchor', 'end').attr('font-size', '8px').attr('font-family', 'var(--font-ui)')
    .attr('fill', 'var(--color-text-tertiary)').attr('font-style', 'italic').text('Repertoire');
}

/* ------------------------------------------------------------------ */
/*  Sparkline layer                                                    */
/* ------------------------------------------------------------------ */

function drawDocSparkline(svg, dokumente, x, top, height, margin, chartW) {
  const g = svg.append('g').attr('class', 'mob__sparkline').attr('data-layer', 'sparkline');
  const filtered = dokumente.filter(d => d.jahr >= 1919 && d.jahr <= 2009 && d.anzahl > 0);
  if (!filtered.length) return;

  g.append('line').attr('x1', margin.left).attr('x2', chartW - margin.right)
    .attr('y1', top - 6).attr('y2', top - 6).attr('stroke', '#E0DCD6').attr('stroke-width', 1);
  g.append('text').attr('x', margin.left - 6).attr('y', top + height / 2 + 3).attr('text-anchor', 'end')
    .attr('font-family', "'Inter', sans-serif").attr('font-size', '9px')
    .attr('font-style', 'italic').attr('fill', '#8A857E').text('Dok./Jahr');

  const maxVal = d3.max(filtered, d => d.anzahl) || 1;
  const yScale = d3.scaleLinear().domain([0, maxVal]).range([top + height, top + 2]);
  const area = d3.area().x(d => x(d.jahr)).y0(top + height).y1(d => yScale(d.anzahl)).curve(d3.curveMonotoneX);

  g.append('path').datum(filtered).attr('d', area)
    .attr('fill', 'rgba(0, 74, 143, 0.08)').attr('stroke', 'rgba(0, 74, 143, 0.25)').attr('stroke-width', 1);

  const peak = filtered.reduce((a, b) => b.anzahl > a.anzahl ? b : a);
  const peakLabel = peak.jahr >= 1995 ? `${peak.anzahl} (Nachlass)` : `${peak.anzahl}`;
  g.append('text').attr('x', x(peak.jahr)).attr('y', yScale(peak.anzahl) - 3).attr('text-anchor', 'middle')
    .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', '7px')
    .attr('fill', COLOR_BLAU).attr('font-weight', '600').text(peakLabel);
}

/* ------------------------------------------------------------------ */
/*  Network layer                                                      */
/* ------------------------------------------------------------------ */

function drawNetworkOverlay(svg, netzwerk, x, margin) {
  const g = svg.append('g').attr('class', 'mob__network-overlay').attr('data-layer', 'netzwerk');
  const maxI = d3.max(netzwerk, d => d.intensitaet) || 1;
  const bandH = 10, baseY = margin.top;

  netzwerk.forEach(d => {
    const [vonStr, bisStr] = d.periode.split('-');
    const x1 = x(+vonStr), x2 = x(+bisStr);
    const opac = (d.intensitaet / maxI) * 0.35;
    g.append('rect').attr('x', x1).attr('y', baseY - bandH)
      .attr('width', Math.max(x2 - x1, 2)).attr('height', bandH)
      .attr('fill', COLOR_BLAU).attr('opacity', opac).attr('rx', 2);
    if (d.intensitaet >= 10) {
      g.append('text').attr('x', (x1 + x2) / 2).attr('y', baseY - bandH / 2 + 3).attr('text-anchor', 'middle')
        .attr('font-family', 'var(--font-mono)').attr('font-size', '6px')
        .attr('fill', COLOR_BLAU).attr('opacity', 0.7).text(d.intensitaet);
    }
  });

  g.append('text').attr('x', margin.left - 4).attr('y', baseY - bandH / 2 + 2).attr('text-anchor', 'end')
    .attr('font-size', '7px').attr('font-family', 'var(--font-ui)')
    .attr('fill', 'var(--color-text-tertiary)').attr('font-style', 'italic').text('Netzwerk');
}

/* ------------------------------------------------------------------ */
/*  Axes                                                               */
/* ------------------------------------------------------------------ */

function drawAxes(svg, x, y, margin, axisY) {
  svg.append('g').attr('class', 'mob__axis-x')
    .attr('transform', `translate(0,${axisY})`)
    .call(d3.axisBottom(x).tickValues([1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2009]).tickFormat(d3.format('d')))
    .selectAll('text').style('font-family', "'JetBrains Mono', monospace").style('font-size', '10px').style('fill', COLOR_GRAU);

  svg.append('g').attr('class', 'mob__axis-y')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll('text').style('font-family', "'Inter', sans-serif").style('font-size', '12px')
    .style('font-weight', '500').style('fill', '#2C2825');
}

/* ------------------------------------------------------------------ */
/*  Phase Filter                                                       */
/* ------------------------------------------------------------------ */

function applyMobPhaseFilter(wrapper, phase) {
  const svg = wrapper.querySelector('svg');
  if (!svg) return;
  svg.querySelectorAll('.mob--phase-dimmed').forEach(el => el.classList.remove('mob--phase-dimmed'));
  if (!phase) return;
  const von = phase.von, bis = phase.bis;
  svg.querySelectorAll('[data-von][data-bis]').forEach(el => {
    if (+el.getAttribute('data-bis') < von || +el.getAttribute('data-von') > bis) el.classList.add('mob--phase-dimmed');
  });
  svg.querySelectorAll('[data-year]').forEach(el => {
    const yr = +el.getAttribute('data-year');
    if (yr < von || yr > bis) el.classList.add('mob--phase-dimmed');
  });
}

/* ------------------------------------------------------------------ */
/*  Legend                                                              */
/* ------------------------------------------------------------------ */

function buildLegend() {
  const items = [
    { color: COLOR_BLAU, opacity: 0.50, label: 'Wohnort' },
    { color: COLOR_GOLD, opacity: 0.30, label: 'Aufführungsort' },
    { color: COLOR_BLAU, opacity: 0.25, label: 'Lehrstätte', dashed: true },
    { spacer: true },
    { color: COLOR_ROT, opacity: 0.7, label: 'Flucht (erzwungen)', marker: true },
    { color: COLOR_SUBTLE, opacity: 0.5, label: 'Mobilitätsereignis', marker: true, dashed: true },
    { spacer: true },
    { color: COLOR_BLAU, opacity: 0.45, label: 'Auftritt (Engagement)', round: true },
    { color: COLOR_GOLD, opacity: 0.45, label: 'Auftritt (Gastspiel)', round: true },
  ];

  const children = items.map(it => {
    if (it.spacer) return el('span', { className: 'mob__legend-spacer' }, '\u00b7');
    let cls = 'mob__legend-dot';
    if (it.dashed) cls += ' mob__legend-dot--dashed';
    if (it.round) cls += ' mob__legend-dot--round';
    if (it.marker) cls += ' mob__legend-dot--marker';
    return el('span', { className: 'mob__legend-item' },
      el('span', { className: cls, style: `background:${it.color};opacity:${it.opacity}` }),
      it.label,
    );
  });

  const hint = el('span', { className: 'viz-legend__hint', style: 'font-size:0.65rem' },
    'Klick Marker: Fokus \u00b7 Doppelklick: Reset \u00b7 Klick Dot: Archiv');

  return el('div', { className: 'mob__legend' }, ...children, hint);
}
