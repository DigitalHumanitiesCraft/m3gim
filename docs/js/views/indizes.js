/**
 * M³GIM Indizes — eine Registerseite (E-226, E-227).
 *
 * Gezeigt wird genau ein Register (Personen, Organisationen, Orte, Werke); die
 * Wahl steht im Menue des Indizes-Tabs und im Pfad des Hash (`#indizes/personen`,
 * E-230). Der register-uebergreifende Facettenschnitt ist
 * entfallen: was die Register verbindet, ist das Umfeld eines aufgeklappten
 * Eintrags, das die ko-okkurrenten Entitaeten benennt, statt drei unsichtbare
 * Tabellen zu schneiden.
 *
 * Die Liste ist keine Tabelle mehr (E-227): ein Eintrag ist eine Zeile fester
 * Hoehe mit Name, kurzer Anreicherung, Zeitspanne, Belegzahl des Schnitts und
 * Wikidata-Marke.
 *
 * Ein Eintrag ist der Knotenpunkt, der an die Ansicht uebergibt, der die Ebene
 * gehoert, und keine dritte Darstellung davon (E-252). Die Belegliste ist
 * deshalb weg: die Dokumentpille fuehrt in den Bestand, gefiltert auf diese
 * Entitaet, wo Konvolut-Hierarchie, Facetten und Detail schon stehen. Das
 * Umfeld bleibt als kurze Orientierung mit hoechstens fuenf Chips je Familie,
 * „+N weitere" fuehrt ins Netzwerk mit diesem Eintrag als Fokus. Der Chevron
 * klappt auf, was darunter bleibt (Regel 17).
 */

import { el, clear, scrollBehavior } from '../utils/dom.js';
import {
  WIKIDATA_ICON_SVG, AGRELON_LABELS, NETZWERK_GLYPH_SVG, KARTE_GLYPH_SVG,
  DOKUMENT_GLYPH_SVG,
} from '../data/constants.js';
import {
  applyArchivFilter, navigateToView, getState,
} from '../ui/router.js';
import { onViewNavigate } from '../ui/events.js';
import { logStamp } from '../utils/env.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { buildHash } from '../ui/filter-url.js';
import { familyIcon } from '../ui/family-icons.js';
import { getFilter } from '../ui/filter-state.js';
import { recordsFor, yearBounds } from '../data/records-for.js';
import {
  getGridEntries, clearEntriesCache, entriesWithRecordsIn, filterEntries, sortEntries,
  buildUmfeld, workStageRoles, ambiguousWorkStageRoles, karteSelectableNames, cutCountOf,
  bestandFilterFor, entryYearSpan, entryRoles,
  REGISTER_KEYS, REGISTER_LABELS, REGISTER_FAMILY, REGISTER_ENTITY_TYPE,
} from './indizes-data.js';

let store = null;
let container = null;
let sidebar = null;

// Ids the name button points its aria-controls at; unique per page repaint.
let detailSeq = 0;

/** Umfeld-Chips je Familiengruppe; der Rest fuehrt ins Netzwerk (E-252). */
const UMFELD_LIMIT = 5;

/** Rollen-Chips an einem Werk, bevor „+N weitere" uebernimmt. */
const ROLE_LIMIT = 3;

// Ansichts-eigener Zustand. Register und Sortierung verankern die Seite und
// setzen keinen Dokumentschnitt, gehoeren also nicht in den geteilten Filter.
const local = {
  register: 'personen',
  sort: 'count',            // 'count' | 'alpha'
  expanded: null,           // Name des aufgeklappten Eintrags
  q: '',
};

// Die gezeichnete Eintragsmenge des Registers, ungeordnet. Ein Sortierwechsel
// ordnet sie neu und tauscht nur die Liste aus, statt den Schnitt neu zu rechnen.
let shownEntries = [];
let shownConfig = null;
// Die Dokumentmenge des gezeichneten Schnitts. Zeile, Zeitspanne und Umfeld
// lesen sie; ohne sie loeste jede Zeile den Schnitt ein weiteres Mal auf.
let cutRecordIds = null;
// Die Dokumentzahl des gezeichneten Schnitts fuer die Wurzelzeile der Spalte.
// Sie steht hier, weil renderRegister den Schnitt ohnehin aufloest; ohne sie
// rechnete das Geruest ihn ein zweites Mal. Vor dem ersten Zeichnen null, dann
// faellt das Geruest auf seine eigene Rechnung zurueck.
let cutSize = null;

/** Sortierzeichen im Strich der Tab-Symbole: absteigende Balken fuer die
 *  Belegzahl, A-Z fuer das Alphabet. */
const sortIcon = (paths) => '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"'
  + ' stroke="currentColor" stroke-width="2" stroke-linecap="round"'
  + ` stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

const SORTS = [
  {
    id: 'count', label: 'Belegzahl', tip: 'Nach Belegzahl sortiert',
    icon: sortIcon('<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h10"/>'
      + '<path d="M11 8h7"/><path d="M11 12h4"/>'),
  },
  {
    id: 'alpha', label: 'Alphabetisch', tip: 'Alphabetisch sortiert',
    icon: sortIcon('<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M20 8h-5"/>'
      + '<path d="M15 10V6.5a2.5 2.5 0 0 1 5 0V10"/><path d="M15 14h5l-5 6h5"/>'),
  },
];

/** Anreicherung neben dem Namen, je Register. */
const ENRICHMENTS = {
  personen: personEnrichment,
  organisationen: orgEnrichment,
  orte: ortEnrichment,
  werke: werkEnrichment,
};

// Beschriftung und Familie kommen aus der Datenschicht, damit das Menue am
// Indizes-Tab dieselben vier Namen fuehrt wie der Registerkopf (E-230).
const REGISTERS = Object.fromEntries(REGISTER_KEYS.map(key => [key, {
  label: REGISTER_LABELS[key],
  family: REGISTER_FAMILY[key],
  enrich: ENRICHMENTS[key],
}]));

/** Die Liste der Eintraege; das Registermenue im Kopf zeigt darauf. */
const LIST_ID = 'idx-register-list';

/**
 * Einen Eintrag im genannten Register oeffnen (Sprung aus einer anderen
 * Ansicht oder aus einem Umfeld-Chip).
 */
export function expandEntry(registerKey, entityName) {
  if (!REGISTERS[registerKey]) return;
  local.register = registerKey;
  local.expanded = entityName;
  redraw();
  requestAnimationFrame(() => {
    const expanded = document.querySelector('.idx-item--expanded');
    if (expanded) expanded.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
  });
}

// Ein Registerwechsel aus der Adresszeile (Reload, Zurueck-Taste, geteilter
// Link) erreicht die einmal gezeichnete Ansicht nur ueber diesen Kanal.
onViewNavigate('indizes', (detail) => {
  if (detail.register && REGISTERS[detail.register]) local.register = detail.register;
  if (detail.entry != null) {
    expandEntry(local.register, detail.entry);
    return;
  }
  redraw();
});

export function renderIndizes(storeRef, containerEl) {
  store = storeRef;
  container = containerEl;
  clearEntriesCache();  // Store kann sich geaendert haben -> Memo invalidieren
  clear(container);

  const fromHash = getState().indexRegister;
  if (fromHash && REGISTERS[fromHash]) local.register = fromHash;

  const wrapper = el('div', { className: 'idx-page view-main' });
  wrapper.appendChild(el('div', { className: 'idx-stage' }));

  const applyFacets = () => {
    local.expanded = null;
    renderRegister(wrapper);
    // The strip hangs beside the column and does not redraw itself; without
    // this it kept saying "kein Filter aktiv" while the register was already
    // cut (user-story audit 2026-09-04).
    if (sidebar) sidebar.update();
  };

  if (sidebar) sidebar.destroy();
  // Die Spalte traegt nur den geteilten Schnitt. Die Sortierung ordnet, was
  // gewaehlt ist, und steht deshalb im Kopf der Liste (E-230).
  sidebar = createSidebar(store, {
    yearSpan: yearBounds(store),
    getCount: () => cutSize,
    onChange: applyFacets,
    search: { placeholder: 'Signatur, Titel, Typ oder Datum' },
    sections: [{
      title: 'Registersuche',
      controls: [{
        kind: 'search', ariaLabel: 'Aktuelles Register durchsuchen',
        placeholder: 'Name im Register', value: () => local.q,
        onChange: (value) => { local.q = value; local.expanded = null; redraw(); },
      }],
    }],
  });

  wrapper.insertBefore(sidebar.strip, wrapper.firstChild);
  container.appendChild(viewShell(sidebar.element, wrapper));
  renderRegister(wrapper);
  // Erst jetzt steht die Schnittzahl, die die Wurzelzeile der Spalte nennt.
  sidebar.update();
}

function redraw() {
  const wrapper = container?.querySelector('.idx-page');
  if (!wrapper) return;
  renderRegister(wrapper);
  if (sidebar) sidebar.update();
}

/**
 * Einen Eintrag auf- oder zuklappen. `keepFocus` bringt den Fokus nach dem
 * Neuzeichnen auf denselben Namensknopf zurueck, sonst faellt er bei jeder
 * Tastaturbedienung auf den Seitenanfang (E-214).
 */
function toggleEntry(name, { keepFocus = false } = {}) {
  local.expanded = local.expanded === name ? null : name;
  redraw();
  if (!keepFocus) return;
  const page = container?.querySelector('.idx-page');
  for (const row of (page ? page.querySelectorAll('.idx-item') : [])) {
    if (row.dataset.entry === name) { row.focus(); return; }
  }
}

/**
 * Die schmale Kopfzeile ueber der Liste: links das gezeichnete Register mit
 * Familiensymbol, Namen und der Zahl des Schnitts, rechts die Sortierung. Die
 * Registerwahl liegt seit E-230 im Menue des Indizes-Tabs, weil sie die Seite
 * verankert und nicht in die Arbeitsflaeche gehoert.
 */
function buildHead(config, shown, total) {
  const head = el('div', { className: `idx-head idx-head--${config.family}` });
  const cutting = shown < total;
  head.appendChild(el('div', { className: 'idx-head__register' },
    el('span', {
      className: `idx-head__icon fam-mark fam-mark--${config.family}`,
      dataset: { tip: `Register ${config.label}`, tipWrap: '' },
    }, familyIcon(config.family, { size: 15 })),
    el('span', { className: 'idx-head__label' }, config.label),
    // Sichtbar steht die Zahl des Schnitts; das Paar „54 von 102" las sich als
    // Rest statt als Schnitt und liegt deshalb im Tooltip (Projektleitung,
    // 2026-09-05), nach derselben Regel wie die Wurzelzeile der Seitenleiste.
    el('span', {
      className: 'idx-head__count',
      dataset: {
        tip: cutting
          ? `${shown} von ${total} Einträgen, die übrigen liegen außerhalb des Filters`
          : `${total} Einträge mit verknüpften Dokumenten`,
        tipWrap: '',
      },
    }, String(cutting ? shown : total)),
  ));

  // Zwei Umschaltknoepfe statt einer Radiogruppe: jeder ist fuer sich mit der
  // Tabulatortaste erreichbar und sagt seinen Zustand ueber aria-pressed, ohne
  // ein eigenes Pfeiltastenmodell. Das Zeichen traegt die Ordnung, der Name
  // steht im Tooltip und im aria-label (Regel 8).
  const sort = el('div', { className: 'idx-sort', role: 'group', 'aria-label': 'Sortierung' });
  for (const option of SORTS) {
    sort.appendChild(el('button', {
      className: 'idx-sort__btn', type: 'button',
      dataset: { sort: option.id, tip: option.tip, tipPos: 'bottom-right', tipWrap: '' },
      'aria-label': option.label,
      'aria-pressed': String(option.id === local.sort),
      html: option.icon,
      onClick: () => selectSort(option.id),
    }));
  }
  head.appendChild(sort);
  return head;
}

/** Sortierwechsel: er ordnet nur, also wird die Liste getauscht, nicht die Seite. */
function selectSort(id) {
  if (id === local.sort) return;
  local.sort = id;
  local.expanded = null;
  const page = container?.querySelector('.idx-page');
  const body = page?.querySelector(`#${LIST_ID}`);
  if (!body || !shownConfig) return;
  for (const btn of page.querySelectorAll('.idx-sort__btn')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.sort === local.sort));
  }
  clear(body);
  fillList(body, sortEntries(shownEntries, local.sort), shownConfig);
}

/** Der geteilte Schnitt als Dokumentmenge des Registers. */
function cutIds() {
  return recordsFor(store, getFilter()).ids;
}

function renderRegister(wrapper) {
  const stage = wrapper.querySelector('.idx-stage');
  if (!stage) return;
  clear(stage);

  const config = REGISTERS[local.register];
  const register = getGridEntries(store, local.register);
  const ids = cutIds();
  cutRecordIds = ids;
  cutSize = ids.size;
  const all = entriesWithRecordsIn(register, ids);
  shownEntries = filterEntries(all, local.register, local);
  shownConfig = config;

  stage.appendChild(buildRegister(config, sortEntries(shownEntries, local.sort), register.length));

  // Der Stempel nennt das gezeichnete Register und seine Zahlen. Die drei
  // uebrigen Register mitzuzaehlen war Diagnose fuer eine Seite, die alle vier
  // zugleich zeigte; seit E-226 kostet es drei Durchlaeufe ueber den Store und
  // sagt nichts ueber das Bild (Frontend-Audit 2026-09-04).
  logStamp('indizes', [
    ['register', local.register],
    ['eintraege', shownEntries.length],
    ['gesamt', register.length],
    ['sortierung', local.sort],
  ]);
}

function buildRegister(config, entries, total) {
  const grid = el('div', { className: 'idx-grid' });
  grid.appendChild(buildHead(config, entries.length, total));

  const body = el('div', { className: 'idx-list', id: LIST_ID });
  fillList(body, entries, config);
  grid.appendChild(body);
  return grid;
}

function fillList(body, entries, config) {
  for (const entry of entries) {
    const isExpanded = local.expanded === entry.name;
    const detailId = `idx-detail-${++detailSeq}`;
    body.appendChild(buildItem(entry, config, isExpanded, detailId));
    if (isExpanded) body.appendChild(renderExpanded(entry, detailId));
  }
}

// =========================================================================
// Eintragszeile
// =========================================================================

/**
 * Ein Eintrag ist eine Zeile fester Hoehe: Chevron, Name, kurze Anreicherung,
 * Zeitspanne der Belege, die Belegzahl des Schnitts und die Wikidata-Marke.
 * Alles, was die Hoehe sprengt, steht im aufgeklappten Eintrag (E-227). Ein
 * fehlender Wert laesst seinen Platz leer, kein Platzhalterwort.
 *
 * Ein Element, eine Funktion: die ganze Zeile klappt den Eintrag auf und zu,
 * der Name eingeschlossen, und traegt Tastaturbedienung wie eine Bestandszeile
 * (E-214, E-217). In den Bestand fuehrt allein die Dokumentpille
 * (Projektleitung, 2026-09-05).
 */
function buildItem(entry, config, isExpanded, detailId) {
  const item = el('div', {
    className: `idx-item ${isExpanded ? 'idx-item--expanded' : ''}`,
    dataset: { entry: entry.name },
    tabindex: '0',
    'aria-expanded': String(isExpanded),
    onClick: () => toggleEntry(entry.name),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleEntry(entry.name, { keepFocus: true });
        return;
      }
      if (e.key !== 'Escape' || !isExpanded) return;
      e.preventDefault();
      toggleEntry(entry.name, { keepFocus: true });
    },
  });
  if (isExpanded) item.setAttribute('aria-controls', detailId);

  // Ein Zeichen, eine Bedeutung: der Chevron klappt auf, hier wie im Bestand
  // (Regel 17). Der Sprung haengt allein an der Dokumentpille.
  item.appendChild(el('span', {
    className: `idx-chevron ${isExpanded ? 'idx-chevron--open' : ''}`.trim(),
    'aria-hidden': 'true',
  }, '›'));

  // Der Name traegt kein eigenes Ziel: er ist das Hauptwort der Zeile und
  // klappt mit ihr auf.
  item.appendChild(el('span', { className: 'idx-name' }, entry.name));

  const jump = jumpTargetFor(entry.name);

  // Anreicherung und die beiden Aktionen stehen in einer Gruppe, damit die
  // Dokumentpille direkt hinter dem Wert steht und nicht am rechten Rand
  // (Projektleitung, 2026-09-05). Zeitspanne und Wikidata-Marke bleiben rechts
  // als Nebenangaben.
  const cut = cutCountOf(entry);
  item.appendChild(el('div', { className: 'idx-item__mid' },
    config.enrich(entry) || el('span', { className: 'idx-enrich' }),
    // Der einzige Weg der Zeile in den Bestand. Der Sprung steht schon im href,
    // sonst oeffnet Mittel- oder Strg-Klick den ungefilterten Bestand
    // (Frontend-Audit 2026-09-04).
    el('a', {
      className: 'idx-doclink',
      href: jump.href,
      dataset: {
        tip: `Diese ${cut} Dokument${cut === 1 ? '' : 'e'} im Bestand öffnen`,
        tipWrap: '',
      },
      'aria-label': `Diese ${cut} Dokument${cut === 1 ? '' : 'e'} im Bestand öffnen`,
      onClick: (e) => { e.preventDefault(); e.stopPropagation(); jump.go(); },
    },
      el('span', { className: 'idx-doclink__icon', html: DOKUMENT_GLYPH_SVG }),
      el('span', { className: 'idx-doclink__label' },
        `${cut} Dokument${cut === 1 ? '' : 'e'}`),
      el('span', { className: 'idx-doclink__arrow', 'aria-hidden': 'true' }, '→')),
    el('button', {
      className: 'idx-jump idx-jump--row', type: 'button',
      dataset: { tip: `Umgebung von ${entry.name} im Netzwerk öffnen`, tipWrap: '' },
      'aria-label': `Umgebung von ${entry.name} im Netzwerk öffnen`,
      html: NETZWERK_GLYPH_SVG,
      onClick: (e) => { e.stopPropagation(); openNetzwerkFocus(entry.name); },
    }),
    // Die Karte waehlt Personen, Organisationen und seit dem Werk-Knoten der
    // Kartendaten auch Werke als Entitaet (E-126), zeigt aber nur verortete
    // Belege. Ohne einen solchen Beleg landet der Sprung auf einer leeren
    // Karte, deshalb steht der Knopf dort gar nicht erst.
    karteReady(entry.name)
      ? el('button', {
          className: 'idx-jump idx-jump--row', type: 'button',
          dataset: { tip: `${entry.name} auf der Karte öffnen`, tipWrap: '' },
          'aria-label': `${entry.name} auf der Karte öffnen`,
          html: KARTE_GLYPH_SVG,
          onClick: (e) => {
            e.stopPropagation();
            navigateToView('karte', { entity: entry.name });
          },
        })
      : null,
  ));

  item.appendChild(buildSpanCell(entry));
  item.appendChild(el('span', { className: 'idx-item__wd' }, wikidataMark(entry)));
  return item;
}

/** Ob die Karte diesen Eintrag ueberhaupt zeigen kann. Das Ortsregister bleibt
 *  aussen vor, dort waere der Sprung der Ort auf sich selbst. */
function karteReady(name) {
  return local.register !== 'orte' && karteSelectableNames(store).has(name);
}

/** Diesen Eintrag als Fokus des Netzwerks oeffnen. */
function openNetzwerkFocus(name) {
  navigateToView('netzwerk', {
    focus: { type: REGISTER_ENTITY_TYPE[local.register], name },
  });
}

/**
 * Der Weg in den Bestand, den die Dokumentpille traegt: dasselbe href fuer den
 * Mittelklick und derselbe Schnitt fuer den Klick.
 */
function jumpTargetFor(name) {
  const filter = bestandFilterFor(local.register, getFilter(), name);
  return {
    href: filter ? buildHash('bestand', null, filter) : '#bestand',
    go: () => navigateToBestandFiltered(name),
  };
}

/**
 * Die Zeitspanne der Belege in der Zeile. Sie steht in keiner Quellzeile,
 * sondern faellt aus den datierten verknuepften Dokumenten, und traegt deshalb
 * die Marke aus Regel 16 (E-216).
 */
function buildSpanCell(entry) {
  const span = entryYearSpan(store, entry, cutRecordIds);
  if (!span) return el('span', { className: 'idx-item__span' });
  const text = span.from === span.to ? String(span.from) : `${span.from}–${span.to}`;
  return el('span', {
    className: 'idx-item__span mark-derived',
    dataset: {
      tip: 'ergänzt: erstes und letztes datierte Dokument dieses Eintrags im Schnitt. '
        + 'Undatierte Belege bleiben außen vor.',
      tipWrap: '',
    },
  }, text);
}

/** Die Wikidata-Spalte: einfarbige Marke oder leer, keine zweite Farbe. */
function wikidataMark(entry) {
  const wd = entry.wikidata ? String(entry.wikidata) : '';
  if (!wd.startsWith('wd:')) return null;
  const qid = wd.replace('wd:', '');
  return el('a', {
    className: 'idx-wd-link',
    href: `https://www.wikidata.org/entity/${qid}`,
    target: '_blank',
    rel: 'noopener noreferrer',
    dataset: { tip: `Wikidata ${qid}`, tipPos: 'bottom-right' },
    'aria-label': `Wikidata ${qid}`,
    html: WIKIDATA_ICON_SVG,
    onClick: (e) => e.stopPropagation(),
  });
}

/** Die Q-Id eines Eintrags, oder leer. */
function qidOf(entry) {
  const wd = entry.wikidata ? String(entry.wikidata) : '';
  return wd.startsWith('wd:') ? wd.replace('wd:', '') : '';
}

/**
 * Die Anreicherung neben dem Namen. Ein ergaenzter Wert traegt die Marke aus
 * Regel 16 nur zusammen mit einem Tooltip, der mit „ergänzt: " beginnt und die
 * Herleitung nennt; ohne ihn stuende die Marke fuer eine Herkunft, die die
 * Ansicht nicht sagt (E-216).
 */
function enrichEl(text, { tip = '', derived = true, className = '' } = {}) {
  if (!text) return null;
  const marked = derived && tip.startsWith('ergänzt: ');
  const props = { className: `idx-enrich ${marked ? 'mark-derived' : ''} ${className}`.trim() };
  if (tip) props.dataset = { tip, tipWrap: '' };
  return el('span', props, text);
}

/**
 * Beruf, Stimmfach und Lebensdaten kommen aus der Wikidata-Anreicherung und
 * nicht aus dem Bestand, tragen also die Marke aus Regel 16 (E-216). In die
 * Zeile geht der erste Beruf, die uebrigen nennt der Tooltip (E-227).
 */
function personEnrichment(entry) {
  const occ = entry.occupation
    ? (Array.isArray(entry.occupation) ? entry.occupation : [entry.occupation])
    : [];
  const parts = [];
  if (occ.length > 0) parts.push(occ[0]);
  if (entry.voiceType) parts.push(entry.voiceType);
  if (entry.birthDate || entry.deathDate) {
    const birth = entry.birthDate ? entry.birthDate.slice(0, 4) : '?';
    const death = entry.deathDate ? entry.deathDate.slice(0, 4) : '';
    parts.push(death ? `${birth}–${death}` : `*${birth}`);
  }
  if (parts.length === 0) return null;
  const qid = qidOf(entry);
  const rest = occ.slice(1);
  return enrichEl(parts.join(' · '), {
    tip: `ergänzt: aus Wikidata${qid ? ` ${qid}` : ''}.`
      + (rest.length > 0 ? ` Weitere Berufe: ${rest.join(', ')}.` : ''),
  });
}

function orgEnrichment(entry) {
  return enrichEl(entry.sitz, {
    tip: 'ergänzt: Sitz aus dem Organisationsindex, ersatzweise aus Wikidata.',
  });
}

function ortEnrichment(entry) {
  return enrichEl(entry.land, {
    tip: 'ergänzt: Land aus den verorteten Belegen dieser Stadt.',
  });
}

/** Der Komponist steht in der Quellzeile und traegt deshalb keine Marke. */
function werkEnrichment(entry) {
  return enrichEl(entry.komponist, { derived: false, className: 'idx-komponist' });
}

/**
 * Gruppiert Relationen pro Typ, zaehlt Mehrfach-Vorkommen, baut Chips.
 * Klick auf Chip oeffnet den Beleg-Record im Archiv via Hash-Navigation.
 */
function buildRelationBadges(relations) {
  const byType = new Map();
  for (const rel of relations) {
    if (!rel || !rel.type) continue;
    if (!byType.has(rel.type)) byType.set(rel.type, []);
    byType.get(rel.type).push(rel);
  }
  if (byType.size === 0) return null;

  const wrap = el('div', { className: 'idx-relations' });
  for (const [type, rels] of byType) {
    const label = AGRELON_LABELS[type] || type.replace(/^agrelon:Has/, '');
    const count = rels.length;
    const first = rels[0];
    const tipParts = [`Beleg: ${first.recordId.replace(/^m3gim-data:/, '')}`];
    if (first.xlsxSource && first.xlsxSource.row) {
      tipParts.push(`Quelle: ${first.xlsxSource.sheet || 'XLSX'} Zeile ${first.xlsxSource.row}`);
    }
    if (count > 1) tipParts.push(`${count} Belege gesamt`);
    const chip = el('span', {
      className: 'chip chip--role-pair chip--c-beziehung chip--clickable',
      dataset: { tip: tipParts.join(' · ') },
      onClick: (e) => {
        e.stopPropagation();
        // Open the first Beleg of this type in the Bestand view. Through the
        // router, so the hash keeps the shared filter (user-story audit
        // 2026-09-03).
        navigateToView('bestand', { recordId: first.recordId });
      },
    },
      el('span', { className: 'chip-rolle' }, label.toUpperCase()),
      count > 1
        ? el('span', { className: 'chip-wert' }, `× ${count}`)
        : el('span', { className: 'chip-wert' }, ''),
    );
    wrap.appendChild(chip);
  }
  return wrap;
}

/**
 * Die Buehnenrollen eines Werks. Die kuratierte Partie steht als Quellangabe
 * ohne Marke, die aus den Belegen geschlossenen Rollen tragen die Marke aus
 * Regel 16 samt ihrer Herleitung (E-216).
 */
function buildStageRoleChips(entry) {
  // Die kuratierte Partie steht schon als Quellangabe; sie noch einmal als
  // abgeleitete Rolle zu zeigen, verdoppelt dieselbe Aussage.
  const derived = (workStageRoles(store, cutRecordIds).get(entry.name) || [])
    .filter(r => r.name !== entry.partie);
  const ambiguous = ambiguousWorkStageRoles(store, cutRecordIds).get(entry.name) || 0;
  if (!entry.partie && derived.length === 0 && ambiguous === 0) return null;
  const wrap = el('div', { className: 'idx-relations idx-rollen' });
  if (entry.partie) {
    wrap.appendChild(el('span', { className: 'chip chip--role-pair chip--c-rolle' },
      el('span', { className: 'chip-rolle' }, 'PARTIE'),
      el('span', { className: 'chip-wert' }, entry.partie)));
  }
  const shown = derived.slice(0, ROLE_LIMIT);
  const rest = derived.slice(ROLE_LIMIT);
  for (const role of shown) {
    wrap.appendChild(el('span', {
      className: 'chip chip--role-pair chip--c-rolle mark-derived',
      dataset: {
        tip: `ergänzt: Rolle aus ${role.count} Beleg${role.count === 1 ? '' : 'en'}, `
          + 'die genau dieses Werk nennen',
        tipWrap: '',
      },
    },
      el('span', { className: 'chip-rolle' }, 'ROLLE'),
      el('span', { className: 'chip-wert' }, role.name)));
  }
  if (rest.length > 0) {
    wrap.appendChild(el('span', {
      className: 'chip chip--role-pair chip--c-rolle mark-derived',
      dataset: { tip: `ergänzt: ${rest.map(r => r.name).join(', ')}`, tipWrap: '' },
    },
      el('span', { className: 'chip-wert' }, `+${rest.length} weitere`)));
  }
  if (ambiguous > 0) {
    wrap.appendChild(el('span', {
      className: 'chip chip--role-pair chip--c-rolle',
      dataset: {
        tip: `${ambiguous} Beleg${ambiguous === 1 ? '' : 'e'} nennen mehrere Werke oder Rollen; keine Partie wurde zugeordnet`,
        tipWrap: '',
      },
    },
      el('span', { className: 'chip-rolle' }, 'MEHRDEUTIG'),
      el('span', { className: 'chip-wert' }, `× ${ambiguous}`)));
  }
  return wrap;
}

/**
 * Die Rollen, in denen ein Eintrag im Bestand auftritt, als Chips mit der Zahl
 * der Dokumente (E-252). Das Rollenvokabular steht an den Verknuepfungen der
 * Quelle, die Chips zeigen es unveraendert; die Zahl ist die des Schnitts, also
 * dieselbe Menge, die die Dokumentpille der Zeile meint. Jedes Register zeigt
 * die Rollen, die seine Verknuepfungsart hergibt, ein Ort also Auffuehrungsort
 * oder Absendeort; wo die Quelle keine Rolle fuehrt, faellt die Zeile weg.
 */
function buildEntityRoleChips(entry) {
  const roles = entryRoles(store, local.register, entry, cutRecordIds);
  if (roles.length === 0) return null;
  const wrap = el('div', { className: 'idx-relations idx-rollen' });
  for (const role of roles) {
    wrap.appendChild(el('span', {
      className: 'chip chip--role-pair chip--c-rolle',
      dataset: {
        tip: `${role.count} Dokument${role.count === 1 ? '' : 'e'} führen `
          + `${entry.name} in dieser Rolle`,
        tipWrap: '',
      },
    },
      el('span', { className: 'chip-rolle' }, String(role.name).toUpperCase()),
      el('span', { className: 'chip-wert' }, String(role.count))));
  }
  return wrap;
}

// =========================================================================
// Aufgeklappter Eintrag
// =========================================================================

/**
 * Der Suchbegriff war das Mittel, den Eintrag zu finden, und kein Schnitt, den
 * das Ziel behalten soll: im Zielregister schneidet er die Namensliste und der
 * gemeinte Eintrag steht nicht darin, in Netzwerk und Karte verengt er
 * stillschweigend die Dokumentmenge der Entitaet. Dieselbe Ueberlegung wie beim
 * Sprung in den Bestand (user-story audit 2026-09-04).
 */
function renderExpanded(entry, detailId) {
  const children = [];
  // Beziehungs- und Rollen-Chips standen an der Zeile und gaben ihr eine
  // vierte Hoehe; sie eroeffnen jetzt den aufgeklappten Eintrag (E-227).
  const chips = el('div', { className: 'idx-detail__chips' });
  const rollen = buildEntityRoleChips(entry);
  if (rollen) chips.appendChild(rollen);
  if (entry.relations && entry.relations.length > 0) {
    const relEl = buildRelationBadges(entry.relations);
    if (relEl) chips.appendChild(relEl);
  }
  if (local.register === 'werke') {
    const partien = buildStageRoleChips(entry);
    if (partien) chips.appendChild(partien);
  }
  if (chips.childElementCount > 0) children.push(chips);

  const umfeld = renderUmfeld(entry);
  if (umfeld) children.push(umfeld);

  return el('div', { className: 'idx-detail', id: detailId }, ...children);
}

/**
 * Das Umfeld nach Familie gruppiert, hoechstens fuenf Chips je Familie (E-252).
 * Die Chips bleiben neutral (Regel 2), ihre Familie sagt das farbige Symbol
 * davor; die Zahl der gemeinsamen Dokumente steht im Tooltip, weil die Zeile
 * sonst zur Zahlenkolonne wird (Regel 8).
 *
 * Der Rest wird hier nicht mehr aufgeblaettert. „+N weitere" fuehrt ins
 * Netzwerk mit diesem Eintrag als Fokus, der Ansicht, der das Umfeld gehoert;
 * an Ort und Stelle waren es bei 173 Namen Zahlenkolonnen ohne Beziehung.
 */
function renderUmfeld(entry) {
  const groups = buildUmfeld(store, local.register, entry,
    { limit: UMFELD_LIMIT, recordIds: cutRecordIds });
  if (groups.length === 0) return null;

  const wrap = el('div', { className: 'idx-umfeld' });
  for (const group of groups) {
    wrap.appendChild(el('div', { className: 'idx-umfeld__group' },
      el('span', {
        className: 'idx-umfeld__label',
        // Die Herkunft des Umfelds nennt der Tooltip. Die gepunktete Marke aus
        // Regel 16 steht hier nicht: sie las sich am Gruppentitel als Link,
        // der nichts ausloest (Projektleitung, 2026-09-05).
        dataset: {
          tip: `ergänzt: Ko-Okkurrenz im selben Dokument, aus den `
            + `Archivdatensätzen abgeleitet. Inhaltsfamilie ${group.label}.`
            + (group.omitsNachlassbildnerin
              ? ' Die Nachlassbildnerin steht in fast jedem Dokument und bleibt ausgenommen.'
              : ''),
          tipWrap: '',
        },
      },
        familyIcon(group.family, { size: 12, className: `fam-mark fam-mark--${group.family}` }),
        el('span', {}, group.label)),
      umfeldChips(group, entry),
    ));
  }
  return wrap;
}

/** Chipzeile einer Gruppe; der Rest fuehrt ins Netzwerk. */
function umfeldChips(group, entry) {
  const box = el('div', { className: 'idx-umfeld__chips' });
  for (const item of group.items) box.appendChild(umfeldChip(group, item));
  if (group.rest.length > 0) {
    box.appendChild(el('button', {
      className: 'chip chip--role-pair chip--c-neutral chip--clickable idx-umfeld__more',
      type: 'button',
      dataset: {
        tip: `Öffnet das Netzwerk mit ${entry.name} als Fokus; dort steht das `
          + 'ganze Umfeld mit seinen Beziehungen.',
        tipWrap: '',
      },
      'aria-label': `${group.rest.length} weitere ${group.label} im Netzwerk`,
      onClick: (e) => { e.stopPropagation(); openNetzwerkFocus(entry.name); },
    }, el('span', { className: 'chip-wert' }, `+${group.rest.length} weitere`)));
  }
  return box;
}

function umfeldChip(group, item) {
  return el('button', {
    className: 'chip chip--role-pair chip--c-neutral chip--clickable',
    type: 'button',
    dataset: {
      tip: `${item.count} gemeinsame${item.count === 1 ? 's' : ''} Dokument${item.count === 1 ? '' : 'e'}. `
        + `Öffnet den Eintrag im Register ${group.label}.`,
      tipWrap: '',
    },
    onClick: (e) => {
      e.stopPropagation();
      navigateToView('indizes', { register: group.key, entry: item.name });
    },
  },
    el('span', { className: `idx-umfeld__mark fam-mark fam-mark--${group.family}` },
      familyIcon(group.family, { size: 11 })),
    el('span', { className: 'chip-wert' }, item.name),
  );
}

/**
 * Switch to the Bestand with this entry pre-set as a filter. Bis dahin lief
 * das ueber ein `m3gim:archiv-filter`-Event, fuer das kein Handler registriert
 * war; applyArchivFilter navigiert selbst (Tab-Wechsel plus Hash).
 */
function navigateToBestandFiltered(name) {
  const facet = REGISTER_ENTITY_TYPE[local.register];
  if (!facet) return;
  applyArchivFilter(facet, name);
}
