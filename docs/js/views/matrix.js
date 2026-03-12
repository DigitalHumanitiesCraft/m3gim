/**
 * M³GIM Matrix View — Person × Lebensphase heatmap (D3.js).
 * Hybrid layout: prominent heatmap for core network, compact list for periphery.
 */

import { aggregateMatrix } from '../data/aggregator.js';
import { PERSONEN_FARBEN, DOKUMENTTYP_LABELS } from '../data/constants.js';
import { selectRecord, navigateToIndex, navigateToView } from '../ui/router.js';
import { el, clear } from '../utils/dom.js';
import { formatSignatur, ensureArray } from '../utils/format.js';

const KATEGORIE_KUERZEL = {
  'Dirigent': 'D', 'Regisseur': 'R', 'Korrepetitor': 'Kr',
  'Kollege': 'Ko', 'Vermittler': 'V', 'Andere': 'A',
  'Komponist': 'Kp', 'Archivsubjekt': '',
};

const MIN_CELL_H = 24;
const MAX_CELL_H = 44;
const CORE_THRESHOLD = 3; // ≥3 docs = core network (heatmap), <3 = periphery (list)

let rendered = false;
let matrixData = null;       // raw aggregated data (unfiltered)
let filteredData = null;     // re-aggregated when facet filters change
let storeRef = null;
let containerRef = null;
let lebensphasen = null;
let activeCategories = new Set(['Dirigent', 'Regisseur', 'Korrepetitor', 'Kollege', 'Vermittler']);
let activeOrt = null;        // null = alle, string = filter on location
let activeDocTyp = null;     // null = alle, string = filter on doc type
let activeDrilldown = null;
let collapsedPhases = new Set();  // for periphery phase-grouping
let peripheryFirstRender = true;

// Collected from data during aggregation
let allOrte = [];            // [{name, count}] sorted
let allDocTypen = [];        // [{id, label, count}] sorted

export function renderMatrix(store, container) {
  if (rendered) return;
  rendered = true;
  storeRef = store;
  containerRef = container;

  clear(container);
  container.appendChild(el('div', { className: 'matrix-loading' }, 'Lade Netzwerkdaten\u2026'));

  // Collect facet options from store
  collectFacetOptions(store);

  // Load partitur.json for Lebensphasen, then aggregate + render
  fetch('./data/partitur.json')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      lebensphasen = data?.lebensphasen || null;
      matrixData = aggregateMatrix(store, lebensphasen);
      filteredData = matrixData;
      clear(container);
      buildUI(container, data);
    })
    .catch(() => {
      matrixData = aggregateMatrix(store, null);
      filteredData = matrixData;
      clear(container);
      buildUI(container, null);
    });
}

/** Collect available locations and doc types from the store for facet dropdowns */
function collectFacetOptions(store) {
  const ortCounts = new Map();
  const typCounts = new Map();
  for (const record of store.allRecords) {
    const locs = ensureArray(record['rico:hasOrHadLocation']);
    for (const loc of locs) {
      const name = loc.name || loc['rico:name'] || '';
      if (name) ortCounts.set(name, (ortCounts.get(name) || 0) + 1);
    }
    const types = ensureArray(record['rico:hasDocumentaryFormType']);
    for (const t of types) {
      const id = (typeof t === 'string' ? t : (t['@id'] || '')).replace('m3gim-dft:', '');
      if (id) typCounts.set(id, (typCounts.get(id) || 0) + 1);
    }
  }
  allOrte = [...ortCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  allDocTypen = [...typCounts.entries()]
    .map(([id, count]) => ({ id, label: DOKUMENTTYP_LABELS[id] || id, count }))
    .sort((a, b) => b.count - a.count);
}

/** Re-aggregate matrix with current ort/typ filters applied to store */
function reAggregate() {
  if (!storeRef) return;
  // Create a filtered store view
  const filteredStore = {
    ...storeRef,
    allRecords: storeRef.allRecords.filter(record => {
      if (activeOrt) {
        const locs = ensureArray(record['rico:hasOrHadLocation']);
        const hasOrt = locs.some(loc => (loc.name || loc['rico:name'] || '') === activeOrt);
        if (!hasOrt) return false;
      }
      if (activeDocTyp) {
        const types = ensureArray(record['rico:hasDocumentaryFormType']);
        const hasTyp = types.some(t => {
          const id = (typeof t === 'string' ? t : (t['@id'] || '')).replace('m3gim-dft:', '');
          return id === activeDocTyp;
        });
        if (!hasTyp) return false;
      }
      return true;
    }),
  };
  filteredData = aggregateMatrix(filteredStore, lebensphasen);
}

function buildUI(container, partiturData) {
  console.group('%c[Matrix]', 'color: #004A8F; font-weight: bold');
  console.log(`${matrixData.personen.length} Kern-Personen, ${matrixData.peripherie?.length || 0} Peripherie`);
  console.log(`Orte: ${allOrte.length}, Dokumenttypen: ${allDocTypen.length}`);
  console.log(`Lebensphasen: ${lebensphasen ? lebensphasen.length : 'keine'}`);
  matrixData.personen.slice(0, 10).forEach(p =>
    console.log(`  ${p.name} [${p.kategorie}]: ${p.anzahl_gesamt} Dok., Intensität ${p.gesamt_intensitaet}`)
  );
  console.groupEnd();

  const wrapper = el('div', { className: 'matrix-wrapper' });

  wrapper.appendChild(buildToolbar());

  // Sparkline
  const sparkContainer = el('div', { className: 'matrix-sparkline' });
  sparkContainer.id = 'matrix-sparkline';
  wrapper.appendChild(sparkContainer);

  // Heatmap
  const svgContainer = el('div', { className: 'matrix-container' });
  svgContainer.id = 'matrix-svg-container';
  wrapper.appendChild(svgContainer);

  // Periphery list
  const periphery = el('div', { className: 'matrix-periphery' });
  periphery.id = 'matrix-periphery';
  wrapper.appendChild(periphery);

  // Bottom bar
  const bottomBar = el('div', { className: 'matrix-bottom' });
  bottomBar.appendChild(buildLegend());
  bottomBar.appendChild(buildCoverage());
  wrapper.appendChild(bottomBar);

  // Drilldown
  const drilldown = el('div', { className: 'matrix-drilldown' });
  drilldown.id = 'matrix-drilldown';
  wrapper.appendChild(drilldown);

  container.appendChild(wrapper);

  // Wait for layout to settle, then render SVG
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      renderHeatmap();
      renderPeriphery();
      if (partiturData) renderSparkline(partiturData);
    });
  });
}

function buildGrazFokusBtn(ortSelect) {
  const btn = el('button', {
    className: 'phase-chip',
    title: 'Nur Graz-Dokumente anzeigen (FF1)',
  }, 'Graz-Fokus');
  btn.addEventListener('click', () => {
    const isActive = btn.classList.contains('phase-chip--active');
    if (isActive) {
      activeOrt = null;
      btn.classList.remove('phase-chip--active');
      if (ortSelect) ortSelect.value = '';
    } else {
      activeOrt = 'Graz';
      btn.classList.add('phase-chip--active');
      if (ortSelect) ortSelect.value = 'Graz';
    }
    reAggregate();
    renderHeatmap();
    renderPeriphery();
    updateActiveFilters();
  });
  return btn;
}

function buildToolbar() {
  const cats = ['Dirigent', 'Regisseur', 'Korrepetitor', 'Kollege', 'Vermittler', 'Andere'];
  const checkboxes = cats.map(cat => {
    const isChecked = activeCategories.has(cat);
    const checkbox = el('label', {
      className: `matrix-checkbox ${isChecked ? 'checked' : ''}`,
      onClick: (e) => {
        e.preventDefault();
        if (activeCategories.has(cat)) activeCategories.delete(cat);
        else activeCategories.add(cat);
        checkbox.classList.toggle('checked');
        renderHeatmap();
        renderPeriphery();
      },
    },
      el('span', {
        className: 'matrix-checkbox__dot',
        style: `background-color: ${PERSONEN_FARBEN[cat] || '#757575'}`,
      }),
      cat
    );
    return checkbox;
  });

  const showAll = el('button', {
    className: 'archiv-select',
    style: 'font-size: 0.75rem; padding: 4px 8px; cursor: pointer;',
    onClick: () => {
      for (const cat of cats) activeCategories.add(cat);
      document.querySelectorAll('.matrix-checkbox').forEach(cb => cb.classList.add('checked'));
      renderHeatmap();
      renderPeriphery();
    },
  }, 'Alle zeigen');

  // Ort filter dropdown
  const ortSelect = el('select', {
    className: 'matrix-select',
    onChange: (e) => {
      activeOrt = e.target.value || null;
      reAggregate();
      renderHeatmap();
      renderPeriphery();
      updateActiveFilters();
    },
  },
    el('option', { value: '' }, 'Alle Orte'),
    ...allOrte.slice(0, 15).map(o =>
      el('option', { value: o.name }, `${o.name} (${o.count})`)
    ),
  );

  // Doc type filter dropdown
  const typSelect = el('select', {
    className: 'matrix-select',
    onChange: (e) => {
      activeDocTyp = e.target.value || null;
      reAggregate();
      renderHeatmap();
      renderPeriphery();
      updateActiveFilters();
    },
  },
    el('option', { value: '' }, 'Alle Dokumenttypen'),
    ...allDocTypen.filter(t => t.count >= 2).map(t =>
      el('option', { value: t.id }, `${t.label} (${t.count})`)
    ),
  );

  // Active filter chips container
  const activeFiltersEl = el('div', { className: 'matrix-active-filters' });
  activeFiltersEl.id = 'matrix-active-filters';

  return el('div', { className: 'viz-toolbar' },
    el('div', { className: 'viz-toolbar__row' },
      el('div', { className: 'viz-toolbar__group' },
        el('span', { className: 'viz-toolbar__label' }, 'Rolle'),
        el('div', { className: 'matrix-checkbox-group' }, ...checkboxes),
        showAll,
      ),
      el('div', { className: 'viz-toolbar__group' },
        el('span', { className: 'viz-toolbar__label' }, 'Ort'),
        ortSelect,
      ),
      el('div', { className: 'viz-toolbar__group' },
        el('span', { className: 'viz-toolbar__label' }, 'Typ'),
        typSelect,
      ),
      el('div', { className: 'viz-toolbar__sep' }),
      buildGrazFokusBtn(ortSelect),
      el('div', { className: 'ff-badges' },
        el('span', { className: 'ff-badges__tag' }, 'FF1'),
        el('span', { className: 'ff-badges__tag' }, 'FF3'),
      ),
    ),
    activeFiltersEl,
  );
}

function updateActiveFilters() {
  const container = document.getElementById('matrix-active-filters');
  if (!container) return;
  clear(container);

  if (activeOrt) {
    container.appendChild(el('span', { className: 'matrix-active-filter' },
      `Ort: ${activeOrt}`,
      el('button', {
        className: 'matrix-active-filter__close',
        onClick: () => {
          activeOrt = null;
          const sel = document.querySelector('.matrix-select');
          if (sel) sel.value = '';
          reAggregate();
          renderHeatmap();
          renderPeriphery();
          updateActiveFilters();
        },
      }, '\u00d7'),
    ));
  }
  if (activeDocTyp) {
    container.appendChild(el('span', { className: 'matrix-active-filter' },
      `Typ: ${DOKUMENTTYP_LABELS[activeDocTyp] || activeDocTyp}`,
      el('button', {
        className: 'matrix-active-filter__close',
        onClick: () => {
          activeDocTyp = null;
          const sels = document.querySelectorAll('.matrix-select');
          if (sels[1]) sels[1].value = '';
          reAggregate();
          renderHeatmap();
          renderPeriphery();
          updateActiveFilters();
        },
      }, '\u00d7'),
    ));
  }
}

function buildLegend() {
  const steps = 6;
  const cells = [];
  for (let i = 0; i < steps; i++) {
    const opacity = i / (steps - 1);
    cells.push(el('span', {
      className: 'matrix-legend__cell',
      style: `background-color: rgba(0, 74, 143, ${0.1 + opacity * 0.9})`,
    }));
  }
  return el('div', { className: 'matrix-legend' },
    'Intensität: ',
    el('span', {}, 'niedrig'),
    el('span', { className: 'matrix-legend__scale' }, ...cells),
    el('span', {}, 'hoch'),
  );
}

function buildCoverage() {
  const total = storeRef?.allRecords?.length || 0;
  const data = filteredData || matrixData;
  const coreCount = data.personen.filter(p => p.anzahl_gesamt >= CORE_THRESHOLD).length;
  const allCount = data.personen.length;
  return el('div', { className: 'data-coverage' },
    `${coreCount} Kernpersonen + ${allCount - coreCount} Peripherie aus ${total} Datensätzen`,
  );
}

// =========================================================================
// Heatmap — core network (≥ CORE_THRESHOLD docs)
// =========================================================================

function getFilteredPersons() {
  const data = filteredData || matrixData;
  return data.personen.filter(p => activeCategories.has(p.kategorie));
}

function renderHeatmap() {
  const svgContainer = document.getElementById('matrix-svg-container');
  if (!svgContainer) return;
  clear(svgContainer);

  const allFiltered = getFilteredPersons();
  const corePersons = allFiltered.filter(p => p.anzahl_gesamt >= CORE_THRESHOLD);

  if (corePersons.length === 0) {
    svgContainer.appendChild(el('p', {
      style: 'padding: 24px; text-align: center; color: var(--color-text-tertiary);',
    }, 'Keine Kernpersonen mit den gewählten Filtern.'));
    return;
  }

  const data = filteredData || matrixData;
  const phases = data.zeitraeume;
  const phLabels = data.phasenLabels;
  const phJahre = data.phasenJahre;

  const containerW = svgContainer.clientWidth || 760;
  const containerH = svgContainer.clientHeight || 400;
  const margin = { top: 52, right: 16, bottom: 4, left: Math.min(190, Math.max(130, containerW * 0.18)) };

  // Dynamic cell height
  const availH = containerH - margin.top - margin.bottom;
  let cellH = corePersons.length > 0 ? availH / corePersons.length : MIN_CELL_H;
  cellH = Math.max(MIN_CELL_H, Math.min(MAX_CELL_H, cellH));

  const width = containerW;
  const height = margin.top + corePersons.length * cellH + margin.bottom;

  const svg = d3.select(svgContainer).append('svg')
    .attr('width', width)
    .attr('height', height);

  const maxIntensity = d3.max(corePersons, p => p.gesamt_intensitaet) || 1;
  const colorScale = d3.scaleSequential(d3.interpolateBlues)
    .domain([0, maxIntensity * 0.55]);

  // Scales
  const xScale = d3.scaleBand()
    .domain(phases)
    .range([margin.left, width - margin.right])
    .padding(0.05);

  const yScale = d3.scaleBand()
    .domain(corePersons.map(p => p.name))
    .range([margin.top, margin.top + corePersons.length * cellH])
    .padding(0.06);

  // Column headers — two-line: phase label + years
  svg.selectAll('.col-header-label')
    .data(phases)
    .join('text')
    .attr('class', 'col-header-label')
    .attr('x', z => xScale(z) + xScale.bandwidth() / 2)
    .attr('y', margin.top - 24)
    .attr('text-anchor', 'middle')
    .style('font-size', xScale.bandwidth() > 90 ? '10px' : '8px')
    .style('font-family', 'Inter, sans-serif')
    .style('fill', '#2C2825')
    .style('font-weight', '600')
    .text(z => phLabels ? (phLabels[z] || z) : z.replace('-', '\u2013'));

  // Year sub-labels
  if (phJahre) {
    svg.selectAll('.col-header-years')
      .data(phases)
      .join('text')
      .attr('class', 'col-header-years')
      .attr('x', z => xScale(z) + xScale.bandwidth() / 2)
      .attr('y', margin.top - 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '8px')
      .style('font-family', "'JetBrains Mono', monospace")
      .style('fill', '#8A857E')
      .text(z => phJahre[z] || '');
  }

  // Column guides
  svg.selectAll('.col-guide')
    .data(phases)
    .join('line')
    .attr('class', 'col-guide')
    .attr('x1', z => xScale(z))
    .attr('x2', z => xScale(z))
    .attr('y1', margin.top)
    .attr('y2', margin.top + corePersons.length * cellH)
    .attr('stroke', '#E8E2DA')
    .attr('stroke-width', 0.5);

  // Row groups
  const rows = svg.selectAll('.matrix-row')
    .data(corePersons)
    .join('g')
    .attr('class', 'matrix-row')
    .attr('transform', p => `translate(0, ${yScale(p.name)})`);

  // Alternating row background
  rows.append('rect')
    .attr('x', margin.left)
    .attr('y', 0)
    .attr('width', width - margin.left - margin.right)
    .attr('height', yScale.bandwidth())
    .attr('fill', (_, i) => i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.018)');

  // Category indicator
  rows.append('rect')
    .attr('x', margin.left - 6)
    .attr('y', yScale.bandwidth() * 0.1)
    .attr('width', 4)
    .attr('height', yScale.bandwidth() * 0.8)
    .attr('rx', 2)
    .attr('fill', p => PERSONEN_FARBEN[p.kategorie] || '#757575');

  // Name labels
  const fontSize = Math.min(12, Math.max(9, cellH * 0.48));
  const maxNameChars = Math.floor(margin.left / (fontSize * 0.55));

  rows.append('text')
    .attr('x', margin.left - 10)
    .attr('y', yScale.bandwidth() / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .style('font-size', `${fontSize}px`)
    .style('font-family', 'Inter, sans-serif')
    .style('fill', '#2C2825')
    .style('cursor', 'pointer')
    .text(p => {
      const catAbbr = KATEGORIE_KUERZEL[p.kategorie] || '';
      const nameWithCat = catAbbr ? `${p.name} [${catAbbr}]` : p.name;
      if (nameWithCat.length > maxNameChars) {
        return p.name.slice(0, maxNameChars - 5) + '\u2026 [' + catAbbr + ']';
      }
      return nameWithCat;
    })
    .on('click', (_, p) => navigateToIndex('personen', p.name))
    .append('title').text(p => `${p.name} (${p.kategorie}) \u2013 ${p.anzahl_gesamt} Dok., Intensität ${p.gesamt_intensitaet}`);

  // Heatmap cells
  rows.each(function(person) {
    const row = d3.select(this);
    person.begegnungen.forEach((beg) => {
      if (beg.intensitaet === 0) return;

      const cell = row.append('rect')
        .attr('x', xScale(beg.zeitraum) + 1)
        .attr('y', 1)
        .attr('width', xScale.bandwidth() - 2)
        .attr('height', yScale.bandwidth() - 2)
        .attr('rx', 3)
        .attr('fill', colorScale(beg.intensitaet))
        .attr('stroke', 'transparent')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer');

      // Document count in cell
      if (cellH >= 22 && xScale.bandwidth() >= 40) {
        row.append('text')
          .attr('x', xScale(beg.zeitraum) + xScale.bandwidth() / 2)
          .attr('y', yScale.bandwidth() / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .style('font-size', `${Math.min(11, cellH * 0.42)}px`)
          .style('font-family', "'JetBrains Mono', monospace")
          .style('fill', beg.intensitaet > maxIntensity * 0.3 ? 'rgba(255,255,255,0.9)' : 'rgba(0,74,143,0.6)')
          .style('pointer-events', 'none')
          .text(beg.anzahl_dokumente);
      }

      cell
        .on('mouseenter', function() { d3.select(this).attr('stroke', '#004A8F').attr('stroke-width', 1.5); })
        .on('mouseleave', function() { d3.select(this).attr('stroke', 'transparent'); })
        .on('click', () => {
          if (beg.dokumente.length > 0) {
            const isSame = activeDrilldown
              && activeDrilldown.person === person.name
              && activeDrilldown.zeitraum === beg.zeitraum;
            activeDrilldown = isSame ? null : { person: person.name, zeitraum: beg.zeitraum };
            showDrilldown(person.name, beg.zeitraum, beg.dokumente);
          }
        });

      cell.append('title').text(
        `${person.name} (${beg.zeitraum})\n${beg.anzahl_dokumente} Dok., Intensität: ${beg.intensitaet}\n` +
        beg.dokumente.slice(0, 3).map(d => `  ${d.signatur}: ${d.titel}`).join('\n')
      );
    });
  });
}

// =========================================================================
// Periphery — persons with < CORE_THRESHOLD docs (compact list)
// =========================================================================

function renderPeriphery() {
  const container = document.getElementById('matrix-periphery');
  if (!container) return;
  clear(container);

  const allFiltered = getFilteredPersons();
  const peripheral = allFiltered.filter(p => p.anzahl_gesamt < CORE_THRESHOLD && p.anzahl_gesamt > 0);

  if (peripheral.length === 0) return;

  const data = filteredData || matrixData;

  container.appendChild(el('div', { className: 'matrix-periphery__header' },
    `Weitere ${peripheral.length} Personen (je 1\u20132 Dokumente)`,
  ));

  // Group by earliest active phase
  const phaseGroups = new Map();
  for (const p of peripheral) {
    const firstActive = p.begegnungen.find(b => b.anzahl_dokumente > 0);
    const phaseId = firstActive ? firstActive.zeitraum : 'unbekannt';
    if (!phaseGroups.has(phaseId)) phaseGroups.set(phaseId, []);
    phaseGroups.get(phaseId).push(p);
  }

  // On first render, collapse all groups
  if (peripheryFirstRender) {
    for (const key of phaseGroups.keys()) collapsedPhases.add(key);
    peripheryFirstRender = false;
  }

  // Render phase groups in phase order
  const phaseOrder = data.zeitraeume || [];
  const sortedKeys = [...phaseGroups.keys()].sort((a, b) => {
    const ia = phaseOrder.indexOf(a);
    const ib = phaseOrder.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  for (const phaseId of sortedKeys) {
    const persons = phaseGroups.get(phaseId);
    const label = data.phasenLabels?.[phaseId] || phaseId;
    const jahre = data.phasenJahre?.[phaseId] || '';
    const isCollapsed = collapsedPhases.has(phaseId);

    const groupEl = el('div', { className: 'matrix-periphery__group' });

    const toggleSvg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
    const headerEl = el('div', {
      className: 'matrix-periphery__group-header' + (isCollapsed ? ' matrix-periphery__group-header--collapsed' : ''),
      onClick: () => {
        if (collapsedPhases.has(phaseId)) collapsedPhases.delete(phaseId);
        else collapsedPhases.add(phaseId);
        renderPeriphery();
      },
    },
      el('span', { className: 'matrix-periphery__toggle', html: toggleSvg }),
      el('span', { className: 'matrix-periphery__phase-label' }, label),
      el('span', { className: 'matrix-periphery__phase-jahre' }, jahre),
      el('span', { className: 'matrix-periphery__group-count' }, `${persons.length}`),
    );
    groupEl.appendChild(headerEl);

    if (!isCollapsed) {
      const grid = el('div', { className: 'matrix-periphery__grid matrix-periphery__group-body' });
      for (const p of persons) {
        const catColor = PERSONEN_FARBEN[p.kategorie] || '#757575';
        const catAbbr = KATEGORIE_KUERZEL[p.kategorie] || '';
        const activePhases = p.begegnungen
          .filter(b => b.anzahl_dokumente > 0)
          .map(b => data.phasenLabels?.[b.zeitraum] || b.zeitraum);

        grid.appendChild(el('span', {
          className: 'matrix-periphery__chip',
          onClick: () => {
            if (p.name === 'Malaniuk, Ira') navigateToView('mobilitaet');
            else navigateToIndex('personen', p.name);
          },
          title: `${p.name} (${p.kategorie}) \u2014 ${p.anzahl_gesamt} Dok. in: ${activePhases.join(', ')}`,
        },
          el('span', { className: 'matrix-periphery__dot', style: `background:${catColor}` }),
          `${p.name}`,
          catAbbr ? el('span', { className: 'matrix-periphery__cat' }, catAbbr) : null,
          el('span', { className: 'matrix-periphery__count' }, `${p.anzahl_gesamt}`),
        ));
      }
      groupEl.appendChild(grid);
    }

    container.appendChild(groupEl);
  }
}

// =========================================================================
// Sparkline — phase-based aggregation
// =========================================================================

function renderSparkline(partiturData) {
  const sparkEl = document.getElementById('matrix-sparkline');
  if (!sparkEl) return;

  // Aggregate intensity per phase from matrixData
  const phases = matrixData.zeitraeume;
  const phLabels = matrixData.phasenLabels;
  const phaseIntensity = phases.map(ph => {
    let total = 0;
    for (const p of matrixData.personen) {
      const beg = p.begegnungen.find(b => b.zeitraum === ph);
      if (beg) total += beg.intensitaet;
    }
    return { phase: ph, label: phLabels?.[ph] || ph, intensitaet: total };
  });

  const svgContainer = document.getElementById('matrix-svg-container');
  const containerWidth = svgContainer?.clientWidth || sparkEl.clientWidth || 760;
  const margin = { top: 6, right: 16, bottom: 18, left: Math.min(190, Math.max(130, containerWidth * 0.18)) };
  const colW = (containerWidth - margin.left - margin.right) / phases.length;
  const width = containerWidth;
  const height = 56;

  const svg = d3.select(sparkEl).append('svg')
    .attr('width', width)
    .attr('height', height);

  const maxVal = d3.max(phaseIntensity, d => d.intensitaet) || 1;

  const xScale = d3.scaleLinear()
    .domain([0, phaseIntensity.length - 1])
    .range([margin.left + colW / 2, margin.left + (phaseIntensity.length - 1) * colW + colW / 2]);

  const yScale = d3.scaleLinear()
    .domain([0, maxVal])
    .range([height - margin.bottom, margin.top]);

  const area = d3.area()
    .x((_, i) => xScale(i))
    .y0(height - margin.bottom)
    .y1(d => yScale(d.intensitaet))
    .curve(d3.curveMonotoneX);

  svg.append('path')
    .datum(phaseIntensity)
    .attr('d', area)
    .attr('fill', 'rgba(0, 74, 143, 0.10)')
    .attr('stroke', 'rgba(0, 74, 143, 0.35)')
    .attr('stroke-width', 1.5);

  // Value labels
  phaseIntensity.forEach((d, i) => {
    svg.append('text')
      .attr('x', xScale(i))
      .attr('y', yScale(d.intensitaet) - 4)
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .style('font-family', "'JetBrains Mono', monospace")
      .style('fill', d.intensitaet === maxVal ? '#004A8F' : '#8A857E')
      .style('font-weight', d.intensitaet === maxVal ? '700' : '400')
      .text(d.intensitaet);
  });

  svg.append('text')
    .attr('x', margin.left - 10)
    .attr('y', height / 2 + 3)
    .attr('text-anchor', 'end')
    .style('font-size', '9px')
    .style('font-family', 'Inter, sans-serif')
    .style('fill', '#8A857E')
    .style('font-style', 'italic')
    .text('Netzwerk-Puls');
}

// =========================================================================
// Drilldown Panel
// =========================================================================

function showDrilldown(person, zeitraum, dokumente) {
  const panel = document.getElementById('matrix-drilldown');
  if (!panel) return;
  clear(panel);

  if (!activeDrilldown) return;

  const phLabel = (filteredData || matrixData).phasenLabels?.[zeitraum] || zeitraum;
  const isKomponist = storeRef && [...(storeRef.works?.values() || [])].some(w => w.komponist === person);

  // Collect composers from werk subjects for Zeitfluss link
  const werkKomponisten = new Set();
  for (const doc of dokumente) {
    const record = storeRef?.bySignatur?.get(doc.signatur);
    if (record) {
      for (const subj of ensureArray(record['rico:hasOrHadSubject'])) {
        if (subj['@type'] === 'm3gim:MusicalWork' && subj.komponist) {
          werkKomponisten.add(subj.komponist);
        }
      }
    }
  }
  const hasWerke = werkKomponisten.size > 0;

  const header = el('div', { className: 'matrix-drilldown__header' },
    el('a', {
      className: 'matrix-drilldown__person matrix-drilldown__link',
      title: `${person} im Index anzeigen`,
      onClick: (e) => { e.preventDefault(); navigateToIndex('personen', person); },
    }, person),
    isKomponist ? el('a', {
      className: 'matrix-drilldown__kosmos-link',
      title: `${person} im Kosmos anzeigen`,
      onClick: (e) => { e.preventDefault(); navigateToView('kosmos', { komponist: person }); },
    }, '\u2192 Kosmos') : null,
    hasWerke ? el('a', {
      className: 'matrix-drilldown__zeitfluss-link',
      title: 'Werke im Zeitfluss anzeigen',
      onClick: (e) => {
        e.preventDefault();
        const komponist = [...werkKomponisten][0];
        navigateToView('zeitfluss', { komponist });
      },
    }, '\u2192 Zeitfluss') : null,
    el('span', { className: 'matrix-drilldown__sep' }, '\u00b7'),
    el('span', { className: 'matrix-drilldown__period' }, phLabel),
    el('span', { className: 'matrix-drilldown__sep' }, '\u00b7'),
    el('span', { className: 'matrix-drilldown__count' }, `${dokumente.length} Dokumente`),
    el('button', {
      className: 'inline-detail__close',
      title: 'Schlie\u00dfen',
      onClick: () => { activeDrilldown = null; clear(panel); },
      html: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    })
  );
  panel.appendChild(header);

  const list = el('div', { className: 'matrix-drilldown__list' });
  for (const doc of dokumente) {
    const typLabel = DOKUMENTTYP_LABELS[doc.typ] || '';
    const record = storeRef?.bySignatur?.get(doc.signatur);

    const locTags = [];
    if (record) {
      for (const loc of ensureArray(record['rico:hasOrHadLocation'])) {
        const name = loc.name || loc['rico:name'] || '';
        if (name) locTags.push(name);
      }
    }

    const werkTags = [];
    if (record) {
      for (const subj of ensureArray(record['rico:hasOrHadSubject'])) {
        if (subj['@type'] === 'm3gim:MusicalWork') {
          const wName = subj.name || subj['rico:name'] || '';
          if (wName) werkTags.push(wName);
        }
      }
    }

    const row = el('div', {
      className: 'matrix-drilldown__row',
      onClick: () => { if (record) selectRecord(record['@id']); },
    },
      el('span', { className: 'matrix-drilldown__sig' }, formatSignatur(doc.signatur)),
      el('span', { className: 'matrix-drilldown__title' }, doc.titel || '(ohne Titel)'),
      typLabel ? el('span', { className: `badge badge--${doc.typ}` }, typLabel) : null,
      ...locTags.map(loc => el('span', {
        className: `badge matrix-drilldown__loc-tag${loc === 'Graz' ? ' matrix-drilldown__loc-tag--graz' : ''}`,
      }, loc)),
      ...werkTags.map(w => el('span', {
        className: 'chip chip--werk chip--clickable matrix-drilldown__werk-chip',
        onClick: (e) => { e.stopPropagation(); navigateToView('kosmos'); },
      }, w)),
    );
    list.appendChild(row);
  }
  panel.appendChild(list);
}

export function resetMatrix() {
  rendered = false;
  activeDrilldown = null;
  collapsedPhases = new Set();
  peripheryFirstRender = true;
}
