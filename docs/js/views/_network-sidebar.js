/**
 * Netzwerk-Sidebar als deklarative Spec fuer die geteilte View-Sidebar
 * (docs/js/ui/sidebar.js). Der Haupt-View bleibt State-Eigentuemer; diese
 * Datei uebersetzt `state` in eine Sektions-/Control-Beschreibung und ruft
 * `actions`-Callbacks bei Filteraenderungen. Keine direkte Mutation globaler
 * State-Variablen, nur des durchgereichten `state.filters` (geteilte Referenz).
 *
 * Vertrag:
 *   renderSidebar({state, actions}) => HTMLElement (<aside class="view-sidebar">)
 *
 * state = {
 *   filters,          // laufende Filter-Shape (wird direkt mutiert)
 *   layout,           // computeLayout-Ergebnis (fuer Kategorie-Counts)
 *   yearRange,        // {min, max} fuer den Zeitfenster-Filter
 * }
 * actions = {
 *   onFilterChange(),          // nach Filter-Patch — applyFilters (nur Opazitaet)
 *   onMinSharedChanged(),      // Ko-Okkurrenz neu rechnen + Canvas-Rebuild
 *   onResetFilters(),          // Filter zuruecksetzen + kompletter Re-Draw
 * }
 */

import { createSidebar } from '../ui/sidebar.js';
import { derivePersonKategorie, NETZWERK_KATEGORIEN } from './_network-geometry.js';

export function renderSidebar({ state, actions }) {
  const f = state.filters;

  // Kategorie-Zaehlung aus den Layout-Knoten; absteigend nach Haeufigkeit, so
  // wird die Chip-Leiste selbst zum kleinen Bar-Chart.
  const catCounts = new Map();
  for (const n of state.layout.nodes) {
    const k = derivePersonKategorie(n.entry);
    catCounts.set(k, (catCounts.get(k) || 0) + 1);
  }
  const catItems = [...catCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([kat, count]) => ({
      id: kat, label: kat, count,
      color: NETZWERK_KATEGORIEN[kat] || NETZWERK_KATEGORIEN.Andere,
    }));

  const { element } = createSidebar({
    sections: [
      // Coverage — oben, prominent; Inhalt schreibt network.js::applyFilters().
      { controls: [{ kind: 'custom', id: 'netzwerk-coverage', className: 'netzwerk__coverage' }] },

      {
        title: 'Filter',
        controls: [
          { kind: 'search', placeholder: 'Name suchen…',
            value: () => f.search,
            onChange: s => { f.search = s.toLowerCase(); actions.onFilterChange(); } },
          { kind: 'slider', label: 'Mind. Dokumente', min: 1, max: 20,
            value: () => f.minRecords,
            onChange: v => { f.minRecords = v || 1; actions.onFilterChange(); } },
          { kind: 'slider', label: 'Verkn. ab (gem. Dok.)', min: 1, max: 6,
            value: () => f.minShared,
            onChange: v => { f.minShared = v || 2; actions.onMinSharedChanged(); } },
          { kind: 'toggle', label: 'Ko-Okkurrenz-Linien (geschwungen)',
            value: () => f.showCoOccurrence,
            onChange: v => { f.showCoOccurrence = v; actions.onFilterChange(); } },
          { kind: 'toggle', label: 'AgRelOn-Linien (gerade, explizit)',
            value: () => f.showAgRelOn,
            onChange: v => { f.showAgRelOn = v; actions.onFilterChange(); } },
          { kind: 'toggle', label: 'Nur Wikidata-verknüpft',
            value: () => f.onlyWikidata,
            onChange: v => { f.onlyWikidata = v; actions.onFilterChange(); } },
          { kind: 'toggle', label: 'Nur AgRelOn-Personen',
            value: () => f.onlyAgRelOn,
            onChange: v => { f.onlyAgRelOn = v; actions.onFilterChange(); } },
        ],
      },

      {
        title: 'Zeitfenster',
        controls: [{
          kind: 'range', fullLabel: true,
          min: state.yearRange.min, max: state.yearRange.max,
          from: () => f.yearFrom ?? state.yearRange.min,
          to: () => f.yearTo ?? state.yearRange.max,
          onChange: (from, to) => {
            f.yearFrom = (from === state.yearRange.min) ? null : from;
            f.yearTo = (to === state.yearRange.max) ? null : to;
            // Zeitfenster ist geteilt (M4): dedizierte Action schreibt zurueck.
            // Fallback auf onFilterChange, falls nicht verdrahtet.
            if (actions.onTimeWindowChange) actions.onTimeWindowChange();
            else actions.onFilterChange();
          },
        }],
      },

      {
        title: 'Kategorien',
        controls: [{
          kind: 'legend', items: catItems,
          isActive: kat => !f.hiddenCategories.has(kat),
          onToggle: kat => {
            if (f.hiddenCategories.has(kat)) f.hiddenCategories.delete(kat);
            else f.hiddenCategories.add(kat);
            actions.onFilterChange();
          },
        }],
      },

      {
        title: 'Legende',
        controls: [{
          kind: 'staticLegend',
          rows: [
            { markerClass: 'netzwerk__legend-dot netzwerk__legend-dot--ring1',
              html: '<strong>Ring 1</strong> · harte Beziehung (AgRelOn oder Wikidata + ≥ 5 Dok.)' },
            { markerClass: 'netzwerk__legend-dot netzwerk__legend-dot--ring2',
              html: '<strong>Ring 2</strong> · Umfeld (≥ 2 Dokumente)' },
            { markerClass: 'nz-legend__line nz-legend__line--agrelon',
              html: '<strong>gerade Linie</strong> · AgRelOn, <em>explizit annotiert</em>' },
            { markerClass: 'nz-legend__line nz-legend__line--cooc',
              html: '<strong>geschwungene Linie</strong> · Ko-Okkurrenz, <em>aus Dokumenten abgeleitet</em>' },
            { markerClass: 'nz-legend__qid',
              html: 'Wikidata-verknüpft (Stern am Knoten)' },
          ],
        }],
      },

      { stickFooter: true,
        controls: [{ kind: 'button', label: '× Zurücksetzen', onClick: () => actions.onResetFilters() }] },
    ],
  });

  return element;
}
