/**
 * M³GIM Mobilität View — Geographic mobility swim-lane timeline (D3.js).
 */

import { el, clear } from '../utils/dom.js';
import { extractYear } from '../utils/date-parser.js';
import { ensureArray } from '../utils/format.js';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LOCATION_ORDER = [
  'Lemberg', 'Wien', 'Graz', 'Bayreuth', 'München', 'Salzburg', 'Zürich',
];

const PLACE_STYLES = {
  wohnort:         { fill: '#004A8F', opacity: 0.55, label: 'Wohnort' },
  auffuehrungsort: { fill: '#9A7B4F', opacity: 0.35, label: 'Aufführungsort' },
};

const MOBILITY_COLORS = {
  erzwungen:   '#8B3A3A',
  geografisch: '#3D7A5A',
  lebensstil:  '#6B4E8C',
};

const MOBILITY_LABELS = {
  erzwungen:   'Erzwungene Mobilität',
  geografisch: 'Geografische Mobilität',
  lebensstil:  'Lebensstil-Mobilität',
};

/** Roles that indicate a performance at a location. */
const PERFORMANCE_ROLES = new Set([
  'auffuehrungsort', 'gastspiel', 'aufführung', 'spielzeit',
]);

/** Piecewise-linear time scale: compress the sparse 1975–2009 range. */
const BREAK_YEAR = 1975;
const BREAK_RATIO = 0.74;

const GUEST_ROW_H = 20;        // height per guest-city row
const GUEST_SECTION_GAP = 24;  // gap between swim lanes and dot section
const GUEST_DOT_COLOR = '#9A7B4F';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let rendered = false;

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function renderMobilitaet(store, container) {
  if (rendered) return;
  rendered = true;
  clear(container);
  buildView(store, container);
}

export function resetMobilitaet() {
  rendered = false;
}

/* ------------------------------------------------------------------ */
/*  Guest-performance extraction from store                            */
/* ------------------------------------------------------------------ */

/**
 * Build a Map<cityName, {years: Map<year, count>}> from store.locations,
 * excluding the 7 biographical main cities.
 */
function extractGuestPerformances(store) {
  const mainCities = new Set(LOCATION_ORDER);
  const result = new Map();

  for (const [name, entry] of store.locations) {
    // Only locations with a performance-related role
    let isPerformance = false;
    for (const r of entry.roles) {
      if (PERFORMANCE_ROLES.has(r)) { isPerformance = true; break; }
    }
    if (!isPerformance) continue;
    if (mainCities.has(name)) continue;

    const years = new Map(); // year → record count

    for (const recId of entry.records) {
      const rec = store.records.get(recId);
      if (!rec) continue;

      // Primary: rico:date
      let year = extractYear(rec['rico:date']);

      // Fallback: first m3gim:eventDate entry
      if (!year) {
        const evts = ensureArray(rec['m3gim:eventDate']);
        for (const e of evts) {
          year = extractYear(e);
          if (year) break;
        }
      }

      if (year && year >= 1935 && year <= 2009) {
        years.set(year, (years.get(year) || 0) + 1);
      }
    }

    if (years.size > 0) {
      result.set(name, years);
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  View builder                                                       */
/* ------------------------------------------------------------------ */

async function buildView(store, container) {
  const resp = await fetch('./data/partitur.json');
  const data = await resp.json();

  const guestData = extractGuestPerformances(store);

  const wrapper = el('div', { className: 'mob' });

  wrapper.appendChild(
    el('h3', { className: 'mob__heading' },
      'Mobilität \u2014 Ira Malaniuk (1919\u20132009)'),
  );

  const svgBox = el('div', { className: 'mob__container' });
  wrapper.appendChild(svgBox);

  wrapper.appendChild(buildLegend());

  container.appendChild(wrapper);
  renderTimeline(data, guestData, svgBox);
}

/* ------------------------------------------------------------------ */
/*  D3 Timeline                                                        */
/* ------------------------------------------------------------------ */

function renderTimeline(data, guestData, svgBox) {
  const margin = { top: 90, right: 40, bottom: 44, left: 110 };
  const laneH = 36;
  const lanePad = 0.3;
  const chartW = Math.max(svgBox.clientWidth || 900, 800);

  // Base height for the 7 swim lanes
  const swimH = LOCATION_ORDER.length * Math.round(laneH / (1 - lanePad));

  // Guest section height
  const guestCities = sortedGuestCities(guestData);
  const guestH = guestCities.length > 0
    ? GUEST_SECTION_GAP + guestCities.length * GUEST_ROW_H + 8
    : 0;

  const chartH = margin.top + swimH + guestH + margin.bottom;

  const svg = d3.select(svgBox)
    .append('svg')
    .attr('viewBox', `0 0 ${chartW} ${chartH}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  /* ---- scales ---- */
  const usable = chartW - margin.left - margin.right;
  const x = d3.scaleLinear()
    .domain([1919, BREAK_YEAR, 2009])
    .range([margin.left, margin.left + usable * BREAK_RATIO, chartW - margin.right]);

  const y = d3.scaleBand()
    .domain(LOCATION_ORDER)
    .range([margin.top, margin.top + swimH])
    .padding(lanePad);

  /* ---- defs: arrow markers ---- */
  const defs = svg.append('defs');
  for (const [form, color] of Object.entries(MOBILITY_COLORS)) {
    const big = form === 'erzwungen';
    defs.append('marker')
      .attr('id', `mob-arrow-${form}`)
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 9).attr('refY', 5)
      .attr('markerWidth', big ? 8 : 6)
      .attr('markerHeight', big ? 8 : 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0 0 L10 5 L0 10z')
      .attr('fill', color);
  }

  /* ---- layers (z-order) ---- */
  const axisY = margin.top + swimH + guestH;  // x-axis at very bottom

  drawPhaseBands(svg, data.lebensphasen, x, margin, axisY);
  drawScaleBreak(svg, x, margin, axisY);
  drawGridLines(svg, LOCATION_ORDER, y, margin, chartW);
  drawContextLines(svg, data.orte, x, y);
  drawBars(svg, data.orte, x, y);
  drawArrows(svg, data.mobilitaet, x, y);
  drawPhaseLabels(svg, data.lebensphasen, x, margin);

  // Guest performances dot-plot
  if (guestCities.length > 0) {
    const guestTop = margin.top + swimH + GUEST_SECTION_GAP;
    drawGuestDots(svg, guestCities, guestData, x, guestTop, margin, chartW);
  }

  // Axes last (on top)
  drawAxes(svg, x, y, margin, axisY);
}

/* ------------------------------------------------------------------ */
/*  Helper: sort guest cities by earliest year                         */
/* ------------------------------------------------------------------ */

function sortedGuestCities(guestData) {
  const entries = [];
  for (const [city, years] of guestData) {
    const minYear = Math.min(...years.keys());
    entries.push({ city, minYear });
  }
  entries.sort((a, b) => a.minYear - b.minYear);
  return entries.map(e => e.city);
}

/* ------------------------------------------------------------------ */
/*  Layer: life-phase background bands                                 */
/* ------------------------------------------------------------------ */

function drawPhaseBands(svg, phases, x, margin, bottomY) {
  const g = svg.append('g').attr('class', 'mob__phases');

  phases.forEach((p, i) => {
    const x1 = x(p.von);
    const x2 = x(p.bis);
    g.append('rect')
      .attr('x', x1).attr('y', margin.top)
      .attr('width', x2 - x1)
      .attr('height', bottomY - margin.top)
      .attr('fill', i % 2 === 0 ? '#F5F0E8' : 'transparent')
      .attr('opacity', 0.5);
  });
}

/* ------------------------------------------------------------------ */
/*  Scale-break indicator at BREAK_YEAR                                */
/* ------------------------------------------------------------------ */

function drawScaleBreak(svg, x, margin, bottomY) {
  const bx = x(BREAK_YEAR);
  const y1 = bottomY - 2;
  const amp = 3;
  svg.append('path')
    .attr('d', `M${bx - amp},${y1} l${amp},-4 l${amp * 2},8 l${amp},-4`)
    .attr('fill', 'none')
    .attr('stroke', '#8A857E')
    .attr('stroke-width', 1);
}

/* ------------------------------------------------------------------ */
/*  Layer: horizontal grid lines                                       */
/* ------------------------------------------------------------------ */

function drawGridLines(svg, locations, y, margin, chartW) {
  const g = svg.append('g').attr('class', 'mob__grid');

  locations.forEach(loc => {
    const yPos = y(loc) + y.bandwidth();
    g.append('line')
      .attr('x1', margin.left).attr('x2', chartW - 40)
      .attr('y1', yPos).attr('y2', yPos)
      .attr('stroke', '#E0DCD6')
      .attr('stroke-dasharray', '2,4');
  });
}

/* ------------------------------------------------------------------ */
/*  Layer: context lines (show Wien as base for venues)                */
/* ------------------------------------------------------------------ */

function drawContextLines(svg, orte, x, y) {
  const g = svg.append('g').attr('class', 'mob__context');
  const venues = orte.filter(o => o.typ === 'auffuehrungsort');
  const wienY = y('Wien') + y.bandwidth() / 2;

  venues.forEach(v => {
    const vx = x(v.von);
    const venueY = y(v.ort);
    g.append('line')
      .attr('x1', vx).attr('x2', vx)
      .attr('y1', wienY)
      .attr('y2', venueY + y.bandwidth() / 2)
      .attr('stroke', '#C4B49A')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,4')
      .attr('stroke-opacity', 0.5);
  });
}

/* ------------------------------------------------------------------ */
/*  Layer: residence / performance bars                                */
/* ------------------------------------------------------------------ */

function drawBars(svg, orte, x, y) {
  const g = svg.append('g').attr('class', 'mob__bars');

  orte.forEach(ort => {
    const style = PLACE_STYLES[ort.typ];
    if (!style) return;

    const x1 = x(ort.von);
    const x2 = x(ort.bis);
    const bw = y.bandwidth();

    const rect = g.append('rect')
      .attr('x', x1)
      .attr('y', y(ort.ort))
      .attr('width', Math.max(x2 - x1, 4))
      .attr('height', bw)
      .attr('rx', 3)
      .attr('fill', style.fill)
      .attr('opacity', style.opacity)
      .attr('stroke', style.fill)
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.5);

    rect.append('title')
      .text(`${ort.ort} (${style.label})\n${ort.von}\u2013${ort.bis}`);

    rect.on('mouseenter', function () {
      d3.select(this).attr('stroke-width', 2).attr('stroke-opacity', 0.9);
    }).on('mouseleave', function () {
      d3.select(this).attr('stroke-width', 1).attr('stroke-opacity', 0.5);
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Layer: mobility arrows                                             */
/* ------------------------------------------------------------------ */

function drawArrows(svg, events, x, y) {
  const g = svg.append('g').attr('class', 'mob__arrows');

  const usedLabels = [];

  events.forEach(mov => {
    const mx = x(mov.jahr);
    const yFrom = y(mov.von) + y.bandwidth() / 2;
    const yTo   = y(mov.nach) + y.bandwidth() / 2;
    const color = MOBILITY_COLORS[mov.form] || '#757575';
    const isForced = mov.form === 'erzwungen';

    const vDist = Math.abs(yTo - yFrom);
    const bow = Math.max(36, vDist * 0.45);

    const goesUp = yTo < yFrom;
    const bowDir = goesUp ? -1 : 1;
    const cx = mx + bow * bowDir;

    const path = `M${mx},${yFrom} Q${cx},${(yFrom + yTo) / 2} ${mx},${yTo}`;

    const strokeW = isForced ? 3.5 : 2.5;
    const dash = isForced ? '6,3' : 'none';

    const arrow = g.append('path')
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', strokeW)
      .attr('stroke-opacity', 0.85)
      .attr('stroke-dasharray', dash)
      .attr('marker-end', `url(#mob-arrow-${mov.form})`);

    arrow.append('title')
      .text(`${mov.von} \u2192 ${mov.nach} (${mov.jahr})\n${MOBILITY_LABELS[mov.form] || mov.form}: ${mov.beschreibung}`);

    const hoverW = strokeW + 1.5;
    arrow
      .on('mouseenter', function () {
        d3.select(this).attr('stroke-width', hoverW).attr('stroke-opacity', 1);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('stroke-width', strokeW).attr('stroke-opacity', 0.85);
      });

    const labelX = mx + bow * bowDir + (bowDir > 0 ? 6 : -6);
    let labelY = (yFrom + yTo) / 2 + 4;
    const anchor = bowDir > 0 ? 'start' : 'end';

    for (const prev of usedLabels) {
      if (Math.abs(labelX - prev.x) < 30 && Math.abs(labelY - prev.y) < 14) {
        labelY = prev.y + 14;
      }
    }
    usedLabels.push({ x: labelX, y: labelY });

    g.append('text')
      .attr('x', labelX)
      .attr('y', labelY)
      .attr('text-anchor', anchor)
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-size', '9px')
      .attr('fill', color)
      .attr('font-weight', '600')
      .text(mov.jahr);
  });
}

/* ------------------------------------------------------------------ */
/*  Layer: axes                                                        */
/* ------------------------------------------------------------------ */

function drawAxes(svg, x, y, margin, axisY) {
  const xAxis = d3.axisBottom(x)
    .tickValues([1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2009])
    .tickFormat(d3.format('d'));

  svg.append('g')
    .attr('class', 'mob__axis-x')
    .attr('transform', `translate(0,${axisY})`)
    .call(xAxis)
    .selectAll('text')
    .style('font-family', "'JetBrains Mono', monospace")
    .style('font-size', '10px')
    .style('fill', '#5C5651');

  svg.append('g')
    .attr('class', 'mob__axis-y')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll('text')
    .style('font-family', "'Inter', sans-serif")
    .style('font-size', '12px')
    .style('font-weight', '500')
    .style('fill', '#2C2825');
}

/* ------------------------------------------------------------------ */
/*  Layer: life-phase labels (two-row stagger for short phases)        */
/* ------------------------------------------------------------------ */

function drawPhaseLabels(svg, phases, x, margin) {
  const g = svg.append('g').attr('class', 'mob__phase-labels');

  const items = phases.map(p => {
    const px1 = x(p.von);
    const px2 = x(p.bis);
    return { ...p, px1, px2, pxW: px2 - px1 };
  });

  const ROW_LO = margin.top - 22;
  const ROW_HI = margin.top - 48;

  items.forEach(p => {
    const cx = (p.px1 + p.px2) / 2;
    const narrow = p.pxW < 55;
    const row = narrow ? ROW_HI : ROW_LO;

    let label = p.label;
    if (p.pxW < 30) {
      label = p.label.split('&')[0].split(' ')[0];
    } else if (p.pxW < 70) {
      const words = p.label.split(' ');
      label = words.length > 2 ? words.slice(0, 2).join(' ') : p.label;
    }

    const fontSize = p.pxW < 40 ? '9px' : '11px';

    if (narrow) {
      g.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', row + 6).attr('y2', margin.top - 2)
        .attr('stroke', '#C4B49A')
        .attr('stroke-width', 0.75)
        .attr('stroke-dasharray', '2,2');
    }

    g.append('text')
      .attr('x', cx)
      .attr('y', row)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'Source Serif 4', Georgia, serif")
      .attr('font-size', fontSize)
      .attr('font-style', 'italic')
      .attr('fill', '#5C5651')
      .text(label);

    g.append('text')
      .attr('x', cx)
      .attr('y', row + 13)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-size', '8px')
      .attr('fill', '#8A857E')
      .text(`${p.von}\u2013${p.bis}`);
  });
}

/* ------------------------------------------------------------------ */
/*  Layer: guest-performance dot-plot                                  */
/* ------------------------------------------------------------------ */

function drawGuestDots(svg, cities, guestData, x, top, margin, chartW) {
  const g = svg.append('g').attr('class', 'mob__guests');

  // Separator line
  const sepY = top - GUEST_SECTION_GAP / 2;
  g.append('line')
    .attr('x1', margin.left).attr('x2', chartW - margin.right)
    .attr('y1', sepY).attr('y2', sepY)
    .attr('stroke', '#E0DCD6')
    .attr('stroke-width', 1);

  // Section label
  g.append('text')
    .attr('x', margin.left)
    .attr('y', sepY - 5)
    .attr('font-family', "'Source Serif 4', Georgia, serif")
    .attr('font-size', '10px')
    .attr('font-style', 'italic')
    .attr('fill', '#8A857E')
    .text('Internationale Gastspiele');

  cities.forEach((city, i) => {
    const cy = top + i * GUEST_ROW_H + GUEST_ROW_H / 2;
    const years = guestData.get(city);

    // City label
    g.append('text')
      .attr('x', margin.left - 6)
      .attr('y', cy + 4)
      .attr('text-anchor', 'end')
      .attr('font-family', "'Inter', sans-serif")
      .attr('font-size', '10px')
      .attr('fill', '#5C5651')
      .text(city);

    // Dots per year
    for (const [year, count] of years) {
      const cx = x(year);
      const r = Math.min(3 + count, 7);

      const dot = g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', r)
        .attr('fill', GUEST_DOT_COLOR)
        .attr('fill-opacity', 0.65)
        .attr('stroke', GUEST_DOT_COLOR)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.4);

      const docLabel = count === 1 ? '1 Dokument' : `${count} Dokumente`;
      dot.append('title')
        .text(`${city} (${year}) \u2014 ${docLabel}`);

      dot
        .on('mouseenter', function () {
          d3.select(this).attr('fill-opacity', 1).attr('stroke-opacity', 0.8);
        })
        .on('mouseleave', function () {
          d3.select(this).attr('fill-opacity', 0.65).attr('stroke-opacity', 0.4);
        });
    }

    // Faint grid line
    if (i < cities.length - 1) {
      g.append('line')
        .attr('x1', margin.left).attr('x2', chartW - margin.right)
        .attr('y1', cy + GUEST_ROW_H / 2).attr('y2', cy + GUEST_ROW_H / 2)
        .attr('stroke', '#EDE9E3')
        .attr('stroke-dasharray', '1,4');
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Legend (HTML)                                                       */
/* ------------------------------------------------------------------ */

function buildLegend() {
  const items = [
    { color: '#004A8F', opacity: 0.55, label: 'Wohnort' },
    { color: '#9A7B4F', opacity: 0.35, label: 'Aufführungsort' },
    { spacer: true },
    { color: '#8B3A3A', opacity: 1, label: 'Erzwungene Mobilität', dashed: true },
    { color: '#3D7A5A', opacity: 1, label: 'Geografische Mobilität' },
    { color: '#6B4E8C', opacity: 1, label: 'Lebensstil-Mobilität' },
    { spacer: true },
    { color: GUEST_DOT_COLOR, opacity: 0.65, label: 'Gastspiel-Beleg', round: true },
  ];

  const children = items.map(it => {
    if (it.spacer) return el('span', { className: 'mob__legend-spacer' }, '\u00b7');
    let cls = 'mob__legend-dot';
    if (it.dashed) cls += ' mob__legend-dot--dashed';
    if (it.round) cls += ' mob__legend-dot--round';
    const dotStyle = `background:${it.color};opacity:${it.opacity}`;
    return el('span', { className: 'mob__legend-item' },
      el('span', { className: cls, style: dotStyle }),
      it.label,
    );
  });

  return el('div', { className: 'mob__legend' }, ...children);
}
