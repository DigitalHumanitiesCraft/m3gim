/**
 * M³GIM Zeitfluss View — Repertoire Dot-Plot (D3.js).
 * X = Time, Y = Composer. Each dot = one work-document cluster.
 * Circle = Oper, Diamond = Konzert/Lied. Size = document count.
 * No interpolating lines — only dots where evidence exists.
 * Single integrated SVG. Einzelbelege collapsed into one row.
 * Horizontal zoom+pan via mouse wheel / pinch.
 * Filters: Gattung (Oper/Konzert/Alle).
 * Phase chips: smooth-zoom to Lebensphase time window.
 */

import { aggregateZeitfluss } from '../data/aggregator.js';
import { loadPartitur, getLebensphasen } from '../data/loader.js';
import { navigateToView, navigateToIndex } from '../ui/router.js';
import { onViewNavigate } from '../ui/events.js';
import { el, clear } from '../utils/dom.js';
import { buildFFBadges, buildPhaseChips, createTooltip, viewLog } from '../utils/viz-components.js';

const log = viewLog('Zeitfluss', '#6B4E8C');

let rendered = false;
let tooltip = null;  // shared tooltip controller
let currentSort = 'dichte'; // 'dichte' | 'erstbeleg'
let currentGattung = 'alle'; // 'alle' | 'oper' | 'konzert'
let cachedStore = null;
let resetZoomBtn = null;
let activeZoom = null;       // d3.zoom behavior for programmatic zoom
let activeSvg = null;        // svg selection for programmatic zoom
let activeXScale = null;     // xScale for phase→transform calculation
let activeInnerWidth = null; // innerWidth for phase→transform calculation
let activePhaseChips = [];   // chip buttons for active-state toggle
let activeHighlight = null;  // currently highlighted komponist name

/* ================================================================== */
/*  Configuration                                                      */
/* ================================================================== */

const STRANG_MIN_DOCS = 2;
const MIN_ROW_HEIGHT = 40;
const EINZELBELEG_ROW_H = 36;
const MARKER_MIN_R = 3;
const MARKER_MAX_R = 14;

/** FF3: Ort-coded stroke colors for dots — primary performance location. */
const ORT_STROKE = {
  'Graz': '#2E7D4F',
  'Wien': '#004A8F',
  'Bayreuth': '#9A7B4F',
  'Salzburg': '#6B4E8C',
  'München': '#4A6E96',
};
const DIAMOND_MIN_SIDE = 6;
const JITTER_SEED = 42;

/* ================================================================== */
/*  Lebensphasen                                                       */
/* ================================================================== */

/** Cached Lebensphasen from partitur.json (loaded once via singleton). */
let lebensphasen = [];

/* ================================================================== */
/*  Deterministic pseudo-random (for jitter)                           */
/* ================================================================== */

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ================================================================== */
/*  Public API                                                         */
/* ================================================================== */

export async function renderZeitfluss(store, container) {
  if (rendered) return;
  rendered = true;
  cachedStore = store;

  // Show loading state
  clear(container);
  container.appendChild(el('div', { className: 'matrix-loading' }, 'Lade Zeitfluss\u2026'));

  // Load Lebensphasen from shared singleton (cached after first call)
  const partitur = await loadPartitur();
  lebensphasen = partitur?.lebensphasen || [];

  const data = aggregateZeitfluss(store);
  clear(container);

  const hauptStraenge = data.straenge.filter(s => s.dokumente_datiert >= STRANG_MIN_DOCS);
  const weitereStraenge = data.straenge.filter(s => s.dokumente_datiert < STRANG_MIN_DOCS);
  const sorted = sortStraenge(hauptStraenge, currentSort);

  log.group();
  log.log(`${sorted.length} Haupt-Stränge, ${weitereStraenge.length} Einzelbelege`);
  log.log(`Abdeckung: ${data.abdeckung.datiert} datiert, ${data.abdeckung.total - data.abdeckung.datiert} undatiert von ${data.abdeckung.total}`);
  sorted.forEach(s => {
    const orte = s.werke.flatMap(w => w.orte || []);
    const ortSet = [...new Set(orte)];
    log.log(`  ${s.komponist}: ${s.dokumente_datiert} dat. Dok., ${s.werke.length} Werke, Orte: [${ortSet.join(', ')}]`);
  });
  log.end();

  // Toolbar: Gattung chips + Phase chips + Sort toggle + FF-badges
  container.appendChild(buildFilterToolbar(container));

  // SVG container (with zoom-reset overlay)
  const svgContainer = el('div', { className: 'zeitfluss-container' });
  resetZoomBtn = el('button', {
    className: 'viz-zoom-reset',
    title: 'Zoom zur\u00fccksetzen',
  }, 'Reset Zoom');
  resetZoomBtn.addEventListener('click', () => zoomToPhase(null));
  svgContainer.appendChild(resetZoomBtn);
  tooltip = createTooltip(svgContainer);
  container.appendChild(svgContainer);

  buildDotPlot(sorted, weitereStraenge, data.abdeckung, svgContainer);

  // Legend (below viz — unified placement)
  container.appendChild(el('div', { className: 'viz-legend' },
    el('span', { className: 'viz-legend__item' },
      el('span', { className: 'zeitfluss-legende__circle' }), ' Oper'),
    el('span', { className: 'viz-legend__item' },
      el('span', { className: 'zeitfluss-legende__diamond' }), ' Konzert/Lied'),
    el('span', { className: 'viz-legend__sep' }, '|'),
    el('span', { className: 'viz-legend__item zeitfluss-legende__size-hint' },
      el('span', { className: 'zeitfluss-legende__circle zeitfluss-legende__circle--sm' }),
      el('span', { className: 'zeitfluss-legende__circle zeitfluss-legende__circle--lg' }),
      ' = Dokumentdichte'),
    el('span', { className: 'viz-legend__sep' }, '|'),
    el('span', { className: 'viz-legend__item' }, 'Rand = Ort:'),
    ...['Graz', 'Wien', 'Bayreuth'].map(ort =>
      el('span', { className: 'viz-legend__item' },
        el('span', {
          className: 'zeitfluss-legende__circle',
          style: `background: ${ORT_STROKE[ort]}; width: 7px; height: 7px;`,
        }), ` ${ort}`)
    ),
    el('span', { className: 'viz-legend__sep' }, '|'),
    el('span', { className: 'viz-legend__hint' }, 'Klick: Archiv \u00b7 Shift+Klick: Kosmos \u00b7 Y-Label: Indizes \u00b7 Doppelklick: Reset'),
  ));

  // Coverage footer
  const { abdeckung: a } = data;
  const undatiertNames = data.undatiert.map(u => u.komponist).join(', ');
  const undatiertText = data.undatiert.length > 0
    ? ` \u00b7 Undatiert: ${undatiertNames}` : '';
  container.appendChild(el('div', { className: 'data-coverage' },
    `${sorted.length} Komponisten \u00b7 ` +
    `${weitereStraenge.length} Einzelbelege \u00b7 ` +
    `${a.verknuepft}/${a.total} mit Werkverkn\u00fcpfung \u00b7 ${a.datiert} datiert` +
    undatiertText,
  ));

  // Cross-view navigation is handled via event bus (events.js) with auto-replay
}

/* ================================================================== */
/*  Filter Toolbar                                                     */
/* ================================================================== */

function buildFilterToolbar(container) {
  const row = el('div', { className: 'viz-toolbar__row' });

  // --- Gattungsfilter ---
  const gattungGroup = el('div', { className: 'viz-toolbar__group' });
  gattungGroup.appendChild(el('span', { className: 'viz-toolbar__label' }, 'Gattung'));

  const gattungOptions = [
    { value: 'alle', label: 'Alle' },
    { value: 'oper', label: 'Oper' },
    { value: 'konzert', label: 'Konzert/Lied' },
  ];

  for (const opt of gattungOptions) {
    const chip = el('button', {
      className: 'phase-chip' + (currentGattung === opt.value ? ' phase-chip--active' : ''),
    }, opt.label);
    chip.addEventListener('click', () => {
      if (currentGattung === opt.value) return;
      currentGattung = opt.value;
      rendered = false;
      renderZeitfluss(cachedStore, container);
    });
    gattungGroup.appendChild(chip);
  }
  row.appendChild(gattungGroup);

  // Separator
  row.appendChild(el('div', { className: 'viz-toolbar__sep' }));

  // --- Phasenfilter (smooth zoom via buildPhaseChips) ---
  const { element: phaseEl, setActive, chips } = buildPhaseChips(lebensphasen, (phase) => {
    zoomToPhase(phase ? phase.id : null);
  }, { labelMode: 'short' });
  activePhaseChips = chips;
  row.appendChild(phaseEl);

  // Separator
  row.appendChild(el('div', { className: 'viz-toolbar__sep' }));

  // --- Sort toggle ---
  const sortBtn = el('button', {
    className: 'phase-chip',
    title: 'Sortierung umschalten',
  }, currentSort === 'dichte' ? 'Sort: Dichte' : 'Sort: Erstbeleg');
  sortBtn.addEventListener('click', () => {
    currentSort = currentSort === 'dichte' ? 'erstbeleg' : 'dichte';
    rendered = false;
    renderZeitfluss(cachedStore, container);
  });
  row.appendChild(sortBtn);

  // FF-Badges (right-aligned via margin-left:auto in .ff-badges)
  row.appendChild(buildFFBadges('FF3', 'FF4'));

  return el('div', { className: 'viz-toolbar' }, row);
}

/* ================================================================== */
/*  Programmatic Phase Zoom                                            */
/* ================================================================== */

function zoomToPhase(phaseId) {
  if (!activeSvg || !activeZoom || !activeXScale) return;

  // Update chip active states
  for (const c of activePhaseChips) {
    c.el.classList.toggle('phase-chip--active', c.id === phaseId);
  }

  if (!phaseId) {
    // Reset to identity (show everything)
    activeSvg.transition().duration(400).call(activeZoom.transform, d3.zoomIdentity);
    return;
  }

  const phase = lebensphasen.find(p => p.id === phaseId);
  if (!phase) return;

  // Calculate transform to fill innerWidth with [phase.von, phase.bis]
  const x0 = activeXScale(phase.von);
  const x1 = activeXScale(phase.bis);
  const phaseWidth = x1 - x0;
  if (phaseWidth <= 0) return;

  const k = activeInnerWidth / phaseWidth;
  const tx = -x0 * k;

  const transform = d3.zoomIdentity.translate(tx, 0).scale(k);
  activeSvg.transition().duration(400).call(activeZoom.transform, transform);
}

/* ================================================================== */
/*  Sorting                                                            */
/* ================================================================== */

function sortStraenge(straenge, mode) {
  const sorted = [...straenge];
  if (mode === 'erstbeleg') {
    sorted.sort((a, b) => a.von - b.von);
  } else {
    sorted.sort((a, b) => b.dokumente_datiert - a.dokumente_datiert);
  }
  return sorted;
}

/* ================================================================== */
/*  Gattung Filter Helper                                              */
/* ================================================================== */

function werkMatchesGattung(werk) {
  if (currentGattung === 'alle') return true;
  if (currentGattung === 'oper') return werk.istOper;
  return !werk.istOper; // 'konzert'
}

/* ================================================================== */
/*  Dot-Plot Build                                                     */
/* ================================================================== */

function buildDotPlot(hauptStraenge, weitereStraenge, abdeckung, svgContainer) {
  const margin = { top: 48, right: 20, bottom: 36, left: 120 };
  const width = Math.max(svgContainer.clientWidth || 900, 700);
  const innerWidth = width - margin.left - margin.right;

  // Global radius scale
  const allDots = [];
  for (const s of [...hauptStraenge, ...weitereStraenge]) {
    for (const w of s.werke) {
      if (w.datiert && w.erstbeleg && werkMatchesGattung(w)) allDots.push(w);
    }
  }
  const maxDocs = Math.max(...allDots.map(d => d.dokumente), 1);
  const rScale = d3.scaleSqrt()
    .domain([1, maxDocs])
    .range([MARKER_MIN_R, MARKER_MAX_R]);

  // Time scale — always full data range
  const yearMin = abdeckung.zeitspanne.von - 1;
  const yearMax = abdeckung.zeitspanne.bis + 1;
  const xScale = d3.scaleLinear().domain([yearMin, yearMax]).range([0, innerWidth]);

  // Store for phase zoom calculation
  activeXScale = xScale;
  activeInnerWidth = innerWidth;

  // Dynamic row height: fill available viewport
  const viewportH = window.innerHeight || 700;
  const overhead = 240; // header + tab-bar + legend + filters + footer + padding
  const availableH = Math.max(viewportH - overhead, 350);
  const phasenRowH = 28;
  const hasEinzelbelege = weitereStraenge.length > 0;
  const einzelReserve = hasEinzelbelege ? EINZELBELEG_ROW_H + 14 : 0;
  const rowsAvailableH = availableH - margin.top - margin.bottom - phasenRowH - einzelReserve;
  const dynamicRowH = Math.max(
    MIN_ROW_HEIGHT,
    Math.floor(rowsAvailableH / Math.max(hauptStraenge.length, 1)),
  );

  // Y layout
  let currentY = phasenRowH;

  const hauptStartY = currentY;
  const hauptRows = hauptStraenge.map((s, i) => ({
    strang: s, y: hauptStartY + i * dynamicRowH + dynamicRowH / 2,
  }));
  currentY = hauptStartY + hauptStraenge.length * dynamicRowH;

  let einzelRowY = 0;
  if (hasEinzelbelege) {
    currentY += 14;
    einzelRowY = currentY + EINZELBELEG_ROW_H / 2;
    currentY += EINZELBELEG_ROW_H;
  }

  const innerHeight = currentY;
  const height = innerHeight + margin.top + margin.bottom;

  // SVG
  const svg = d3.select(svgContainer).append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('font-family', 'Inter, sans-serif');

  // Clip path for zoom content (don't draw outside data area)
  svg.append('defs').append('clipPath')
    .attr('id', 'zeitfluss-clip')
    .append('rect')
    .attr('x', 0).attr('y', 0)
    .attr('width', innerWidth).attr('height', innerHeight);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Layer 1: Lebensphasen bands (inside clip)
  const clipG = g.append('g').attr('clip-path', 'url(#zeitfluss-clip)');
  drawPhaseBands(clipG, xScale, innerHeight, yearMax);

  // Layer 2: Row gridlines
  drawRowGrid(g, hauptRows, innerWidth);

  // Layer 3: X-Axis (will be updated on zoom)
  const xAxisG = g.append('g')
    .attr('class', 'zeitfluss-axis')
    .attr('transform', `translate(0,${innerHeight})`);

  const xAxisFn = d3.axisBottom(xScale)
    .tickFormat(d3.format('d'))
    .ticks(Math.min((yearMax - yearMin) / 2, 20));
  xAxisG.call(xAxisFn);

  // Layer 4: Y labels (fixed, not zoomed)
  drawYLabels(g, hauptRows);

  // Layer 5: Dots (Haupt) — inside clip group for zoom
  const dotsG = clipG.append('g').attr('class', 'zeitfluss-dots-layer');
  const rand = seededRandom(JITTER_SEED);
  for (const row of hauptRows) {
    drawDots(dotsG, row.strang, row.y, dynamicRowH, xScale, rScale, svgContainer, rand);
  }

  // Layer 6: Einzelbelege
  if (hasEinzelbelege) {
    g.append('line')
      .attr('class', 'zeitfluss-section-divider')
      .attr('x1', -margin.left + 8).attr('x2', innerWidth)
      .attr('y1', einzelRowY - EINZELBELEG_ROW_H / 2 - 7)
      .attr('y2', einzelRowY - EINZELBELEG_ROW_H / 2 - 7);

    g.append('text')
      .attr('class', 'zeitfluss-ylabel zeitfluss-ylabel--einzel')
      .attr('x', -8).attr('y', einzelRowY + 4)
      .attr('text-anchor', 'end')
      .text(`Einzelbelege (${weitereStraenge.length})`);

    drawEinzelbelegeDots(clipG, weitereStraenge, einzelRowY, EINZELBELEG_ROW_H, xScale, rScale, svgContainer, rand);
  }

  // --- Zoom behavior (horizontal only) ---
  setupZoom(svg, g, clipG, xScale, xAxisG, xAxisFn, innerWidth, innerHeight, yearMax);
}

/* ================================================================== */
/*  Zoom (horizontal pan+zoom, constrained to data range)              */
/* ================================================================== */

function setupZoom(svg, g, clipG, xScale, xAxisG, xAxisFn, innerWidth, innerHeight, yearMax) {
  const zoom = d3.zoom()
    .scaleExtent([1, 12])
    .translateExtent([[0, 0], [innerWidth, innerHeight]])
    .extent([[0, 0], [innerWidth, innerHeight]])
    .on('zoom', (event) => {
      const t = event.transform;

      // Show/hide reset button
      const isZoomed = t.k > 1.01 || Math.abs(t.x) > 1;
      if (resetZoomBtn) {
        resetZoomBtn.classList.toggle('viz-zoom-reset--visible', isZoomed);
      }

      // Rescale X only (horizontal zoom)
      const newX = t.rescaleX(xScale);

      // Update axis
      xAxisG.call(xAxisFn.scale(newX));

      // Update all dots: move circles and rects to new x positions
      clipG.selectAll('.zeitfluss-dot').each(function () {
        const elem = d3.select(this);
        const origX = +elem.attr('data-orig-x');
        const newPx = newX(origX);

        if (elem.node().tagName === 'circle') {
          elem.attr('cx', newPx);
        } else {
          // Diamond rect — reposition and re-rotate
          const origY = +elem.attr('data-orig-y');
          const side = +elem.attr('width');
          elem.attr('x', newPx - side / 2)
            .attr('y', origY - side / 2)
            .attr('transform', `rotate(45,${newPx},${origY})`);
        }
      });

      // Update phase bands
      clipG.selectAll('.zeitfluss-phase-bands rect').each(function () {
        const elem = d3.select(this);
        const von = +elem.attr('data-von');
        const bis = +elem.attr('data-bis');
        const x0 = Math.max(newX(von), 0);
        const x1 = Math.min(newX(bis), newX(yearMax));
        elem.attr('x', x0).attr('width', Math.max(x1 - x0, 0));
      });

      clipG.selectAll('.zeitfluss-phase-bands line').each(function () {
        const elem = d3.select(this);
        const yr = +elem.attr('data-year');
        if (!yr) return;
        const px = newX(yr);
        elem.attr('x1', px).attr('x2', px);
      });

      clipG.selectAll('.zeitfluss-phase-bands text').each(function () {
        const elem = d3.select(this);
        const von = +elem.attr('data-von');
        const bis = +elem.attr('data-bis');
        if (!von) return;
        const x0 = Math.max(newX(von), 0);
        const x1 = Math.min(newX(bis), newX(yearMax));
        elem.attr('x', (x0 + x1) / 2);
        // Hide labels when band too narrow
        const bw = x1 - x0;
        elem.style('display', bw < 20 ? 'none' : null);
      });
    });

  // Store for programmatic zoom (phase chips + reset)
  activeZoom = zoom;
  activeSvg = svg;

  // Apply zoom to an invisible rect over the data area (so scroll works)
  g.append('rect')
    .attr('class', 'zeitfluss-zoom-rect')
    .attr('x', 0).attr('y', 0)
    .attr('width', innerWidth).attr('height', innerHeight)
    .attr('fill', 'transparent')
    .style('cursor', 'grab');

  // Double-click on SVG clears persistent cross-view highlight
  svg.on('dblclick.highlight', () => clearHighlight());

  svg.call(zoom);
}

/* ================================================================== */
/*  Lebensphasen Bands                                                 */
/* ================================================================== */

function drawPhaseBands(g, xScale, height, yearMax) {
  const pg = g.append('g').attr('class', 'zeitfluss-phase-bands');

  lebensphasen.forEach((phase, i) => {
    const x0 = Math.max(xScale(phase.von), 0);
    const x1 = Math.min(xScale(phase.bis), xScale(yearMax));
    if (x1 <= x0) return;

    pg.append('rect')
      .attr('x', x0).attr('y', 0)
      .attr('width', x1 - x0).attr('height', height)
      .attr('fill', i % 2 === 0 ? 'rgba(0,74,143,0.06)' : 'rgba(0,74,143,0.02)')
      .attr('stroke', 'none')
      .attr('data-von', phase.von)
      .attr('data-bis', phase.bis);

    pg.append('line')
      .attr('x1', x0).attr('x2', x0)
      .attr('y1', 0).attr('y2', height)
      .attr('stroke', 'rgba(0,74,143,0.15)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3')
      .attr('data-year', phase.von);

    const midX = (x0 + x1) / 2;
    const bandWidth = x1 - x0;

    pg.append('text')
      .attr('class', 'zeitfluss-phase-label')
      .attr('x', midX).attr('y', 12)
      .attr('text-anchor', 'middle')
      .attr('data-von', phase.von)
      .attr('data-bis', phase.bis)
      .text(bandWidth > 50 ? phase.label : phase.id);

    if (bandWidth > 35) {
      pg.append('text')
        .attr('class', 'zeitfluss-phase-years')
        .attr('x', midX).attr('y', 23)
        .attr('text-anchor', 'middle')
        .attr('data-von', phase.von)
        .attr('data-bis', phase.bis)
        .text(`${phase.von}\u2013${phase.bis}`);
    }
  });

  const lastVisible = [...lebensphasen].reverse().find(p => {
    return Math.min(xScale(p.bis), xScale(yearMax)) > Math.max(xScale(p.von), 0);
  });
  if (lastVisible) {
    const xEnd = Math.min(xScale(lastVisible.bis), xScale(yearMax));
    pg.append('line')
      .attr('x1', xEnd).attr('x2', xEnd)
      .attr('y1', 0).attr('y2', height)
      .attr('stroke', 'rgba(0,74,143,0.15)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3')
      .attr('data-year', lastVisible.bis);
  }
}

/* ================================================================== */
/*  Row Grid & Labels                                                  */
/* ================================================================== */

function drawRowGrid(g, hauptRows, innerWidth) {
  const gg = g.append('g').attr('class', 'zeitfluss-row-grid');
  for (const row of hauptRows) {
    gg.append('line')
      .attr('x1', 0).attr('x2', innerWidth)
      .attr('y1', row.y).attr('y2', row.y)
      .attr('stroke', 'rgba(0,0,0,0.04)');
  }
}

function drawYLabels(g, hauptRows) {
  const lg = g.append('g').attr('class', 'zeitfluss-y-labels');

  for (const row of hauptRows) {
    const s = row.strang;
    const badge = s.dokumente_undatiert > 0
      ? `${s.dokumente_datiert}+${s.dokumente_undatiert} Dok.`
      : `${s.dokumente_datiert} Dok.`;

    lg.append('text')
      .attr('class', 'zeitfluss-ylabel')
      .attr('x', -8).attr('y', row.y + 1)
      .attr('text-anchor', 'end')
      .attr('fill', s.farbe)
      .attr('data-komponist', s.komponist)
      .attr('data-orig-fill', s.farbe)
      .style('cursor', 'pointer')
      .text(s.komponist)
      .on('click', () => navigateToIndex('personen', s.komponist));

    lg.append('text')
      .attr('class', 'zeitfluss-ylabel-count')
      .attr('x', -8).attr('y', row.y + 12)
      .attr('text-anchor', 'end')
      .text(badge);
  }
}

/* ================================================================== */
/*  Dots — Haupt-Straenge                                              */
/* ================================================================== */

function drawDots(g, strang, rowY, rowH, xScale, rScale, svgContainer, rand) {
  const dg = g.append('g')
    .attr('class', 'zeitfluss-dots')
    .attr('data-komponist', strang.komponist);

  const datiertWerke = strang.werke.filter(w => w.datiert && w.erstbeleg && werkMatchesGattung(w));

  const byYear = new Map();
  for (const w of datiertWerke) {
    if (!byYear.has(w.erstbeleg)) byYear.set(w.erstbeleg, []);
    byYear.get(w.erstbeleg).push(w);
  }

  for (const [, werke] of byYear) {
    const n = werke.length;
    werke.forEach((werk, i) => {
      const wx = xScale(werk.erstbeleg);
      const maxJ = Math.min(rowH * 0.35, 14);
      const yOff = n > 1
        ? ((i / (n - 1)) - 0.5) * maxJ * 2
        : (rand() - 0.5) * maxJ * 0.4;
      const wy = rowY + yOff;
      const r = rScale(werk.dokumente);

      drawMarker(dg, werk, strang, wx, wy, r, svgContainer);
    });
  }
}

/* ================================================================== */
/*  Dots — Einzelbelege (all composers in one row)                     */
/* ================================================================== */

function drawEinzelbelegeDots(g, weitereStraenge, rowY, rowH, xScale, rScale, svgContainer, rand) {
  const dg = g.append('g').attr('class', 'zeitfluss-dots zeitfluss-dots--einzel');

  const items = [];
  for (const s of weitereStraenge) {
    for (const w of s.werke) {
      if (w.datiert && w.erstbeleg && werkMatchesGattung(w)) {
        items.push({ werk: w, strang: s });
      }
    }
  }

  const byYear = new Map();
  for (const item of items) {
    const yr = item.werk.erstbeleg;
    if (!byYear.has(yr)) byYear.set(yr, []);
    byYear.get(yr).push(item);
  }

  for (const [, group] of byYear) {
    const n = group.length;
    group.forEach((item, i) => {
      const wx = xScale(item.werk.erstbeleg);
      const maxJ = Math.min(rowH * 0.4, 14);
      const yOff = n > 1
        ? ((i / (n - 1)) - 0.5) * maxJ * 2
        : (rand() - 0.5) * maxJ * 0.5;
      const wy = rowY + yOff;
      const r = Math.min(rScale(item.werk.dokumente), 5);

      drawMarker(dg, item.werk, item.strang, wx, wy, r, svgContainer);
    });
  }
}

/* ================================================================== */
/*  Shared Marker Drawing                                              */
/* ================================================================== */

function drawMarker(dg, werk, strang, wx, wy, r, svgContainer) {
  const ortStroke = (werk.orte && werk.orte.length > 0)
    ? (ORT_STROKE[werk.orte[0]] || '#fff')
    : '#fff';

  if (werk.istOper) {
    const dot = dg.append('circle')
      .attr('class', 'zeitfluss-dot')
      .attr('cx', wx).attr('cy', wy)
      .attr('r', r)
      .attr('fill', strang.farbe)
      .attr('fill-opacity', 0.8)
      .attr('stroke', ortStroke)
      .attr('stroke-width', 1.2)
      .attr('data-orig-x', werk.erstbeleg)
      .attr('data-orig-y', wy)
      .style('cursor', 'pointer');
    attachDotEvents(dot, werk, strang, svgContainer, 'circle', r);
  } else {
    const side = Math.max(r * 1.4, DIAMOND_MIN_SIDE);
    const dot = dg.append('rect')
      .attr('class', 'zeitfluss-dot')
      .attr('x', wx - side / 2).attr('y', wy - side / 2)
      .attr('width', side).attr('height', side)
      .attr('transform', `rotate(45,${wx},${wy})`)
      .attr('fill', strang.farbe)
      .attr('fill-opacity', 0.8)
      .attr('stroke', ortStroke)
      .attr('stroke-width', 0.8)
      .attr('data-orig-x', werk.erstbeleg)
      .attr('data-orig-y', wy)
      .style('cursor', 'pointer');
    attachDotEvents(dot, werk, strang, svgContainer, 'diamond', r);
  }
}

/* ================================================================== */
/*  Dot Events                                                         */
/* ================================================================== */

function attachDotEvents(sel, werk, strang, svgContainer, shape, baseR) {
  sel
    .on('mouseover', function (event) {
      if (shape === 'circle') {
        d3.select(this).transition().duration(100)
          .attr('r', baseR * 1.4).attr('fill-opacity', 1);
      } else {
        d3.select(this).transition().duration(100).attr('fill-opacity', 1);
      }
      d3.selectAll('.zeitfluss-dots').transition().duration(150)
        .style('opacity', function () {
          const dk = d3.select(this).attr('data-komponist');
          return (!dk || dk === strang.komponist) ? 1 : 0.15;
        });
      tooltip.show(event, buildDotTooltip(werk, strang));
    })
    .on('mousemove', (event) => tooltip.move(event))
    .on('mouseout', function () {
      if (shape === 'circle') {
        d3.select(this).transition().duration(100)
          .attr('r', baseR).attr('fill-opacity', 0.8);
      } else {
        d3.select(this).transition().duration(100).attr('fill-opacity', 0.8);
      }
      // Restore persistent highlight if active, otherwise full opacity
      if (activeHighlight) {
        d3.selectAll('.zeitfluss-dots').transition().duration(150)
          .style('opacity', function () {
            const dk = d3.select(this).attr('data-komponist');
            return (!dk || dk === activeHighlight) ? 1 : 0.15;
          });
      } else {
        d3.selectAll('.zeitfluss-dots').transition().duration(150).style('opacity', 1);
      }
      tooltip.hide();
    })
    .on('click', (event) => {
      if (event.shiftKey) {
        // Shift+Click → Kosmos with composer highlight
        navigateToView('kosmos', { komponist: strang.komponist });
      } else if (werk.signaturen.length > 0) {
        window.location.hash = '#archiv/' + encodeURIComponent(werk.signaturen[0]);
      }
    });
}

/* ================================================================== */
/*  Tooltip                                                            */
/* ================================================================== */

/* Tooltip functions delegated to shared createTooltip() controller */

function buildDotTooltip(werk, strang) {
  const type = werk.istOper ? '<span class="tt-type">Oper</span> \u00b7 ' : '';
  const orte = werk.orte.length > 0 ? werk.orte.slice(0, 4).join(', ') : '';
  const zeit = !werk.erstbeleg ? 'undatiert'
    : werk.erstbeleg === werk.letztbeleg ? `${werk.erstbeleg}`
    : `${werk.erstbeleg}\u2013${werk.letztbeleg}`;
  const sigs = werk.signaturen.slice(0, 3).map(s => s.replace(/^UAKUG\//, '')).join(', ');

  return `
    <strong style="color:${strang.farbe}">${strang.komponist}</strong>
    <span class="tt-werk">${werk.name}</span><br>
    ${type}${zeit} \u00b7 ${werk.dokumente} Dok.<br>
    ${orte ? `<span class="tt-orte">${orte}</span><br>` : ''}
    ${sigs ? `<span class="tt-meta">${sigs}</span>` : ''}
  `;
}

/* ================================================================== */
/*  Cross-View Navigation: Highlight                                   */
/* ================================================================== */

onViewNavigate('zeitfluss', (detail) => {
  const { komponist } = detail;
  if (!komponist || !rendered) return;
  const match = document.querySelector(`.zeitfluss-dots[data-komponist="${komponist}"]`);
  if (!match) return;
  highlightKomponist(komponist);
});

function highlightKomponist(name) {
  activeHighlight = name;

  // Dim all dot groups except the match
  d3.selectAll('.zeitfluss-dots').transition().duration(300)
    .style('opacity', function () {
      const dk = d3.select(this).attr('data-komponist');
      return (!dk || dk === name) ? 1 : 0.15;
    });

  // Highlight the matching Y-label
  d3.selectAll('.zeitfluss-ylabel').each(function () {
    const el = d3.select(this);
    const dk = el.attr('data-komponist');
    if (dk === name) {
      el.classed('zeitfluss-ylabel--highlighted', true);
    }
  });
}

function clearHighlight() {
  if (!activeHighlight) return;
  activeHighlight = null;

  d3.selectAll('.zeitfluss-dots').transition().duration(200).style('opacity', 1);
  d3.selectAll('.zeitfluss-ylabel').each(function () {
    const el = d3.select(this);
    el.classed('zeitfluss-ylabel--highlighted', false);
    const origFill = el.attr('data-orig-fill');
    if (origFill) el.attr('fill', origFill);
  });
}
