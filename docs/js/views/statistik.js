/**
 * Statistik — der Bestand in Zahlen (E-160).
 *
 * Fuenf record-basierte Ansichten ueber die Dokumentmenge des geteilten
 * Schnitts: Dokumenttypen, Erschliessungsstand, Repertoire, Personen,
 * Institutionen. Die Mobilitaets- und Beziehungsaggregate liegen seit E-160 in
 * Karte, Chronik und Netzwerk; die Laender-Reichweite traegt die Karte.
 *
 * Die Sidebar ist das geteilte Geruest (ui/sidebar.js): Suche, Ergebniszeile,
 * Zeitraum und die geteilten Facetten schneiden, dazu als einzige eigene
 * Sektion die Wahl der Ansicht. Es gibt keinen ansichtseigenen Filterort mehr,
 * also weder Sicht noch Land.
 *
 * Diese Datei ist reine View-Orchestrierung. Die Aggregationen liegen in
 * `statistik-data.js`, die Sektionen in `statistik-sections.js`, die
 * Balken-Primitive in `ui/charts.js`.
 */

import { clear, el } from '../utils/dom.js';
import { logStamp } from '../utils/env.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { getFilter } from '../ui/filter-state.js';
import { recordsFor, yearBounds } from '../data/records-for.js';
import {
  buildDokumenttypen, buildErschliessung, buildRepertoire,
  buildPersonen, buildInstitutionen,
} from './statistik-sections.js';

// Die Ansichten in Lesereihenfolge; Single-Select, genau eine ist aktiv.
const SECTIONS = [
  { id: 'dokumenttypen', label: 'Dokumenttypen',      build: buildDokumenttypen },
  { id: 'erschliessung', label: 'Erschließungsstand', build: buildErschliessung },
  { id: 'repertoire',    label: 'Repertoire',         build: buildRepertoire },
  { id: 'personen',      label: 'Personen',           build: buildPersonen },
  { id: 'institutionen', label: 'Institutionen',      build: buildInstitutionen },
];

const SECTION_BY_ID = new Map(SECTIONS.map(s => [s.id, s]));

// Modulweit, damit ein zweites Render der Ansicht keinen zweiten Subscriber
// stapelt.
let _sidebar = null;

export function renderStatistik(store, container) {
  clear(container);

  const span = yearBounds(store);
  let active = SECTIONS[0].id;
  let cutSize = 0;

  const stage = el('div', { className: 'statistik__stage' });
  const main = el('div', { className: 'view-main statistik-main' }, stage);

  const activeDef = () => SECTION_BY_ID.get(active) || SECTIONS[0];

  const rebuild = () => {
    const { ids } = recordsFor(store, getFilter());
    cutSize = ids.size;
    clear(stage);
    stage.appendChild(activeDef().build(store, ids));
  };

  const switchView = (id) => {
    if (id === active) return;
    active = id;
    sidebar.update();
    rebuild();
  };

  const sidebar = createSidebar(store, {
    yearSpan: span,
    // recordsFor wertet den Freitext nicht aus; ein Feld ohne Wirkung bleibt weg.
    search: false,
    sections: [{
      title: 'Ansicht',
      controls: [{
        kind: 'legend',
        // Neutrale Swatch: die Ansicht-Chips tragen keine irrefuehrende Leitfarbe.
        items: SECTIONS.map(s => ({
          id: s.id, label: s.label, color: 'var(--color-text-tertiary)',
        })),
        isActive: (id) => id === active,
        onToggle: (id) => switchView(id),
      }],
    }],
    onChange: () => { rebuild(); sidebar.update(); },
  });

  if (_sidebar) _sidebar.destroy();
  _sidebar = sidebar;

  main.insertBefore(sidebar.strip, main.firstChild);
  container.appendChild(viewShell(sidebar.element, main));
  rebuild();

  logStamp('statistik', [
    ['records', cutSize],
    ['ansichten', SECTIONS.length],
    ['aktiv', active],
    ['spanne', `${span.min}-${span.max}`],
  ]);
}
