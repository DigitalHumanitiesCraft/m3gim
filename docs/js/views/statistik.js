/**
 * Statistik — der Bestand in Zahlen (E-160).
 *
 * Vier record-basierte Ansichten ueber die Dokumentmenge des geteilten
 * Schnitts: Dokumenttypen, Repertoire, Personen, Institutionen. Die
 * Mobilitaets- und Beziehungsaggregate liegen seit E-160 in Karte, Chronik und
 * Netzwerk. Der Erschliessungsstand ist mit E-262 kein Forschungsgegenstand
 * und steht nur noch als Aussage im Datensatz-Detail; die Arbeitsliste des
 * Erschliessungsteams schreibt `scripts/report-cataloguing.py` (E-248).
 *
 * Die Sidebar ist das geteilte Geruest (ui/sidebar.js): Suche, Ergebniszeile,
 * Zeitraum und die geteilten Facetten schneiden, dazu als einzige eigene
 * Sektion die Wahl der Ansicht. Es gibt keinen ansichtseigenen Filterort mehr.
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
  buildDokumenttypen, buildRepertoire, buildPersonen, buildInstitutionen,
} from './statistik-sections.js';

// Die Ansichten in Lesereihenfolge; Single-Select, genau eine ist aktiv.
const SECTIONS = [
  { id: 'dokumenttypen', label: 'Dokumenttypen',      build: buildDokumenttypen },
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
  // Vor dem ersten rebuild() null, dann faellt das Geruest auf seine eigene
  // Rechnung zurueck statt eine Null zu zeigen.
  let cutSize = null;

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
    // Der Schnitt steht schon aus rebuild(); ohne diesen Weg loeste ihn das
    // Geruest fuer seine Wurzelzeile ein zweites Mal auf.
    getCount: () => cutSize,
    search: { placeholder: 'Signatur, Titel, Typ oder Datum' },
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
  // Erst jetzt steht die Schnittzahl, die die Wurzelzeile der Spalte nennt.
  sidebar.update();

  logStamp('statistik', [
    ['records', cutSize],
    ['ansichten', SECTIONS.length],
    ['aktiv', active],
    ['spanne', `${span.min}-${span.max}`],
  ]);
}
