/** M³GIM Lebensstationen — Scrollytelling Prototype (D3.js) */

import { loadPartitur } from '../data/loader.js';

/* ── Constants ──────────────────────────────────────── */
const MOB_COLORS = {
  erzwungen:    '#8B3A3A',
  geografisch:  '#3D7A5A',
  lebensstil:   '#6B4E8C',
  national:     '#4A6E96',
  bildung:      '#B67D3D'
};

const MOB_LABELS = {
  erzwungen:    'Erzwungene Mobilität',
  geografisch:  'Geografische Mobilität',
  lebensstil:   'Lebensstil-Migration',
  national:     'Nationale Mobilität',
  bildung:      'Bildungs-Mobilität'
};

/* Abstract city positions for mini-maps (relative, 0-1 space) */
const ORT_POS = {
  'Lemberg':   { x: 0.08, y: 0.18 },
  'Wien':      { x: 0.40, y: 0.42 },
  'Graz':      { x: 0.38, y: 0.72 },
  'Bayreuth':  { x: 0.68, y: 0.15 },
  'München':   { x: 0.70, y: 0.45 },
  'Salzburg':  { x: 0.72, y: 0.75 },
  'Zürich':    { x: 0.95, y: 0.42 }
};

const ALL_CITIES = Object.keys(ORT_POS);

async function init() {
  /* ── Data Loading ──────────────────────────────────── */
  const data = await loadPartitur();
  if (!data) {
    document.getElementById('station-content').textContent = 'Fehler beim Laden der Daten.';
    throw new Error('Partitur-Daten nicht verfügbar');
  }
  const { lebensphasen, mobilitaet, auftritte, netzwerk, repertoire } = data;

  /* Sort mobility events by year for interleaving */
  const mobSorted = [...mobilitaet].sort((a, b) => a.jahr - b.jahr);

  /* ── Helper Functions ──────────────────────────────── */

  function auftritteInPhase(phaseId) {
    return auftritte.filter(a => a.phase === phaseId);
  }

  function auftritteAroundYear(year, range = 3) {
    return auftritte.filter(a => a.jahr >= year - range && a.jahr <= year + range);
  }

  function netzwerkForPeriod(year) {
    for (const n of netzwerk) {
      const [von, bis] = n.periode.split('-').map(Number);
      if (year >= von && year <= bis) return n;
    }
    /* fallback: closest period */
    let best = netzwerk[0];
    let bestDist = Infinity;
    for (const n of netzwerk) {
      const mid = n.periode.split('-').map(Number).reduce((a,b) => (a+b)/2);
      const dist = Math.abs(mid - year);
      if (dist < bestDist) { bestDist = dist; best = n; }
    }
    return best;
  }

  function activeRepertoireAt(year) {
    return repertoire.filter(r => r.von <= year && r.bis >= year);
  }

  function auftrittsorteInPhase(phase) {
    const orte = new Set();
    auftritteInPhase(phase.id).forEach(a => {
      if (a.ort) orte.add(a.ort);
    });
    /* also check the orte array for auffuehrungsorte active during the phase */
    data.orte.forEach(o => {
      if (o.typ === 'auffuehrungsort' && o.von <= phase.bis && o.bis >= phase.von) {
        orte.add(o.ort);
      }
    });
    return orte;
  }

  function wohnortInPhase(phase) {
    /* The phase.ort may contain "/" separated cities */
    return phase.ort.split('/').map(s => s.trim());
  }

  /* ── Build narrative text from data ────────────────── */
  function buildNarrativeText(phase) {
    const phaseAuftritte = auftritteInPhase(phase.id);
    const orteSet = auftrittsorteInPhase(phase);
    const wohnorte = wohnortInPhase(phase);

    let parts = [];
    parts.push(phase.beschreibung + '.');

    if (phase.id === 'LP1') {
      /* Kindheit: kontextualisierte Leerstelle */
      parts.push('Aus der Kindheit und Jugend in Lemberg sind keine Aufführungsdokumente überliefert.');
    } else if (phaseAuftritte.length > 0) {
      const orteList = [...orteSet].filter(o => o).slice(0, 4);
      if (orteList.length > 0) {
        parts.push(`In dieser Phase sind ${phaseAuftritte.length} Auftritte dokumentiert, u.\u202Fa. in ${orteList.join(', ')}.`);
      } else {
        parts.push(`In dieser Phase sind ${phaseAuftritte.length} Auftritte im Nachlass dokumentiert.`);
      }
    } else {
      parts.push('Für diese Phase sind keine Auftritte im Nachlass dokumentiert.');
    }

    /* Netzwerk */
    const nw = netzwerkForPeriod((phase.von + phase.bis) / 2);
    if (nw) {
      parts.push(`Die Netzwerk-Intensität liegt bei ${nw.intensitaet} (Periode ${nw.periode}).`);
    }

    /* Komponisten */
    const activeRep = repertoire.filter(r =>
      r.von <= phase.bis && r.bis >= phase.von
    );
    if (activeRep.length > 0) {
      const names = activeRep.map(r => r.komponist);
      parts.push(`Aktives Repertoire: ${names.join(', ')}.`);
    }

    /* LP7 Spätphase: kontextualisierte Quellenlage */
    if (phase.id === 'LP7') {
      parts.push('Die Spätphase ist im Nachlass kaum dokumentiert — der Rückzug aus dem aktiven Bühnenleben spiegelt sich in der Quellenüberlieferung.');
    }

    return parts;
  }

  /* ── Mobility events that transition INTO a phase ─── */
  function mobEventsBeforePhase(phase) {
    return mobSorted.filter(m => m.jahr === phase.von || (m.jahr >= phase.von - 1 && m.jahr <= phase.von));
  }

  function mobEventsInOrAfterPhase(phase) {
    return mobSorted.filter(m => m.jahr >= phase.von && m.jahr <= phase.bis);
  }

  /* ── Assign mobility events to phase boundaries ───── */
  function buildSequence() {
    /*
      We interleave chapters (phases) and wendepunkte (mobility events).
      Each phase gets the mobility events whose year matches the phase start.
      We deduplicate: each mob event is shown only once, before its target phase.
    */
    const usedMob = new Set();
    const sequence = [];

    for (let i = 0; i < lebensphasen.length; i++) {
      const phase = lebensphasen[i];

      /* Mobility events leading into this phase (year = phase.von ± 1, or between prev and this) */
      const prevEnd = i > 0 ? lebensphasen[i - 1].bis : 0;
      const relevantMob = mobSorted.filter(m =>
        !usedMob.has(m) &&
        m.jahr >= prevEnd && m.jahr <= phase.von + 2
      );

      relevantMob.forEach(m => {
        usedMob.add(m);
        sequence.push({ type: 'wendepunkt', data: m });
      });

      sequence.push({ type: 'chapter', data: phase });
    }

    /* Any remaining mob events (e.g. at end of last phase) */
    mobSorted.filter(m => !usedMob.has(m)).forEach(m => {
      /* Insert before the synthese */
      sequence.push({ type: 'wendepunkt', data: m });
    });

    return sequence;
  }

  /* ── Render Content ────────────────────────────────── */
  const container = document.getElementById('station-content');
  const sequence = buildSequence();

  let chapterIndex = 0;

  for (const item of sequence) {
    if (item.type === 'chapter') {
      const phase = item.data;
      const idx = lebensphasen.indexOf(phase);
      const narrative = buildNarrativeText(phase);
      const phaseAuftritte = auftritteInPhase(phase.id);

      const section = document.createElement('section');
      section.className = 'station__chapter';
      section.id = `chapter-${phase.id}`;
      section.dataset.phase = phase.id;

      const orteCount = [...auftrittsorteInPhase(phase)].filter(o=>o).length;
      let statsHtml;
      if (phaseAuftritte.length === 0 && orteCount === 0) {
        statsHtml = `<div class="station__chapter-stats" style="font-style:italic;color:#8A857E">Keine Aufführungsdokumente in dieser Phase überliefert</div>`;
      } else {
        statsHtml = `<div class="station__chapter-stats"><span>Auftritte: <strong>${phaseAuftritte.length}</strong></span><span>Orte: <strong>${orteCount}</strong></span></div>`;
      }

      section.innerHTML = `
        <header class="station__chapter-header">
          <h2 class="station__chapter-title">${phase.label} · ${phase.von}–${phase.bis}</h2>
          <div class="station__chapter-ort">${phase.ort}</div>
        </header>
        <div class="station__chapter-grid">
          <div class="station__chapter-text">
            ${narrative.map(p => `<p>${p}</p>`).join('')}
            ${statsHtml}
          </div>
          <svg class="station__chapter-map" id="map-${phase.id}" viewBox="0 0 200 150"></svg>
        </div>
      `;
      container.appendChild(section);

      /* Render mini-map */
      renderMiniMap(phase);

      chapterIndex++;
    } else {
      /* Wendepunkt */
      const mob = item.data;
      const color = MOB_COLORS[mob.form] || '#999';
      const bgColor = color + '0A'; /* ~4% opacity via hex alpha */

      const nw = netzwerkForPeriod(mob.jahr);
      const nearAuftritte = auftritteAroundYear(mob.jahr);
      const activeRep = activeRepertoireAt(mob.jahr);

      const section = document.createElement('section');
      section.className = 'station__wendepunkt';
      section.dataset.year = mob.jahr;

      section.innerHTML = `
        <div class="station__wendepunkt-inner" style="border-left-color: ${color}; background: ${bgColor};">
          <span class="station__wendepunkt-badge" style="color: ${color}; background: ${color}15; border: 1px solid ${color}30;">
            ${MOB_LABELS[mob.form] || mob.form}
          </span>
          <div class="station__wendepunkt-route">${mob.von} → ${mob.nach}</div>
          <div class="station__wendepunkt-year">${mob.jahr}</div>
          <p class="station__wendepunkt-desc">${mob.beschreibung}</p>
          ${mob.kontext ? `<p class="station__wendepunkt-kontext">${mob.kontext}</p>` : ''}
          <div class="station__wendepunkt-cards">
            <div class="station__stat-card">
              <div class="station__stat-card-label">Netzwerk</div>
              <div class="station__stat-card-value">${nw ? nw.intensitaet : '—'}</div>
              <div class="station__stat-card-detail">${nw ? nw.periode : ''}</div>
            </div>
            <div class="station__stat-card">
              <div class="station__stat-card-label">Auftritte</div>
              <div class="station__stat-card-value">${nearAuftritte.length}</div>
              <div class="station__stat-card-detail">±3 Jahre</div>
            </div>
            <div class="station__stat-card">
              <div class="station__stat-card-label">Repertoire</div>
              <div class="station__stat-card-value">${activeRep.length}</div>
              <div class="station__stat-card-detail">${activeRep.map(r => r.komponist).join(', ') || '—'}</div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(section);
    }
  }

  /* ── Mini-Map Rendering ────────────────────────────── */
  function renderMiniMap(phase) {
    const svg = d3.select(`#map-${phase.id}`);
    const w = 200, h = 150;
    const wohnorte = wohnortInPhase(phase);
    const auffOrte = auftrittsorteInPhase(phase);

    for (const city of ALL_CITIES) {
      const pos = ORT_POS[city];
      const cx = pos.x * w;
      const cy = pos.y * h;

      const isWohnort = wohnorte.includes(city);
      const isAuftritte = auffOrte.has(city);

      let r, fill, opacity;
      if (isWohnort) {
        r = 14;
        fill = '#004A8F';
        opacity = 0.7;
      } else if (isAuftritte) {
        r = 8;
        fill = '#9A7B4F';
        opacity = 0.6;
      } else {
        r = 4;
        fill = '#8A857E';
        opacity = 0.2;
      }

      svg.append('circle')
        .attr('cx', cx).attr('cy', cy)
        .attr('r', r)
        .attr('fill', fill)
        .attr('opacity', opacity);

      /* City label */
      svg.append('text')
        .attr('x', cx)
        .attr('y', cy + r + 10)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Inter, sans-serif')
        .attr('font-size', '7px')
        .attr('fill', isWohnort ? '#004A8F' : (isAuftritte ? '#9A7B4F' : '#8A857E'))
        .attr('opacity', isWohnort || isAuftritte ? 1 : 0.4)
        .text(city);

      /* Auftritt count in active circle */
      if (isWohnort) {
        const count = auftritteInPhase(phase.id).filter(a => a.ort && a.ort.includes(city)).length;
        if (count > 0) {
          svg.append('text')
            .attr('x', cx).attr('y', cy + 4)
            .attr('text-anchor', 'middle')
            .attr('font-family', 'JetBrains Mono, monospace')
            .attr('font-size', '9px')
            .attr('font-weight', '600')
            .attr('fill', '#fff')
            .text(count);
        }
      }
    }
  }

  /* ── Sticky Mini-Timeline ──────────────────────────── */
  function renderTimeline() {
    const svg = d3.select('#timeline-svg');
    const bbox = document.querySelector('.station-timeline__svg').getBoundingClientRect();
    const w = bbox.width;
    const h = 44;

    svg.attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'none');

    const totalSpan = 2009 - 1919;
    const x = d3.scaleLinear().domain([1919, 2009]).range([12, w - 12]);
    const lineY = 18;

    /* Background line */
    svg.append('line')
      .attr('x1', x(1919)).attr('x2', x(2009))
      .attr('y1', lineY).attr('y2', lineY)
      .attr('stroke', '#E0DCD6').attr('stroke-width', 2);

    /* Phase segments */
    lebensphasen.forEach((phase, i) => {
      const x1 = x(phase.von);
      const x2 = x(phase.bis);

      svg.append('rect')
        .attr('class', `tl-segment tl-segment-${phase.id}`)
        .attr('x', x1).attr('y', lineY - 6)
        .attr('width', x2 - x1).attr('height', 12)
        .attr('rx', 2)
        .attr('fill', i % 2 === 0 ? '#F5F0E8' : 'transparent')
        .attr('opacity', 0.6);

      /* Phase label under line */
      svg.append('text')
        .attr('x', (x1 + x2) / 2)
        .attr('y', lineY + 18)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-size', '7px')
        .attr('fill', '#8A857E')
        .text(phase.id);
    });

    /* Mobility event dots — deduplicate by year */
    const mobYears = [...new Set(mobSorted.map(m => m.jahr))];
    mobYears.forEach(year => {
      const events = mobSorted.filter(m => m.jahr === year);
      const color = MOB_COLORS[events[0].form] || '#999';

      svg.append('circle')
        .attr('class', `tl-dot tl-dot-${year}`)
        .attr('cx', x(year)).attr('cy', lineY)
        .attr('r', 4)
        .attr('fill', color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);
    });
  }

  renderTimeline();

  /* ── Scroll Tracking (IntersectionObserver) ─────── */
  function setupScrollTracking() {
    const label = document.getElementById('timeline-label');
    const svg = d3.select('#timeline-svg');
    let activePhaseId = null;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const el = entry.target;
          const phaseId = el.dataset.phase;
          if (phaseId && phaseId !== activePhaseId) {
            activePhaseId = phaseId;
            const phase = lebensphasen.find(p => p.id === phaseId);
            if (phase) {
              label.textContent = `${phase.id} · ${phase.von}–${phase.bis}`;
              label.classList.add('station-timeline__label--active');

              /* Highlight active segment */
              svg.selectAll('.tl-segment')
                .attr('fill', function() {
                  const cls = d3.select(this).attr('class');
                  return cls.includes(phaseId) ? '#004A8F' : (cls.match(/tl-segment-LP(\d)/) ? (parseInt(cls.match(/LP(\d)/)[1]) % 2 === 1 ? '#F5F0E8' : 'transparent') : 'transparent');
                })
                .attr('opacity', function() {
                  const cls = d3.select(this).attr('class');
                  return cls.includes(phaseId) ? 0.15 : 0.6;
                });
            }
          }
        }
      }
    }, { threshold: 0.5 });

    document.querySelectorAll('.station__chapter').forEach(el => {
      observer.observe(el);
    });
  }

  setupScrollTracking();

  /* ── Synthese — Mini-Lebenspartitur (Bump-Chart) ──── */
  function renderSynthese() {
    const SYNTH_H = 500;
    const SYNTH_LOCATIONS = ['Lemberg', 'Wien', 'Graz', 'Bayreuth', 'München', 'Salzburg', 'Zürich'];
    const SYNTH_BREAK_YEAR = 1975;
    const SYNTH_BREAK_RATIO = 0.74;

    const SYNTH_LIFE_SEGMENTS = [
      { type: 'stay', ort: 'Lemberg', von: 1919, bis: 1944 },
      { type: 'move', von: 'Lemberg', nach: 'Wien', jahr: 1944, form: 'erzwungen' },
      { type: 'move', von: 'Wien', nach: 'Graz', jahr: 1945, form: 'geografisch' },
      { type: 'stay', ort: 'Graz', von: 1945, bis: 1950 },
      { type: 'move', von: 'Graz', nach: 'Wien', jahr: 1950, form: 'geografisch' },
      { type: 'stay', ort: 'Wien', von: 1950, bis: 1970 },
      { type: 'move', von: 'Wien', nach: 'Zürich', jahr: 1970, form: 'lebensstil' },
      { type: 'stay', ort: 'Zürich', von: 1970, bis: 2009 },
    ];

    const MARGIN = { top: 38, right: 8, bottom: 20, left: 8 };
    const COLOR = {
      blau: '#004A8F', gold: '#9A7B4F', subtle: '#C4B49A',
      cream: '#F5F0E8', grau: '#5C5651'
    };

    /* ---- Tooltip helpers ---- */
    const tipEl = document.getElementById('synth-tooltip');
    function showTip(event, html) {
      tipEl.innerHTML = html;
      tipEl.classList.add('synth-tooltip--visible');
      moveTip(event);
    }
    function moveTip(event) {
      const box = document.getElementById('synthese-partitur').getBoundingClientRect();
      let tx = event.clientX - box.left + 12;
      let ty = event.clientY - box.top + 12;
      if (tx + 200 > box.width) tx = tx - 220;
      if (ty + 80 > box.height) ty = ty - 100;
      tipEl.style.left = tx + 'px';
      tipEl.style.top = ty + 'px';
    }
    function hideTip() { tipEl.classList.remove('synth-tooltip--visible'); }

    /* ---- Scales ---- */
    const chartEl = document.getElementById('synth-chart');
    const chartW = chartEl.clientWidth || 500;
    const usableH = SYNTH_H - MARGIN.top - MARGIN.bottom;

    const yScale = d3.scaleLinear()
      .domain([1919, SYNTH_BREAK_YEAR, 2009])
      .range([MARGIN.top, MARGIN.top + usableH * SYNTH_BREAK_RATIO, SYNTH_H - MARGIN.bottom]);

    const xScale = d3.scaleBand()
      .domain(SYNTH_LOCATIONS)
      .range([MARGIN.left, chartW - MARGIN.right])
      .padding(0.15);

    const bandW = xScale.bandwidth();

    /* =========  MAIN CHART  ========= */
    const svg = d3.select('#synth-chart')
      .append('svg')
      .attr('width', chartW)
      .attr('height', SYNTH_H)
      .style('display', 'block');

    /* Phase bands (horizontal) */
    const phaseColors = ['#F5F0E8', 'transparent'];
    lebensphasen.forEach((p, i) => {
      svg.append('rect')
        .attr('x', 0).attr('y', yScale(p.von))
        .attr('width', chartW).attr('height', yScale(p.bis) - yScale(p.von))
        .attr('fill', phaseColors[i % 2]).attr('opacity', 0.5);
    });

    /* Column backgrounds */
    SYNTH_LOCATIONS.forEach((loc, i) => {
      svg.append('rect')
        .attr('x', xScale(loc)).attr('y', MARGIN.top)
        .attr('width', bandW).attr('height', SYNTH_H - MARGIN.top - MARGIN.bottom)
        .attr('fill', i % 2 === 0 ? COLOR.cream : 'transparent')
        .attr('opacity', 0.35);
    });

    /* Ort labels (top) */
    SYNTH_LOCATIONS.forEach(loc => {
      svg.append('text')
        .attr('x', xScale(loc) + bandW / 2)
        .attr('y', MARGIN.top - 6)
        .attr('text-anchor', 'end')
        .attr('transform', `rotate(-40, ${xScale(loc) + bandW / 2}, ${MARGIN.top - 6})`)
        .attr('font-family', "'Inter', sans-serif")
        .attr('font-size', '9px')
        .attr('font-weight', '500')
        .attr('fill', COLOR.grau)
        .text(loc);
    });

    /* Year ticks */
    const yearTicks = [1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000];
    yearTicks.forEach(yr => {
      const yy = yScale(yr);
      svg.append('line')
        .attr('x1', 0).attr('x2', chartW)
        .attr('y1', yy).attr('y2', yy)
        .attr('stroke', '#E0DCD6').attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '2,6');
      svg.append('text')
        .attr('x', 3).attr('y', yy - 2)
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('font-size', '7px')
        .attr('fill', '#8A857E')
        .text(yr);
    });

    /* Scale break indicator */
    const breakY = yScale(SYNTH_BREAK_YEAR);
    svg.append('line')
      .attr('x1', 0).attr('x2', chartW)
      .attr('y1', breakY).attr('y2', breakY)
      .attr('stroke', '#E0DCD6').attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');
    const amp = 4;
    svg.append('path')
      .attr('d', `M${chartW / 2 - 12},${breakY} l4,-${amp} l8,${amp * 2} l4,-${amp}`)
      .attr('fill', 'none').attr('stroke', '#8A857E').attr('stroke-width', 1.2);

    /* Aufführungsort bars (gold, translucent) */
    const auffOrte = (data.orte || []).filter(o => o.typ === 'auffuehrungsort');
    auffOrte.forEach(o => {
      if (!SYNTH_LOCATIONS.includes(o.ort)) return;
      const barW2 = bandW * 0.55;
      const barX2 = xScale(o.ort) + (bandW - barW2) / 2;
      svg.append('rect')
        .attr('x', barX2).attr('y', yScale(o.von))
        .attr('width', barW2).attr('height', yScale(o.bis) - yScale(o.von))
        .attr('rx', 2)
        .attr('fill', COLOR.gold).attr('opacity', 0.2);
    });

    /* Lehrstätte: Graz 1970-2000 (dashed) */
    {
      const lBarW = bandW * 0.45;
      const lBarX = xScale('Graz') + (bandW - lBarW) / 2;
      svg.append('rect')
        .attr('x', lBarX).attr('y', yScale(1970))
        .attr('width', lBarW).attr('height', yScale(2000) - yScale(1970))
        .attr('rx', 2)
        .attr('fill', COLOR.blau).attr('opacity', 0.06);
      svg.append('rect')
        .attr('x', lBarX).attr('y', yScale(1970))
        .attr('width', lBarW).attr('height', yScale(2000) - yScale(1970))
        .attr('rx', 2)
        .attr('fill', 'none')
        .attr('stroke', COLOR.blau).attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '4,3')
        .attr('stroke-opacity', 0.4);
    }

    /* Life-line: stays (vertical) + moves (diagonal) */
    const lineG = svg.append('g');
    SYNTH_LIFE_SEGMENTS.filter(s => s.type === 'stay').forEach(seg => {
      const cx = xScale(seg.ort) + bandW / 2;
      const line = lineG.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', yScale(seg.von)).attr('y2', yScale(seg.bis))
        .attr('stroke', COLOR.blau).attr('stroke-width', 2.5)
        .attr('stroke-opacity', 0.6)
        .style('cursor', 'pointer');
      line
        .on('mouseenter', e => {
          showTip(e, `<strong>Wohnort: ${seg.ort}</strong><br>${seg.von}\u2013${seg.bis}`);
          line.attr('stroke-opacity', 0.9).attr('stroke-width', 3.5);
        })
        .on('mousemove', e => moveTip(e))
        .on('mouseleave', () => { hideTip(); line.attr('stroke-opacity', 0.6).attr('stroke-width', 2.5); });
    });

    SYNTH_LIFE_SEGMENTS.filter(s => s.type === 'move').forEach(seg => {
      const fromX = xScale(seg.von) + bandW / 2;
      const toX = xScale(seg.nach) + bandW / 2;
      const yy = yScale(seg.jahr);
      const color = MOB_COLORS[seg.form] || COLOR.subtle;
      const isForced = seg.form === 'erzwungen';
      const strokeW = isForced ? 2.5 : 1.8;
      const dash = seg.form === 'lebensstil' ? '5,3' : 'none';

      const diag = lineG.append('line')
        .attr('x1', fromX).attr('x2', toX)
        .attr('y1', yy).attr('y2', yy)
        .attr('stroke', color).attr('stroke-width', strokeW)
        .attr('stroke-dasharray', dash)
        .attr('stroke-opacity', 0.8)
        .style('cursor', 'pointer');

      lineG.append('circle')
        .attr('cx', toX).attr('cy', yy).attr('r', 3)
        .attr('fill', color).attr('fill-opacity', 0.9)
        .attr('stroke', '#fff').attr('stroke-width', 1)
        .style('pointer-events', 'none');

      /* Tooltip for move */
      const mobEvent = mobilitaet.find(m => m.von === seg.von && m.nach === seg.nach && m.jahr === seg.jahr);
      const desc = mobEvent?.beschreibung || '';
      const label = MOB_LABELS[seg.form] || seg.form;
      diag
        .on('mouseenter', e => {
          showTip(e, `<strong>${seg.jahr}: ${seg.von} \u2192 ${seg.nach}</strong><br>${label}${desc ? '<br><em>' + desc + '</em>' : ''}`);
          diag.attr('stroke-opacity', 1).attr('stroke-width', strokeW + 1.5);
        })
        .on('mousemove', e => moveTip(e))
        .on('mouseleave', () => { hideTip(); diag.attr('stroke-opacity', 0.8).attr('stroke-width', strokeW); });
    });

    /* Auftritte dots (aggregated per ort+year) */
    const mainCities = new Set(SYNTH_LOCATIONS);
    const buckets = new Map();
    for (const a of auftritte) {
      if (!a.ort || !mainCities.has(a.ort) || !a.jahr) continue;
      const key = `${a.ort}|${a.jahr}`;
      if (!buckets.has(key)) buckets.set(key, { ort: a.ort, jahr: a.jahr, items: [] });
      buckets.get(key).items.push(a);
    }
    for (const [, bucket] of buckets) {
      const cx = xScale(bucket.ort) + bandW / 2;
      const cy = yScale(bucket.jahr);
      const totalDocs = bucket.items.reduce((s, a) => s + (a.dokumente?.length || 0), 0);
      const r = Math.min(2 + totalDocs * 0.4, 5);
      const isEngagement = bucket.ort === 'Wien' || bucket.ort === 'Graz' || bucket.ort === 'Lemberg';
      const dotColor = isEngagement ? COLOR.blau : COLOR.gold;

      const dot = svg.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', r)
        .attr('fill', dotColor).attr('fill-opacity', 0.4)
        .attr('stroke', dotColor).attr('stroke-width', 0.6).attr('stroke-opacity', 0.3)
        .style('cursor', 'pointer');

      const count = bucket.items.length;
      const werkList = bucket.items.filter(a => a.werk).map(a => a.werk).join(', ');
      dot
        .on('mouseenter', e => {
          showTip(e, `<strong>${bucket.ort}</strong> (${bucket.jahr})<br>${count > 1 ? count + ' Auftritte' : werkList || '1 Auftritt'}<br>${totalDocs} Dokumente`);
          dot.attr('fill-opacity', 0.7);
        })
        .on('mousemove', e => moveTip(e))
        .on('mouseleave', () => { hideTip(); dot.attr('fill-opacity', 0.4); });
    }

    /* Hover highlight line (main chart) */
    const hlMain = svg.append('line')
      .attr('x1', 0).attr('x2', chartW)
      .attr('y1', 0).attr('y2', 0)
      .attr('stroke', COLOR.subtle).attr('stroke-width', 1)
      .attr('stroke-opacity', 0)
      .style('pointer-events', 'none');

    /* =========  NETZWERK FACETTE (60px)  ========= */
    const netzSvg = d3.select('#synth-netzwerk')
      .append('svg')
      .attr('width', 60)
      .attr('height', SYNTH_H)
      .style('display', 'block');

    /* Facette label */
    netzSvg.append('text')
      .attr('x', 30).attr('y', 12)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'Inter', sans-serif")
      .attr('font-size', '8px')
      .attr('font-style', 'italic')
      .attr('fill', '#8A857E')
      .text('Netzwerk');

    const maxIntensity = d3.max(netzwerk, d => d.intensitaet) || 1;
    netzwerk.forEach(d => {
      const [vonStr, bisStr] = d.periode.split('-');
      const von2 = +vonStr, bis2 = +bisStr;
      const y1 = yScale(von2), y2 = yScale(bis2);
      const barW3 = (d.intensitaet / maxIntensity) * 50;
      const barH3 = y2 - y1 - 2;

      netzSvg.append('rect')
        .attr('x', 60 - barW3).attr('y', y1 + 1)
        .attr('width', barW3).attr('height', Math.max(barH3, 2))
        .attr('rx', 2)
        .attr('fill', COLOR.blau)
        .attr('opacity', 0.1 + (d.intensitaet / maxIntensity) * 0.4);

      const textX = barW3 > 18 ? 60 - barW3 + 3 : 60 - barW3 - 2;
      const anchor = barW3 > 18 ? 'start' : 'end';
      netzSvg.append('text')
        .attr('x', textX).attr('y', (y1 + y2) / 2 + 3)
        .attr('text-anchor', anchor)
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('font-size', '7px')
        .attr('fill', COLOR.blau)
        .attr('opacity', 0.7)
        .text(d.intensitaet);
    });

    const hlNetz = netzSvg.append('line')
      .attr('x1', 0).attr('x2', 60)
      .attr('y1', 0).attr('y2', 0)
      .attr('stroke', COLOR.subtle).attr('stroke-width', 1)
      .attr('stroke-opacity', 0)
      .style('pointer-events', 'none');

    /* =========  REPERTOIRE FACETTE (100px)  ========= */
    const repSvg = d3.select('#synth-repertoire')
      .append('svg')
      .attr('width', 100)
      .attr('height', SYNTH_H)
      .style('display', 'block');

    /* Facette label */
    repSvg.append('text')
      .attr('x', 50).attr('y', 12)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'Inter', sans-serif")
      .attr('font-size', '8px')
      .attr('font-style', 'italic')
      .attr('fill', '#8A857E')
      .text('Repertoire');

    const repSorted = [...repertoire].sort((a, b) => a.von - b.von);
    const maxDocs = d3.max(repSorted, r => r.dokumente) || 1;
    const repBarMaxW = 20;
    const repBarGap = 3;

    repSorted.forEach((rep, i) => {
      const barW4 = Math.max((rep.dokumente / maxDocs) * repBarMaxW, 3);
      const barX4 = 5 + i * (repBarMaxW + repBarGap);
      const yTop = yScale(Math.max(rep.von, 1919));
      const yBot = yScale(Math.min(rep.bis, 2009));

      repSvg.append('rect')
        .attr('x', barX4).attr('y', yTop)
        .attr('width', barW4).attr('height', yBot - yTop)
        .attr('rx', 2)
        .attr('fill', rep.farbe).attr('opacity', 0.6);

      repSvg.append('text')
        .attr('x', barX4 + barW4 / 2).attr('y', yTop - 3)
        .attr('text-anchor', 'middle')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('font-size', '6px')
        .attr('fill', rep.farbe)
        .attr('font-weight', '500')
        .text(rep.komponist);
    });

    const hlRep = repSvg.append('line')
      .attr('x1', 0).attr('x2', 100)
      .attr('y1', 0).attr('y2', 0)
      .attr('stroke', COLOR.subtle).attr('stroke-width', 1)
      .attr('stroke-opacity', 0)
      .style('pointer-events', 'none');

    /* =========  HOVER HIGHLIGHT across all 3 columns  ========= */
    svg.on('mousemove', function(event) {
      const [, mouseY] = d3.pointer(event);
      if (mouseY >= MARGIN.top && mouseY <= SYNTH_H - MARGIN.bottom) {
        hlMain.attr('y1', mouseY).attr('y2', mouseY).attr('stroke-opacity', 0.5);
        hlNetz.attr('y1', mouseY).attr('y2', mouseY).attr('stroke-opacity', 0.5);
        hlRep.attr('y1', mouseY).attr('y2', mouseY).attr('stroke-opacity', 0.5);
      }
    });
    svg.on('mouseleave', function() {
      hlMain.attr('stroke-opacity', 0);
      hlNetz.attr('stroke-opacity', 0);
      hlRep.attr('stroke-opacity', 0);
    });
  }

  renderSynthese();
}

export { init };
