/**
 * M³GIM Matrix View — Person × Time heatmap (D3.js).
 */

import { aggregateMatrix } from '../data/aggregator.js';
import { PERSONEN_FARBEN, ZEITRAEUME } from '../data/constants.js';
import { selectRecord } from '../ui/router.js';
import { el, clear } from '../utils/dom.js';

let rendered = false;
let matrixData = null;
let storeRef = null;
let containerRef = null;
let activeCategories = new Set(['Dirigent', 'Regisseur', 'Korrepetitor', 'Kollege', 'Vermittler']);
let minIntensity = 1;

export function renderMatrix(store, container) {
  if (rendered) return;
  rendered = true;
  storeRef = store;
  containerRef = container;
  matrixData = aggregateMatrix(store);

  clear(container);
  container.appendChild(buildToolbar());

  const svgContainer = el('div', { className: 'matrix-container' });
  svgContainer.id = 'matrix-svg-container';
  container.appendChild(svgContainer);

  container.appendChild(buildLegend());
  renderHeatmap();
}

function buildToolbar() {
  const cats = ['Dirigent', 'Regisseur', 'Korrepetitor', 'Kollege', 'Vermittler', 'Andere'];
  const checkboxes = cats.map(cat => {
    const isChecked = activeCategories.has(cat);
    const checkbox = el('label', {
      className: `matrix-checkbox ${isChecked ? 'checked' : ''}`,
      onClick: (e) => {
        e.preventDefault();
        if (activeCategories.has(cat)) {
          activeCategories.delete(cat);
        } else {
          activeCategories.add(cat);
        }
        checkbox.classList.toggle('checked');
        renderHeatmap();
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
    },
  }, 'Alle zeigen');

  return el('div', { className: 'matrix-toolbar' },
    el('div', { className: 'matrix-filter-group' },
      el('span', { className: 'matrix-filter-label' }, 'Kategorien'),
      el('div', { className: 'matrix-checkbox-group' }, ...checkboxes),
    ),
    showAll,
  );
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

function renderHeatmap() {
  const svgContainer = document.getElementById('matrix-svg-container');
  if (!svgContainer) return;
  clear(svgContainer);

  // Filter persons
  const persons = matrixData.personen.filter(p =>
    activeCategories.has(p.kategorie) && p.gesamt_intensitaet >= minIntensity
  );

  if (persons.length === 0) {
    svgContainer.appendChild(el('p', {
      style: 'padding: 40px; text-align: center; color: var(--color-text-tertiary);',
    }, 'Keine Personen mit den gewählten Filtern.'));
    return;
  }

  const margin = { top: 30, right: 20, bottom: 10, left: 180 };
  const cellH = 20;
  const cellW = 80;
  const width = margin.left + ZEITRAEUME.length * cellW + margin.right;
  const height = margin.top + persons.length * cellH + margin.bottom;

  const svg = d3.select(svgContainer).append('svg')
    .attr('width', width)
    .attr('height', height);

  const maxIntensity = d3.max(persons, p => p.gesamt_intensitaet) || 1;
  const colorScale = d3.scaleSequential(d3.interpolateBlues)
    .domain([0, maxIntensity * 0.6]); // Compress scale so mid-values are visible

  // X labels (periods)
  ZEITRAEUME.forEach((z, i) => {
    svg.append('text')
      .attr('x', margin.left + i * cellW + cellW / 2)
      .attr('y', margin.top - 8)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('font-family', 'Inter, sans-serif')
      .style('fill', '#5C5651')
      .text(z.replace('-', '\u2013'));
  });

  // Rows
  persons.forEach((person, pi) => {
    const y = margin.top + pi * cellH;
    const catColor = PERSONEN_FARBEN[person.kategorie] || '#757575';

    // Category indicator
    svg.append('rect')
      .attr('x', margin.left - 6)
      .attr('y', y + 2)
      .attr('width', 4).attr('height', cellH - 4)
      .attr('rx', 2)
      .attr('fill', catColor);

    // Name label
    const displayName = person.name.length > 25 ? person.name.slice(0, 23) + '\u2026' : person.name;
    svg.append('text')
      .attr('x', margin.left - 10)
      .attr('y', y + cellH / 2 + 4)
      .attr('text-anchor', 'end')
      .style('font-size', '11px')
      .style('font-family', 'Inter, sans-serif')
      .style('fill', '#2C2825')
      .text(displayName)
      .append('title').text(`${person.name} (${person.kategorie})`);

    // Cells
    person.begegnungen.forEach((beg, zi) => {
      if (beg.intensitaet === 0) return;
      const cx = margin.left + zi * cellW;
      svg.append('rect')
        .attr('x', cx + 1).attr('y', y + 1)
        .attr('width', cellW - 2).attr('height', cellH - 2)
        .attr('rx', 3)
        .attr('fill', colorScale(beg.intensitaet))
        .attr('stroke', 'transparent')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('mouseenter', function() { d3.select(this).attr('stroke', '#004A8F').attr('stroke-width', 1.5); })
        .on('mouseleave', function() { d3.select(this).attr('stroke', 'transparent'); })
        .on('click', () => {
          if (beg.dokumente.length > 0) {
            // Find first document's record
            const sig = beg.dokumente[0].signatur;
            const record = storeRef.bySignatur.get(sig);
            if (record) selectRecord(record['@id']);
          }
        })
        .append('title').text(
          `${person.name} (${beg.zeitraum})\n${beg.anzahl_dokumente} Dok., Intensität: ${beg.intensitaet}\n` +
          beg.dokumente.slice(0, 3).map(d => `  ${d.signatur}: ${d.titel}`).join('\n')
        );
    });
  });
}

export function resetMatrix() {
  rendered = false;
}
