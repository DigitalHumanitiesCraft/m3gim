/**
 * M³GIM Matrix View — Person × Time heatmap (D3.js).
 */

import { aggregateMatrix } from '../data/aggregator.js';
import { PERSONEN_FARBEN, ZEITRAEUME, DOKUMENTTYP_LABELS } from '../data/constants.js';
import { selectRecord } from '../ui/router.js';
import { el, clear } from '../utils/dom.js';
import { formatSignatur } from '../utils/format.js';

const KATEGORIE_KUERZEL = {
  'Dirigent': 'D', 'Regisseur': 'R', 'Korrepetitor': 'Kr',
  'Kollege': 'Ko', 'Vermittler': 'V', 'Andere': 'A',
  'Komponist': 'Kp', 'Archivsubjekt': '',
};

let rendered = false;
let matrixData = null;
let storeRef = null;
let containerRef = null;
let activeCategories = new Set(['Dirigent', 'Regisseur', 'Korrepetitor', 'Kollege', 'Vermittler']);
let minIntensity = 1;
let activeDrilldown = null; // { person, zeitraum } or null

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

  const drilldown = el('div', { className: 'matrix-drilldown' });
  drilldown.id = 'matrix-drilldown';
  container.appendChild(drilldown);

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

    // Name label with category abbreviation
    const catAbbr = KATEGORIE_KUERZEL[person.kategorie] || '';
    const nameWithCat = catAbbr ? `${person.name} [${catAbbr}]` : person.name;
    const displayName = nameWithCat.length > 30 ? person.name.slice(0, 23) + '\u2026 [' + catAbbr + ']' : nameWithCat;
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
            const isSame = activeDrilldown
              && activeDrilldown.person === person.name
              && activeDrilldown.zeitraum === beg.zeitraum;
            if (isSame) {
              activeDrilldown = null;
            } else {
              activeDrilldown = { person: person.name, zeitraum: beg.zeitraum };
            }
            showDrilldown(person.name, beg.zeitraum, beg.dokumente);
          }
        })
        .append('title').text(
          `${person.name} (${beg.zeitraum})\n${beg.anzahl_dokumente} Dok., Intensität: ${beg.intensitaet}\n` +
          beg.dokumente.slice(0, 3).map(d => `  ${d.signatur}: ${d.titel}`).join('\n')
        );
    });
  });
}

function showDrilldown(person, zeitraum, dokumente) {
  const panel = document.getElementById('matrix-drilldown');
  if (!panel) return;
  clear(panel);

  if (!activeDrilldown) return;

  const header = el('div', { className: 'matrix-drilldown__header' },
    el('span', { className: 'matrix-drilldown__person' }, person),
    el('span', { className: 'matrix-drilldown__sep' }, '\u00b7'),
    el('span', { className: 'matrix-drilldown__period' }, zeitraum),
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
    const row = el('div', {
      className: 'matrix-drilldown__row',
      onClick: () => {
        const record = storeRef.bySignatur.get(doc.signatur);
        if (record) selectRecord(record['@id']);
      },
    },
      el('span', { className: 'matrix-drilldown__sig' }, formatSignatur(doc.signatur)),
      el('span', { className: 'matrix-drilldown__title' }, doc.titel || '(ohne Titel)'),
      typLabel ? el('span', { className: `badge badge--${doc.typ}` }, typLabel) : null,
    );
    list.appendChild(row);
  }
  panel.appendChild(list);
}

export function resetMatrix() {
  rendered = false;
  activeDrilldown = null;
}
