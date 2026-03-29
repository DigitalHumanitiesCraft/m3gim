/** M³GIM Lebenspartitur — Bump-Chart (D3.js) */

import { loadPartitur } from '../data/loader.js';

/* ================================================================
   Lebenspartitur — Bump-Chart
   ================================================================ */

// ---- Constants ----
const LOCATIONS = ['Lemberg', 'Wien', 'Graz', 'Bayreuth', 'München', 'Salzburg', 'Zürich'];

const BREAK_YEAR = 1975;
const BREAK_RATIO = 0.74;

const CHART_H = 800;
const MARGIN = { top: 50, right: 20, bottom: 40, left: 20 };

const COLOR = {
  blau: '#004A8F',
  gold: '#9A7B4F',
  rot: '#8B3A3A',
  grau: '#5C5651',
  subtle: '#C4B49A',
  cream: '#F5F0E8',
  paper: '#FDFBF7',
};

const MOB_COLOR = {
  erzwungen: '#8B3A3A',
  geografisch: '#3D7A5A',
  lebensstil: '#6B4E8C',
  national: '#4A6E96',
  bildung: '#B67D3D',
};

const MOB_LABEL = {
  erzwungen: 'Erzwungene Mobilität',
  geografisch: 'Geografische Mobilität',
  lebensstil: 'Lebensstil-Mobilität',
  national: 'Nationale Mobilität',
  bildung: 'Bildungsmobilität',
};

const REP_COLOR = {
  'Wagner': '#6B2C2C',
  'Verdi': '#2C5C3F',
  'Gluck/Händel': '#8B7355',
  'Beethoven': '#4A5A7A',
};

// ---- Y-Scale (piecewise-linear with scale break) ----
function makeYScale() {
  const usableH = CHART_H - MARGIN.top - MARGIN.bottom;
  return d3.scaleLinear()
    .domain([1919, BREAK_YEAR, 2009])
    .range([MARGIN.top, MARGIN.top + usableH * BREAK_RATIO, CHART_H - MARGIN.bottom]);
}

// ---- Wohnort Segments for Life-line ----
const LIFE_SEGMENTS = [
  { type: 'stay', ort: 'Lemberg', von: 1919, bis: 1944 },
  { type: 'move', von: 'Lemberg', nach: 'Wien', jahr: 1944, form: 'erzwungen' },
  { type: 'move', von: 'Wien', nach: 'Graz', jahr: 1945, form: 'geografisch' },
  { type: 'stay', ort: 'Graz', von: 1945, bis: 1950 },
  { type: 'move', von: 'Graz', nach: 'Wien', jahr: 1950, form: 'geografisch' },
  { type: 'stay', ort: 'Wien', von: 1950, bis: 1970 },
  { type: 'move', von: 'Wien', nach: 'Zürich', jahr: 1970, form: 'lebensstil' },
  { type: 'stay', ort: 'Zürich', von: 1970, bis: 2009 },
];

// ---- Tooltip Helpers (container-relative) ----
function createTooltipHelpers(tooltipEl, chartContainerEl) {
  function show(event, html) {
    tooltipEl.innerHTML = html;
    tooltipEl.classList.add('lp-tooltip--visible');
    move(event);
  }
  function move(event) {
    const rect = chartContainerEl.getBoundingClientRect();
    let x = event.clientX - rect.left + 12;
    let y = event.clientY - rect.top + 12;
    if (x + 200 > rect.width) x = x - 220;
    if (y + 100 > rect.height) y = y - 120;
    tooltipEl.style.left = x + 'px';
    tooltipEl.style.top = y + 'px';
  }
  function hide() {
    tooltipEl.classList.remove('lp-tooltip--visible');
  }
  return { show, move, hide };
}

// ---- Core Chart Renderer ----
async function renderChart(refs) {
  const { chartContainerEl, tooltipEl, netzContainerEl, repContainerEl, coverageEl } = refs;
  const tooltip = createTooltipHelpers(tooltipEl, chartContainerEl);

  const data = await loadPartitur();
  if (!data) {
    chartContainerEl.textContent = 'Fehler beim Laden der Daten.';
    return;
  }

  const chartW = Math.max(chartContainerEl.clientWidth || 600, 500);

  const y = makeYScale();
  const x = d3.scaleBand()
    .domain(LOCATIONS)
    .range([MARGIN.left, chartW - MARGIN.right])
    .padding(0.15);

  const bandW = x.bandwidth();

  // ---- Main SVG ----
  const svg = d3.select(chartContainerEl)
    .append('svg')
    .attr('width', chartW)
    .attr('height', CHART_H)
    .style('display', 'block');

  // ---- Phase Bands (horizontal stripes) ----
  const phases = data.lebensphasen || [];
  const phaseColors = ['#F5F0E8', 'transparent'];
  phases.forEach((p, i) => {
    svg.append('rect')
      .attr('x', 0).attr('y', y(p.von))
      .attr('width', chartW).attr('height', y(p.bis) - y(p.von))
      .attr('fill', phaseColors[i % 2]).attr('opacity', 0.5);
  });

  // Phase labels (right edge, inside band)
  phases.forEach(p => {
    const midY = (y(p.von) + y(p.bis)) / 2;
    const bandHeight = y(p.bis) - y(p.von);
    if (bandHeight > 20) {
      svg.append('text')
        .attr('x', chartW - 4).attr('y', midY + 3)
        .attr('text-anchor', 'end')
        .attr('font-family', "'Source Serif 4', Georgia, serif")
        .attr('font-size', bandHeight < 40 ? '8px' : '10px')
        .attr('font-style', 'italic')
        .attr('fill', COLOR.subtle)
        .attr('opacity', 0.85)
        .text(p.label);
    }
  });

  // ---- Column Backgrounds ----
  LOCATIONS.forEach((loc, i) => {
    svg.append('rect')
      .attr('x', x(loc)).attr('y', MARGIN.top)
      .attr('width', bandW).attr('height', CHART_H - MARGIN.top - MARGIN.bottom)
      .attr('fill', i % 2 === 0 ? COLOR.cream : 'transparent')
      .attr('opacity', 0.35);
  });

  // ---- Ort Labels (top, rotated) ----
  LOCATIONS.forEach(loc => {
    svg.append('text')
      .attr('x', x(loc) + bandW / 2)
      .attr('y', MARGIN.top - 8)
      .attr('text-anchor', 'end')
      .attr('transform', `rotate(-45, ${x(loc) + bandW / 2}, ${MARGIN.top - 8})`)
      .attr('font-family', "'Inter', sans-serif")
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('fill', COLOR.grau)
      .text(loc);
  });

  // ---- Year Ticks (left axis) ----
  const yearTicks = [1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000];
  yearTicks.forEach(yr => {
    const yy = y(yr);
    svg.append('line')
      .attr('x1', 0).attr('x2', chartW)
      .attr('y1', yy).attr('y2', yy)
      .attr('stroke', '#E0DCD6').attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '2,6');
    svg.append('text')
      .attr('x', 4).attr('y', yy - 3)
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-size', '9px')
      .attr('fill', '#8A857E')
      .text(yr);
  });

  // ---- Scale Break Indicator at y(1975) ----
  const breakY = y(BREAK_YEAR);
  svg.append('line')
    .attr('x1', 0).attr('x2', chartW)
    .attr('y1', breakY).attr('y2', breakY)
    .attr('stroke', '#E0DCD6').attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,4');
  // Zigzag
  const amp = 5;
  svg.append('path')
    .attr('d', `M${chartW / 2 - 15},${breakY} l5,-${amp} l10,${amp * 2} l5,-${amp}`)
    .attr('fill', 'none').attr('stroke', '#8A857E').attr('stroke-width', 1.5);
  svg.append('text')
    .attr('x', chartW / 2 + 14).attr('y', breakY + 3)
    .attr('font-family', "'JetBrains Mono', monospace")
    .attr('font-size', '7px').attr('fill', '#8A857E')
    .text('// komprimiert');

  // ---- Aufführungsort Bars (gold, translucent) ----
  const auffOrte = (data.orte || []).filter(o => o.typ === 'auffuehrungsort');
  auffOrte.forEach(o => {
    if (!LOCATIONS.includes(o.ort)) return;
    const barW = bandW * 0.6;
    const barX = x(o.ort) + (bandW - barW) / 2;
    const rect = svg.append('rect')
      .attr('x', barX).attr('y', y(o.von))
      .attr('width', barW).attr('height', y(o.bis) - y(o.von))
      .attr('rx', 3)
      .attr('fill', COLOR.gold).attr('opacity', 0.2)
      .style('cursor', 'pointer');
    rect
      .on('mouseenter', e => {
        tooltip.show(e, `<strong>${o.ort}</strong> (Aufführungsort)<br>${o.von}\u2013${o.bis}`);
        rect.attr('opacity', 0.35);
      })
      .on('mousemove', e => tooltip.move(e))
      .on('mouseleave', () => { tooltip.hide(); rect.attr('opacity', 0.2); });
  });

  // ---- Lehrstätte: Graz 1970-2000 ----
  {
    const lBarW = bandW * 0.5;
    const lBarX = x('Graz') + (bandW - lBarW) / 2;
    const lRect = svg.append('rect')
      .attr('x', lBarX).attr('y', y(1970))
      .attr('width', lBarW).attr('height', y(2000) - y(1970))
      .attr('rx', 3)
      .attr('fill', 'none')
      .attr('stroke', COLOR.blau).attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5,3')
      .attr('stroke-opacity', 0.4)
      .attr('opacity', 0.15)
      .style('cursor', 'pointer');
    svg.append('rect')
      .attr('x', lBarX).attr('y', y(1970))
      .attr('width', lBarW).attr('height', y(2000) - y(1970))
      .attr('rx', 3)
      .attr('fill', COLOR.blau).attr('opacity', 0.06)
      .style('pointer-events', 'none');
    lRect
      .on('mouseenter', e => { tooltip.show(e, '<strong>Graz</strong> (Lehrstätte)<br>1970\u20132000<br>Professur für Liedinterpretation, KUG'); lRect.attr('opacity', 0.4); })
      .on('mousemove', e => tooltip.move(e))
      .on('mouseleave', () => { tooltip.hide(); lRect.attr('opacity', 0.15); });
  }

  // ---- Life-line: vertical stays + diagonal moves ----
  const lineGroup = svg.append('g').attr('class', 'life-line');

  // Draw vertical stay segments
  LIFE_SEGMENTS.filter(s => s.type === 'stay').forEach(seg => {
    const cx = x(seg.ort) + bandW / 2;
    const line = lineGroup.append('line')
      .attr('x1', cx).attr('x2', cx)
      .attr('y1', y(seg.von)).attr('y2', y(seg.bis))
      .attr('stroke', COLOR.blau).attr('stroke-width', 2.5)
      .attr('stroke-opacity', 0.6)
      .style('cursor', 'pointer');
    line
      .on('mouseenter', e => {
        tooltip.show(e, `<strong>Wohnort: ${seg.ort}</strong><br>${seg.von}\u2013${seg.bis}`);
        line.attr('stroke-opacity', 0.9).attr('stroke-width', 3.5);
      })
      .on('mousemove', e => tooltip.move(e))
      .on('mouseleave', () => {
        tooltip.hide();
        line.attr('stroke-opacity', 0.6).attr('stroke-width', 2.5);
      });
  });

  // Draw diagonal move segments + dots + labels
  const moveEvents = data.mobilitaet || [];
  LIFE_SEGMENTS.filter(s => s.type === 'move').forEach(seg => {
    const fromX = x(seg.von) + bandW / 2;
    const toX = x(seg.nach) + bandW / 2;
    const yy = y(seg.jahr);
    const color = MOB_COLOR[seg.form] || COLOR.subtle;
    const isForced = seg.form === 'erzwungen';
    const strokeW = isForced ? 3 : 2;
    const dashArr = seg.form === 'lebensstil' ? '6,3' : 'none';

    // Find matching mobility event for tooltip data
    const mobEvent = moveEvents.find(m =>
      m.von === seg.von && m.nach === seg.nach && m.jahr === seg.jahr
    );

    // Diagonal line
    const diag = lineGroup.append('line')
      .attr('x1', fromX).attr('x2', toX)
      .attr('y1', yy).attr('y2', yy)
      .attr('stroke', color).attr('stroke-width', strokeW)
      .attr('stroke-dasharray', dashArr)
      .attr('stroke-opacity', 0.8)
      .style('cursor', 'pointer');

    // Dot at junction
    lineGroup.append('circle')
      .attr('cx', toX).attr('cy', yy).attr('r', 4)
      .attr('fill', color).attr('fill-opacity', 0.9)
      .attr('stroke', '#fff').attr('stroke-width', 1)
      .style('pointer-events', 'none');

    // Year label
    lineGroup.append('text')
      .attr('x', Math.max(fromX, toX) + 8).attr('y', yy + 3)
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-size', '8px')
      .attr('fill', color)
      .attr('font-weight', isForced ? '700' : '400')
      .style('pointer-events', 'none')
      .text(seg.jahr);

    // Tooltip with phase context
    const desc = mobEvent?.beschreibung || '';
    const ctx = mobEvent?.kontext || '';
    const label = MOB_LABEL[seg.form] || seg.form;
    const phase = phases.find(p => seg.jahr >= p.von && seg.jahr < p.bis);
    const phaseHtml = phase
      ? `<div class="lp-tooltip__phase"><span class="lp-tooltip__phase-badge">${phase.id}</span> ${phase.label}</div>`
      : '';
    const tipHtml = [
      `<div class="lp-tooltip__header">${seg.jahr}: ${seg.von} \u2192 ${seg.nach}</div>`,
      `<div class="lp-tooltip__type" style="color:${color}">${label}</div>`,
      desc ? `<div class="lp-tooltip__desc">${desc}</div>` : '',
      phaseHtml,
      ctx ? `<div class="lp-tooltip__kontext">${ctx}</div>` : '',
    ].filter(Boolean).join('');

    diag
      .on('mouseenter', e => {
        tooltip.show(e, tipHtml);
        diag.attr('stroke-opacity', 1).attr('stroke-width', strokeW + 1.5);
      })
      .on('mousemove', e => tooltip.move(e))
      .on('mouseleave', () => {
        tooltip.hide();
        diag.attr('stroke-opacity', 0.8).attr('stroke-width', strokeW);
      });
  });

  // ---- Auftritte Dots ----
  const auftritte = data.auftritte || [];
  const mainCities = new Set(LOCATIONS);
  const buckets = new Map();
  for (const a of auftritte) {
    if (!a.ort || !mainCities.has(a.ort) || !a.jahr) continue;
    const key = `${a.ort}|${a.jahr}`;
    if (!buckets.has(key)) buckets.set(key, { ort: a.ort, jahr: a.jahr, items: [] });
    buckets.get(key).items.push(a);
  }

  const dotsGroup = svg.append('g').attr('class', 'auftritte-dots');
  for (const [, bucket] of buckets) {
    const cx = x(bucket.ort) + bandW / 2;
    const cy = y(bucket.jahr);
    const totalDocs = bucket.items.reduce((sum, a) => sum + (a.dokumente?.length || 0), 0);
    const r = Math.min(2.5 + totalDocs * 0.5, 6);
    const isEngagement = bucket.ort === 'Wien' || bucket.ort === 'Graz' || bucket.ort === 'Lemberg';
    const dotColor = isEngagement ? COLOR.blau : COLOR.gold;

    const dot = dotsGroup.append('circle')
      .attr('cx', cx).attr('cy', cy).attr('r', r)
      .attr('fill', dotColor).attr('fill-opacity', 0.4)
      .attr('stroke', dotColor).attr('stroke-width', 0.8).attr('stroke-opacity', 0.3)
      .style('cursor', 'pointer');

    const werkList = bucket.items
      .filter(a => a.werk).map(a => a.werk + (a.komponist ? ` (${a.komponist})` : '')).join(', ');
    const count = bucket.items.length;
    const docLabel = totalDocs === 1 ? '1 Dokument' : `${totalDocs} Dokumente`;
    const dotPhase = phases.find(p => bucket.jahr >= p.von && bucket.jahr < p.bis);
    const phaseTag = dotPhase ? ` \u00b7 ${dotPhase.id}` : '';
    const tipLines = [
      `<strong>${bucket.ort}</strong> (${bucket.jahr}${phaseTag})`,
      count > 1 ? `${count} Auftritte` : (werkList || bucket.items[0]?.titel?.slice(0, 60) || '1 Auftritt'),
      werkList && count > 1 ? `<span style="font-size:0.65rem">${werkList}</span>` : '',
      docLabel,
    ].filter(Boolean);

    dot
      .on('mouseenter', e => {
        tooltip.show(e, tipLines.join('<br>'));
        dot.attr('fill-opacity', 0.7).attr('stroke-opacity', 0.6);
      })
      .on('mousemove', e => tooltip.move(e))
      .on('mouseleave', () => {
        tooltip.hide();
        dot.attr('fill-opacity', 0.4).attr('stroke-opacity', 0.3);
      });
  }

  // ---- Hover Highlight Line (horizontal, full width) ----
  const highlightLine = svg.append('line')
    .attr('x1', 0).attr('x2', chartW)
    .attr('y1', 0).attr('y2', 0)
    .attr('stroke', COLOR.subtle).attr('stroke-width', 1)
    .attr('stroke-opacity', 0)
    .style('pointer-events', 'none');

  let netzHighlight = null;
  let repHighlight = null;

  svg.on('mousemove', function(event) {
    const [, mouseY] = d3.pointer(event);
    if (mouseY >= MARGIN.top && mouseY <= CHART_H - MARGIN.bottom) {
      highlightLine
        .attr('y1', mouseY).attr('y2', mouseY)
        .attr('stroke-opacity', 0.5);
      if (netzHighlight) netzHighlight.attr('y1', mouseY).attr('y2', mouseY).attr('stroke-opacity', 0.5);
      if (repHighlight) repHighlight.attr('y1', mouseY).attr('y2', mouseY).attr('stroke-opacity', 0.5);
    }
  });
  svg.on('mouseleave', function() {
    highlightLine.attr('stroke-opacity', 0);
    if (netzHighlight) netzHighlight.attr('stroke-opacity', 0);
    if (repHighlight) repHighlight.attr('stroke-opacity', 0);
  });

  // ---- Netzwerk Facette (left, 70px) ----
  const netzwerk = data.netzwerk || [];
  const maxIntensity = d3.max(netzwerk, d => d.intensitaet) || 1;
  const netzSvg = d3.select(netzContainerEl)
    .append('svg')
    .attr('width', 70)
    .attr('height', CHART_H)
    .style('display', 'block');

  netzwerk.forEach(d => {
    const [vonStr, bisStr] = d.periode.split('-');
    const von = +vonStr, bis = +bisStr;
    const y1 = y(von), y2 = y(bis);
    const barW = (d.intensitaet / maxIntensity) * 60;
    const barH = y2 - y1 - 2;

    netzSvg.append('rect')
      .attr('x', 70 - barW).attr('y', y1 + 1)
      .attr('width', barW).attr('height', Math.max(barH, 2))
      .attr('rx', 2)
      .attr('fill', COLOR.blau)
      .attr('opacity', 0.1 + (d.intensitaet / maxIntensity) * 0.4);

    const textX = barW > 20 ? 70 - barW + 4 : 70 - barW - 2;
    const anchor = barW > 20 ? 'start' : 'end';
    netzSvg.append('text')
      .attr('x', textX).attr('y', (y1 + y2) / 2 + 3)
      .attr('text-anchor', anchor)
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-size', '7px')
      .attr('fill', COLOR.blau)
      .attr('opacity', 0.7)
      .text(d.intensitaet);
  });

  netzHighlight = netzSvg.append('line')
    .attr('x1', 0).attr('x2', 70)
    .attr('y1', 0).attr('y2', 0)
    .attr('stroke', COLOR.subtle).attr('stroke-width', 1)
    .attr('stroke-opacity', 0)
    .style('pointer-events', 'none');

  // ---- Repertoire Facette (right, 110px) ----
  const repertoire = data.repertoire || [];
  const maxDocs = d3.max(repertoire, r => r.dokumente) || 1;
  const repSvg = d3.select(repContainerEl)
    .append('svg')
    .attr('width', 110)
    .attr('height', CHART_H)
    .style('display', 'block');

  const repSorted = [...repertoire].sort((a, b) => a.von - b.von);
  const repBarGap = 4;
  const repBarMaxW = 25;

  repSorted.forEach((rep, i) => {
    const barW = Math.max((rep.dokumente / maxDocs) * repBarMaxW, 4);
    const barX = 6 + i * (repBarMaxW + repBarGap);
    const yTop = y(Math.max(rep.von, 1919));
    const yBot = y(Math.min(rep.bis, 2009));

    const rect = repSvg.append('rect')
      .attr('x', barX).attr('y', yTop)
      .attr('width', barW).attr('height', yBot - yTop)
      .attr('rx', 2)
      .attr('fill', rep.farbe).attr('opacity', 0.6)
      .style('cursor', 'pointer');

    repSvg.append('text')
      .attr('x', barX + barW / 2).attr('y', yTop - 4)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-size', '7px')
      .attr('fill', rep.farbe)
      .attr('font-weight', '500')
      .text(rep.komponist);

    rect
      .on('mouseenter', e => {
        const rRect = repContainerEl.getBoundingClientRect();
        const fakeEvent = {
          clientX: rRect.left + barX + barW / 2,
          clientY: e.clientY,
        };
        tooltip.show(fakeEvent, `<strong>${rep.komponist}</strong><br>${rep.von}\u2013${rep.bis}<br>${rep.dokumente} Dokumente`);
        rect.attr('opacity', 0.85);
      })
      .on('mousemove', e => {
        tooltip.move({ clientX: e.clientX, clientY: e.clientY });
      })
      .on('mouseleave', () => { tooltip.hide(); rect.attr('opacity', 0.6); });
  });

  repHighlight = repSvg.append('line')
    .attr('x1', 0).attr('x2', 110)
    .attr('y1', 0).attr('y2', 0)
    .attr('stroke', COLOR.subtle).attr('stroke-width', 1)
    .attr('stroke-opacity', 0)
    .style('pointer-events', 'none');

  // ---- Coverage Footer ----
  if (coverageEl) {
    coverageEl.textContent =
      `${data.orte.length} Orte, ${data.mobilitaet.length} Mobilitätsereignisse, ${auftritte.length} Auftritte \u00b7 ` +
      `${netzwerk.length} Netzwerk-Perioden, ${repertoire.length} Repertoire-Schwerpunkte`;
  }
}

// ---- SPA Entry Point ----
export async function renderLebenspartitur(_store, container) {
  container.innerHTML = '';

  // Build DOM structure inside container
  const toolbar = document.createElement('div');
  toolbar.className = 'lp-toolbar';
  toolbar.innerHTML = '<span class="lp-toolbar__title">Lebenspartitur</span>';
  container.appendChild(toolbar);

  const grid = document.createElement('div');
  grid.className = 'lp-grid';

  // Netzwerk column
  const netzCol = document.createElement('div');
  netzCol.className = 'lp-grid__netzwerk';
  netzCol.innerHTML = '<div class="lp-facet-label">Netzwerk</div>';
  const netzContainer = document.createElement('div');
  netzContainer.className = 'lp-netzwerk-container';
  netzCol.appendChild(netzContainer);

  // Chart column
  const chartCol = document.createElement('div');
  chartCol.className = 'lp-grid__chart';
  const chartContainer = document.createElement('div');
  chartContainer.className = 'lp-chart-container';
  chartContainer.style.position = 'relative';
  const tooltipDiv = document.createElement('div');
  tooltipDiv.className = 'lp-tooltip';
  chartCol.appendChild(chartContainer);
  chartCol.appendChild(tooltipDiv);

  // Repertoire column
  const repCol = document.createElement('div');
  repCol.className = 'lp-grid__repertoire';
  repCol.innerHTML = '<div class="lp-facet-label">Repertoire</div>';
  const repContainer = document.createElement('div');
  repContainer.className = 'lp-repertoire-container';
  repCol.appendChild(repContainer);

  grid.appendChild(netzCol);
  grid.appendChild(chartCol);
  grid.appendChild(repCol);
  container.appendChild(grid);

  // Legend
  const legend = document.createElement('div');
  legend.className = 'lp-legend';
  legend.innerHTML = [
    `<span class="lp-legend__item"><span class="lp-legend__swatch" style="background:${COLOR.blau};opacity:0.6"></span> Wohnort</span>`,
    `<span class="lp-legend__item"><span class="lp-legend__swatch" style="background:${COLOR.gold};opacity:0.4"></span> Aufführungsort</span>`,
    `<span class="lp-legend__item"><span class="lp-legend__swatch" style="background:${MOB_COLOR.erzwungen}"></span> Erzwungene Mob.</span>`,
    `<span class="lp-legend__item"><span class="lp-legend__swatch" style="background:${MOB_COLOR.geografisch}"></span> Geografische Mob.</span>`,
    `<span class="lp-legend__item"><span class="lp-legend__swatch" style="background:${MOB_COLOR.lebensstil}"></span> Lebensstil</span>`,
  ].join('');
  container.appendChild(legend);

  // Coverage
  const coverage = document.createElement('div');
  coverage.className = 'lp-coverage';
  container.appendChild(coverage);

  return renderChart({
    chartContainerEl: chartContainer,
    tooltipEl: tooltipDiv,
    netzContainerEl: netzContainer,
    repContainerEl: repContainer,
    coverageEl: coverage,
  });
}

// ---- Standalone Page Entry Point (lebenspartitur.html) ----
async function init() {
  return renderChart({
    chartContainerEl: document.getElementById('chart-container'),
    tooltipEl: document.getElementById('tooltip'),
    netzContainerEl: document.getElementById('netzwerk-container'),
    repContainerEl: document.getElementById('repertoire-container'),
    coverageEl: document.getElementById('coverage'),
  });
}

export { init };
