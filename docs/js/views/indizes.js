/**
 * M³GIM Indizes — eine Registerseite (E-226, E-227).
 *
 * Gezeigt wird genau ein Register (Personen, Organisationen, Orte, Werke); die
 * Wahl steht als segmentierte Kopfzeile ueber der Liste und im Pfad des Hash
 * (`#indizes/personen`). Der register-uebergreifende Facettenschnitt ist
 * entfallen: was die Register verbindet, ist das Umfeld eines aufgeklappten
 * Eintrags, das die ko-okkurrenten Entitaeten benennt, statt drei unsichtbare
 * Tabellen zu schneiden.
 *
 * Die Liste ist keine Tabelle mehr (E-227): ein Eintrag ist eine Zeile fester
 * Hoehe mit Name, kurzer Anreicherung, Belegzahl des Schnitts und Wikidata-Marke.
 * Beziehungs- und Rollen-Chips stehen im aufgeklappten Eintrag, weil vier
 * verschiedene Zeilenhoehen die Liste unruhig machten.
 */

import { el, clear, scrollBehavior } from '../utils/dom.js';
import { formatSignatur, getDocTypeId, truncate, dftLabel } from '../utils/format.js';
import { WIKIDATA_ICON_SVG, AGRELON_LABELS, NETZWERK_GLYPH_SVG, KARTE_GLYPH_SVG, korbIcon, korbTip } from '../data/constants.js';
import {
  selectRecord, applyArchivFilter, navigateToView, getState, setIndexRegister,
} from '../ui/router.js';
import { onViewNavigate } from '../ui/events.js';
import { toggleKorb, isInKorb } from '../ui/basket.js';
import { logStamp } from '../utils/env.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { buildHash } from '../ui/filter-url.js';
import { nextTabIndex, setRovingTabindex } from '../ui/tabs.js';
import { familyIcon } from '../ui/family-icons.js';
import { getFilter, setFilter, facetValues, isTouched } from '../ui/filter-state.js';
import { recordsFor, STAND_DEFAULT } from '../data/records-for.js';
import {
  getGridEntries, clearEntriesCache, entriesWithRecordsIn, filterEntries, sortEntries,
  hasWikidata, buildUmfeld, workStageRoles, karteSelectableNames, cutCountOf,
} from './indizes-data.js';

let store = null;
let container = null;
let sidebar = null;

// Ids the name button points its aria-controls at; unique per page repaint.
let detailSeq = 0;

/** Max records shown in expanded detail before "show all" link */
const DETAIL_LIMIT = 10;

/** Umfeld-Chips je Familiengruppe, bevor „+N weitere" uebernimmt. */
const UMFELD_LIMIT = 8;

/** Rollen-Chips an einem Werk, bevor „+N weitere" uebernimmt. */
const ROLE_LIMIT = 3;

// Wikidata-Abdeckung des gezeichneten Registers im aktuellen Schnitt; die
// Schalter der Sidebar lesen sie, nachdem renderRegister sie gesetzt hat.
let wdStats = { total: 0, linked: 0 };

const wdPercent = () => (wdStats.total > 0 ? Math.round(wdStats.linked / wdStats.total * 100) : 0);

// Ansichts-eigener Zustand. Register und Sortierung verankern die Seite und
// setzen keinen Dokumentschnitt, gehoeren also nicht in den geteilten Filter.
const local = {
  register: 'personen',
  sort: 'count',            // 'count' | 'alpha'
  expanded: null,           // Name des aufgeklappten Eintrags
  withWikidata: false,
  withoutWikidata: false,   // die Reconciliation-Liste (E-226)
  q: '',
};

const SORTS = [
  { id: 'count', label: 'Belegzahl' },
  { id: 'alpha', label: 'Alphabetisch' },
];

const REGISTERS = {
  personen: { label: 'Personen', family: 'person', enrich: personEnrichment },
  organisationen: { label: 'Organisationen', family: 'institution', enrich: orgEnrichment },
  orte: { label: 'Orte', family: 'ort', enrich: ortEnrichment },
  werke: { label: 'Werke', family: 'werk', enrich: werkEnrichment },
};

/** Die Liste, auf die der Registerwaehler als Tablist zeigt. */
const LIST_ID = 'idx-register-list';

/** Register -> Facette des geteilten Filters. */
const GRID_FACET = {
  personen: 'person',
  organisationen: 'institution',
  orte: 'location',
  werke: 'werk',
};

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
  sidebar = createSidebar(store, {
    onChange: () => { local.q = (getFilter().search || '').toLowerCase(); applyFacets(); },
    search: { placeholder: 'Name' },
    sections: [
      {
        title: 'Sortierung',
        controls: [{
          kind: 'legend',
          // Neutrale Swatch: die Sortierung traegt keine Leitfarbe.
          items: SORTS.map(s => ({ id: s.id, label: s.label, color: 'var(--color-text-tertiary)' })),
          isActive: (id) => id === local.sort,
          onToggle: (id) => { local.sort = id; renderRegister(wrapper); },
        }],
      },
      {
        title: 'Normdaten',
        controls: [
          {
            // Die Abdeckung stand als Prozentbadge im Kopf der Liste und
            // widersprach dort den uebrigen Zahlen; sie gehoert an den Schalter,
            // der sie bedient (E-227).
            kind: 'toggle', label: () => `Nur mit Wikidata (${wdStats.linked})`,
            tip: () => `${wdPercent()} % der Einträge im Schnitt sind mit Wikidata verknüpft.`,
            value: () => local.withWikidata,
            onChange: (v) => {
              local.withWikidata = v;
              if (v) local.withoutWikidata = false;
              applyFacets();
            },
          },
          {
            kind: 'toggle',
            label: () => `Nur ohne Wikidata (${wdStats.total - wdStats.linked})`,
            tip: () => `${wdStats.total - wdStats.linked} von ${wdStats.total} Einträgen `
              + `im Schnitt warten auf die nächste Reconciliation-Runde.`,
            value: () => local.withoutWikidata,
            onChange: (v) => {
              local.withoutWikidata = v;
              if (v) local.withWikidata = false;
              applyFacets();
            },
          },
        ],
      },
    ],
    // Die Normdaten-Verengung ist ansichtslokal und schneidet doch die Liste,
    // steht also wie die Entitaet der Karte als Chip im Streifen (E-223).
    localChips: () => {
      const chips = [];
      if (local.withWikidata) {
        chips.push({ label: 'mit Wikidata', onRemove: () => { local.withWikidata = false; applyFacets(); } });
      }
      if (local.withoutWikidata) {
        chips.push({ label: 'ohne Wikidata', onRemove: () => { local.withoutWikidata = false; applyFacets(); } });
      }
      return chips.length ? [{ title: 'Normdaten', chips }] : [];
    },
  });

  wrapper.insertBefore(sidebar.strip, wrapper.firstChild);
  container.appendChild(viewShell(sidebar.element, wrapper));
  local.q = (getFilter().search || '').toLowerCase();
  renderRegister(wrapper);
  // Die Schalter der Normdaten tragen Zahlen aus dem gezeichneten Register; vor
  // dem ersten Lauf von renderRegister stuenden dort Nullen.
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
  for (const btn of (page ? page.querySelectorAll('.idx-name') : [])) {
    if (btn.dataset.entry === name) { btn.focus(); return; }
  }
}

/**
 * Der Registerwaehler steht als segmentierte Kopfzeile ueber der Liste, nicht
 * mehr in der Sidebar: er verankert die Seite, statt sie zu schneiden, und
 * unter der Sidebar lag er unter dem Falz (E-227). Er ist zugleich die Legende
 * der vier Inhaltsfamilien, jedes Segment mit dem Familiensymbol in
 * Familienfarbe (E-212). Als seitenintere Ansichtswahl traegt er das
 * Tablist-Muster samt Roving Tabindex und Pfeiltasten (E-160).
 */
function buildChooser(shown, total) {
  const bar = el('div', {
    className: 'idx-chooser', role: 'tablist', 'aria-label': 'Register',
  });
  const keys = Object.keys(REGISTERS);
  for (const [key, config] of Object.entries(REGISTERS)) {
    const on = key === local.register;
    bar.appendChild(el('button', {
      className: `idx-seg idx-seg--${config.family} ${on ? 'idx-seg--on' : ''}`,
      type: 'button', role: 'tab',
      'aria-selected': String(on),
      'aria-controls': LIST_ID,
      tabindex: on ? '0' : '-1',
      onClick: () => selectRegister(key),
    },
      el('span', { className: `idx-seg__icon fam-mark fam-mark--${config.family}` },
        familyIcon(config.family, { size: 15 })),
      el('span', { className: 'idx-seg__label' }, config.label),
      on
        ? el('span', {
            className: 'idx-seg__count',
            dataset: { tip: `${shown} von ${total} Einträgen des Registers`, tipWrap: '' },
          }, `${shown} von ${total}`)
        : null,
    ));
  }
  bar.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const segs = [...bar.querySelectorAll('.idx-seg')];
    const current = Math.max(0, segs.indexOf(document.activeElement));
    const next = nextTabIndex(e.key, current, segs.length);
    if (next == null) return;
    e.preventDefault();
    selectRegister(keys[next]);
    // Der Neuaufbau hat die Segmente ersetzt; der Fokus geht auf den neuen Knopf.
    const repainted = [...(container?.querySelectorAll('.idx-seg') || [])];
    setRovingTabindex(repainted, next);
    if (repainted[next]) repainted[next].focus();
  });
  return bar;
}

function selectRegister(key) {
  if (key === local.register) return;
  local.register = key;
  local.expanded = null;
  setIndexRegister(key);
  redraw();
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
  const all = entriesWithRecordsIn(register, cutIds());
  const entries = sortEntries(filterEntries(all, local.register, local), local.sort);
  wdStats = { total: all.length, linked: all.filter(hasWikidata).length };

  stage.appendChild(buildRegister(config, entries, register.length));

  // Der Stempel nennt das gezeichnete Register und seine Zahlen. Die drei
  // uebrigen Register mitzuzaehlen war Diagnose fuer eine Seite, die alle vier
  // zugleich zeigte; seit E-226 kostet es drei Durchlaeufe ueber den Store und
  // sagt nichts ueber das Bild (Frontend-Audit 2026-09-04).
  logStamp('indizes', [
    ['register', local.register],
    ['eintraege', entries.length],
    ['gesamt', register.length],
    ['sortierung', local.sort],
    ['wikidata', local.withWikidata ? 'nur mit' : (local.withoutWikidata ? 'nur ohne' : 'alle')],
  ]);
}

function buildRegister(config, entries, total) {
  const grid = el('div', { className: 'idx-grid' });
  grid.appendChild(buildChooser(entries.length, total));

  const body = el('div', { className: 'idx-list', id: LIST_ID });
  for (const entry of entries) {
    const isExpanded = local.expanded === entry.name;
    const detailId = `idx-detail-${++detailSeq}`;
    body.appendChild(buildItem(entry, config, isExpanded, detailId));
    if (isExpanded) body.appendChild(renderExpanded(entry, detailId));
  }
  grid.appendChild(body);
  return grid;
}

// =========================================================================
// Eintragszeile
// =========================================================================

/**
 * Ein Eintrag ist eine Zeile fester Hoehe: Name, kurze Anreicherung, die
 * Belegzahl des Schnitts und die Wikidata-Marke. Alles, was die Hoehe sprengt,
 * steht im aufgeklappten Eintrag (E-227). Ein fehlender Wert laesst seinen
 * Platz leer, kein Platzhalterwort.
 */
function buildItem(entry, config, isExpanded, detailId) {
  const item = el('div', {
    className: `idx-item ${isExpanded ? 'idx-item--expanded' : ''}`,
    onClick: () => toggleEntry(entry.name),
  });

  // The name is the control of the row, not a label the mouse alone reaches:
  // a real button gives Enter and Space for free, Escape closes and the focus
  // stays on the name (E-214, the way the Bestand rows work).
  const nameProps = {
    className: 'idx-name', type: 'button',
    dataset: { entry: entry.name },
    'aria-expanded': String(isExpanded),
    onClick: (e) => { e.stopPropagation(); toggleEntry(entry.name, { keepFocus: true }); },
    onKeyDown: (e) => {
      if (e.key !== 'Escape' || !isExpanded) return;
      e.preventDefault();
      toggleEntry(entry.name, { keepFocus: true });
    },
  };
  if (isExpanded) nameProps['aria-controls'] = detailId;
  item.appendChild(el('button', nameProps, entry.name));

  item.appendChild(config.enrich(entry) || el('span', { className: 'idx-enrich' }));

  const cut = cutCountOf(entry);
  item.appendChild(el('span', {
    className: 'idx-item__count',
    dataset: { tip: `${cut} von ${entry.count} Dokumenten`, tipWrap: '' },
  }, String(cut)));

  item.appendChild(el('span', { className: 'idx-item__wd' }, wikidataMark(entry)));
  return item;
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
  const derived = (workStageRoles(store).get(entry.name) || [])
    .filter(r => r.name !== entry.partie);
  if (!entry.partie && derived.length === 0) return null;
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
function dropSearch() {
  if ((getFilter().search || '') !== '') setFilter({ search: '' });
}

/** Register -> Knotentyp des Netzwerk-Fokus. */
const FOCUS_TYPE = { personen: 'person', organisationen: 'institution', orte: 'ort', werke: 'werk' };

function renderExpanded(entry, detailId) {
  const children = [];
  // Beziehungs- und Rollen-Chips standen an der Zeile und gaben ihr eine
  // vierte Hoehe; sie eroeffnen jetzt den aufgeklappten Eintrag (E-227).
  const chips = el('div', { className: 'idx-detail__chips' });
  if (entry.relations && entry.relations.length > 0) {
    const relEl = buildRelationBadges(entry.relations);
    if (relEl) chips.appendChild(relEl);
  }
  if (local.register === 'werke') {
    const rollen = buildStageRoleChips(entry);
    if (rollen) chips.appendChild(rollen);
  }
  if (chips.childElementCount > 0) children.push(chips);

  // Die Karte waehlt Personen und Organisationen als Entitaet (E-126), zeigt
  // aber nur verortete Belege. Ohne einen solchen Beleg landet der Sprung auf
  // einer leeren Karte, deshalb steht der Knopf dort gar nicht erst.
  const karteReady = (local.register === 'personen' || local.register === 'organisationen')
    && karteSelectableNames(store).has(entry.name);

  children.push(el('div', { className: 'idx-detail__actions' },
    el('button', {
      className: 'idx-jump', type: 'button',
      dataset: { tip: `Im Netzwerk als Fokus: ${entry.name}`, tipWrap: '' },
      'aria-label': 'Im Netzwerk als Fokus',
      html: NETZWERK_GLYPH_SVG,
      onClick: (e) => {
        e.stopPropagation();
        dropSearch();
        navigateToView('netzwerk', {
          focus: { type: FOCUS_TYPE[local.register], name: entry.name },
        });
      },
    }),
    karteReady
      ? el('button', {
          className: 'idx-jump', type: 'button',
          dataset: { tip: `Auf der Karte: ${entry.name}`, tipWrap: '' },
          'aria-label': 'Auf der Karte zeigen',
          html: KARTE_GLYPH_SVG,
          onClick: (e) => {
            e.stopPropagation();
            dropSearch();
            navigateToView('karte', { entity: entry.name });
          },
        })
      : null,
  ));

  const umfeld = renderUmfeld(entry);
  if (umfeld) children.push(umfeld);
  children.push(renderRecords(entry));

  return el('div', { className: 'idx-detail', id: detailId }, ...children);
}

/**
 * Das Umfeld nach Familie gruppiert. Die Chips bleiben neutral (Regel 2), ihre
 * Familie sagt das farbige Symbol davor; die Zahl der gemeinsamen Dokumente
 * steht im Tooltip, weil die Zeile sonst zur Zahlenkolonne wird (Regel 8).
 *
 * Der Rest einer Gruppe kommt stapelweise nach: „+N weitere" zeigt die naechste
 * Portion an Ort und Stelle und verschwindet, wenn die Gruppe vollstaendig ist.
 * Die frueher dort haengende Namensliste im Tooltip war bei 173 Namen unlesbar
 * (Frontend-Audit 2026-09-04).
 */
function renderUmfeld(entry) {
  // Ungeschnitten geholt: die Portionierung passiert hier, Gruppe fuer Gruppe.
  const groups = buildUmfeld(store, local.register, entry,
    { limit: Number.MAX_SAFE_INTEGER, recordIds: cutIds() });
  if (groups.length === 0) return null;

  const wrap = el('div', { className: 'idx-umfeld' });
  for (const group of groups) {
    wrap.appendChild(el('div', { className: 'idx-umfeld__group' },
      el('span', {
        className: 'idx-umfeld__label mark-derived',
        // Das Umfeld steht in keiner Quellzeile, es ist aus der Ko-Okkurrenz
        // geschlossen und traegt deshalb die Marke aus Regel 16 (E-216).
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
      umfeldChips(group),
    ));
  }
  return wrap;
}

/** Chipzeile einer Gruppe mit stapelweiser Enthuellung des Rests. */
function umfeldChips(group) {
  const box = el('div', { className: 'idx-umfeld__chips' });
  let shown = 0;
  const more = el('button', {
    className: 'chip chip--role-pair chip--c-neutral chip--clickable idx-umfeld__more',
    type: 'button',
    onClick: (e) => { e.stopPropagation(); reveal(true); },
  }, el('span', { className: 'chip-wert' }, ''));
  box.appendChild(more);

  function reveal(fromClick) {
    const next = group.items.slice(shown, shown + UMFELD_LIMIT);
    let firstNew = null;
    for (const item of next) {
      const chip = umfeldChip(group, item);
      if (!firstNew) firstNew = chip;
      box.insertBefore(chip, more);
    }
    shown += next.length;
    const rest = group.items.length - shown;
    if (rest <= 0) {
      more.remove();
      // Der Knopf verschwindet unter dem Fokus; ohne diesen Schritt faellt der
      // Fokus auf das Dokument zurueck.
      if (fromClick && firstNew) firstNew.focus();
      return;
    }
    more.querySelector('.chip-wert').textContent = `+${rest} weitere`;
    more.setAttribute('aria-label', `${rest} weitere ${group.label} anzeigen`);
  }

  reveal(false);
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
      dropSearch();
      navigateToView('indizes', { register: group.key, entry: item.name });
    },
  },
    el('span', { className: `idx-umfeld__mark fam-mark fam-mark--${group.family}` },
      familyIcon(group.family, { size: 11 })),
    el('span', { className: 'chip-wert' }, item.name),
  );
}

function renderRecords(entry) {
  const recordIds = [...entry.records];
  const records = recordIds
    .map(id => store.records.get(id))
    .filter(Boolean)
    .sort((a, b) => (a['rico:identifier'] || '').localeCompare(b['rico:identifier'] || '', 'de-DE', { numeric: true }));

  const total = records.length;
  const limited = records.slice(0, DETAIL_LIMIT);

  const rows = limited.map(r => {
    const docType = getDocTypeId(r) || '';
    const docLabel = dftLabel(store, docType) || '';
    const rid = r['@id'];
    const inKorb = isInKorb(rid);
    return el('div', {
      className: 'idx-detail-record',
      onClick: (e) => {
        e.stopPropagation();
        selectRecord(rid);
      },
    },
      el('span', { className: 'idx-detail-sig' }, formatSignatur(r['rico:identifier'])),
      el('span', { className: 'idx-detail-title' }, truncate(r['rico:title'] || '(ohne Titel)', 70)),
      docLabel ? el('span', { className: `badge badge--${docType}` }, docLabel) : null,
      el('button', {
        className: `korb-btn ${inKorb ? 'korb-btn--active' : ''}`,
        'aria-label': korbTip(inKorb),
        dataset: { recordId: rid, tip: korbTip(inKorb) },
        html: korbIcon(12, inKorb),
        onClick: (e) => {
          e.stopPropagation();
          toggleKorb(rid);
          // Statt die ganze Seite neu zu zeichnen: den Korb-Knopf dieses
          // Records in-place aktualisieren.
          const nowIn = isInKorb(rid);
          const page = container?.querySelector('.idx-page');
          for (const b of (page ? page.querySelectorAll('.korb-btn') : [])) {
            if (b.dataset.recordId !== rid) continue;
            b.classList.toggle('korb-btn--active', nowIn);
            b.dataset.tip = korbTip(nowIn);
            b.setAttribute('aria-label', korbTip(nowIn));
            b.innerHTML = korbIcon(12, nowIn);
          }
        },
      }),
    );
  });

  const children = [
    el('div', { className: 'idx-detail__header' }, `${total} verknüpfte Dokumente`),
    ...rows,
  ];

  // The way into the filtered Bestand stands at every entry with at least one
  // document, not only above DETAIL_LIMIT, and names the count the Bestand
  // shows after the jump (user-story audit 2026-09-04).
  const archivCount = archivIdsFor(local.register, entry.name).size;
  if (archivCount > 0) {
    children.push(el('div', { className: 'idx-detail__show-all' },
      el('a', {
        // Derselbe Schnitt, den der Klick setzt, steht schon im href: sonst
        // oeffnet Mittel- oder Strg-Klick den ungefilterten Bestand
        // (Frontend-Audit 2026-09-04).
        href: buildHash('bestand', null, archivFilterFor(local.register, entry.name)),
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          navigateToArchivFiltered(local.register, entry.name);
        },
      }, `Alle ${archivCount} im Archiv anzeigen →`),
    ));
  }

  return el('div', { className: 'idx-detail__records' }, ...children);
}

/**
 * Switch to the record view with this entry pre-set as a filter. Bis dahin lief
 * das ueber ein `m3gim:archiv-filter`-Event, fuer das kein Handler registriert
 * war; applyArchivFilter navigiert selbst (Tab-Wechsel plus Hash).
 */
function navigateToArchivFiltered(registerKey, name) {
  const facet = GRID_FACET[registerKey];
  if (!facet) return;
  // The search term was the means of finding the entry, not a cut the Bestand
  // should keep: there it hits Signatur, Titel, Typ and Datum and leaves no
  // rows at all (user-story audit 2026-09-04).
  setFilter({ search: '' });
  applyArchivFilter(facet, name);
}

/**
 * Der Schnitt, den der Sprung in den Bestand setzt: der geteilte Filter mit der
 * Facette dieses Eintrags und ohne den Suchbegriff. Eine Quelle fuer beides,
 * die Zahl im Link und den Link selbst.
 * @returns {?Object} null, wenn das Register keine Facette hat
 */
function archivFilterFor(registerKey, name) {
  const facet = GRID_FACET[registerKey];
  if (!facet) return null;
  const key = facet === 'location' ? 'ort' : facet;
  const base = getFilter();
  return { ...base, search: '', [key]: [...facetValues(base, key), name] };
}

/**
 * The document set the Bestand shows after the jump. Not `entry.records`, which
 * counts over the whole holdings instead of over the cut.
 * @returns {Set<string>}
 */
function archivIdsFor(registerKey, name) {
  const filter = archivFilterFor(registerKey, name);
  if (!filter) return new Set();
  // The Bestand applies its Stand default (E-162) on its first render; before
  // that, an untouched stand facet must count the way the Bestand will show.
  const stand = isTouched('stand') ? filter.stand : [...STAND_DEFAULT];
  return recordsFor(store, { ...filter, stand }).ids;
}
