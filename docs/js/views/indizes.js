/** One register with shared filters and a responsive selection detail. */
import { el, clear, scrollBehavior } from '../utils/dom.js';
import {
  WIKIDATA_ICON_SVG, NETZWERK_GLYPH_SVG, KARTE_GLYPH_SVG, DOKUMENT_GLYPH_SVG,
} from '../data/constants.js';
import { applyArchivFilter, navigateToView, getState } from '../ui/router.js';
import { onViewNavigate } from '../ui/events.js';
import { logStamp } from '../utils/env.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { createSelectionDetail } from '../ui/selection-detail.js';
import { buildHash } from '../ui/filter-url.js';
import { familyIcon } from '../ui/family-icons.js';
import { getFilter } from '../ui/filter-state.js';
import { recordsFor, yearBounds } from '../data/records-for.js';
import { buildRegisterDetail } from './indizes-detail.js';
import {
  getGridEntries, clearEntriesCache, entriesWithRecordsIn, filterEntries, sortEntries,
  karteSelectableNames, cutCountOf, bestandFilterFor, entryYearSpan,
  REGISTER_KEYS, REGISTER_LABELS, REGISTER_FAMILY, REGISTER_ENTITY_TYPE,
} from './indizes-data.js';

let store = null;
let container = null;
let sidebar = null;
let selection = null;
const local = { register: 'personen', sort: 'count', expanded: null, q: '' };
let shownEntries = [];
let shownConfig = null;
let cutRecordIds = null;
let cutSize = null;

const sortIcon = paths => '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"'
  + ' stroke="currentColor" stroke-width="2" stroke-linecap="round"'
  + ` stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
const SORTS = [
  { id: 'count', label: 'Belegzahl', tip: 'Nach Belegzahl sortiert',
    icon: sortIcon('<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h10"/>'
      + '<path d="M11 8h7"/><path d="M11 12h4"/>') },
  { id: 'alpha', label: 'Alphabetisch', tip: 'Alphabetisch sortiert',
    icon: sortIcon('<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/>'
      + '<path d="m14 10 3-7 3 7M15 8h4M14 14h6l-6 7h6"/>') },
];
const ENRICHMENTS = { personen: personEnrichment, organisationen: orgEnrichment,
  orte: ortEnrichment, werke: werkEnrichment };
const REGISTERS = Object.fromEntries(REGISTER_KEYS.map(key => [key, {
  label: REGISTER_LABELS[key], family: REGISTER_FAMILY[key], enrich: ENRICHMENTS[key],
}]));
const LIST_ID = 'idx-register-list';

export function expandEntry(registerKey, entityName) {
  if (!REGISTERS[registerKey]) return;
  local.register = registerKey;
  local.q = '';
  local.expanded = entityName;
  redraw();
  requestAnimationFrame(() => {
    container?.querySelector('.idx-item--expanded')?.scrollIntoView({
      behavior: scrollBehavior(), block: 'center',
    });
  });
}

onViewNavigate('indizes', detail => {
  if (detail.register && REGISTERS[detail.register] && detail.register !== local.register) {
    local.register = detail.register;
    local.q = '';
    local.expanded = null;
  }
  if (detail.entry != null) { expandEntry(local.register, detail.entry); return; }
  redraw();
});

export function renderIndizes(storeRef, containerEl) {
  selection?.destroy();
  sidebar?.destroy();
  store = storeRef;
  container = containerEl;
  clearEntriesCache();
  clear(container);
  const fromHash = getState().indexRegister;
  if (fromHash && REGISTERS[fromHash]) local.register = fromHash;
  const stage = el('div', { className: 'idx-stage' });
  const wrapper = el('div', { className: 'idx-page view-main' }, stage);
  selection = createSelectionDetail({ host: stage, onClose: () => {
    local.expanded = null;
    markSelection();
  } });
  sidebar = createSidebar(store, {
    yearSpan: yearBounds(store), getCount: () => cutSize,
    onChange: () => { local.expanded = null; redraw(); },
    search: { placeholder: 'Signatur, Titel, Typ oder Datum' },
    sections: [{ title: 'Registersuche', controls: [{
      kind: 'search', ariaLabel: 'Aktuelles Register durchsuchen',
      placeholder: 'Name im Register', value: () => local.q,
      onChange: value => { local.q = value; local.expanded = null; redraw(); },
    }] }],
  });
  wrapper.insertBefore(sidebar.strip, wrapper.firstChild);
  container.appendChild(viewShell(sidebar.element, wrapper));
  redraw();
}

function redraw() {
  const wrapper = container?.querySelector('.idx-page');
  if (!wrapper) return;
  renderRegister(wrapper);
  sidebar.update();
}

function markSelection() {
  for (const row of container.querySelectorAll('.idx-item')) {
    const selected = row.dataset.entry === local.expanded;
    row.classList.toggle('idx-item--expanded', selected);
    row.querySelector('.idx-chevron').classList.toggle('idx-chevron--open', selected);
    const button = row.querySelector('.idx-entry');
    button.setAttribute('aria-expanded', String(selected));
    const content = selection.element?.querySelector('.idx-detail');
    if (selected && content) button.setAttribute('aria-controls', content.id);
    else button.removeAttribute('aria-controls');
  }
}

function showEntry(entry) {
  const row = [...container.querySelectorAll('.idx-item')].find(item => item.dataset.entry === entry.name);
  const count = cutCountOf(entry);
  const content = buildRegisterDetail({ store, register: local.register, entry,
    recordIds: cutRecordIds, properties: shownConfig.enrich(entry, { full: true }),
    span: buildSpanCell(entry), navigate: navigateFromRegister });
  selection.open({ title: entry.name, kicker: shownConfig.label,
    subtitle: `${count} Dokument${count === 1 ? '' : 'e'} im aktuellen Schnitt`,
    content, trigger: row?.querySelector('.idx-entry') });
  markSelection();
}

function toggleEntry(name) {
  if (local.expanded === name) { selection.close(); return; }
  const entry = shownEntries.find(item => item.name === name);
  if (!entry) return;
  local.expanded = name;
  showEntry(entry);
}

function navigateFromRegister(tab, context) {
  selection.close({ restoreFocus: false });
  navigateToView(tab, context);
}

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

function selectSort(id) {
  if (id === local.sort) return;
  selection.close({ restoreFocus: false });
  local.sort = id;
  const page = container?.querySelector('.idx-page');
  const body = page?.querySelector(`#${LIST_ID}`);
  if (!body || !shownConfig) return;
  for (const button of page.querySelectorAll('.idx-sort__btn')) {
    button.setAttribute('aria-pressed', String(button.dataset.sort === local.sort));
  }
  clear(body);
  fillList(body, sortEntries(shownEntries, local.sort), shownConfig);
}

function renderRegister(wrapper) {
  const stage = wrapper.querySelector('.idx-stage');
  selection.close({ restoreFocus: false, notify: false });
  stage.querySelector('.idx-grid')?.remove();
  const config = REGISTERS[local.register];
  const register = getGridEntries(store, local.register);
  cutRecordIds = recordsFor(store, getFilter()).ids;
  cutSize = cutRecordIds.size;
  shownEntries = filterEntries(entriesWithRecordsIn(register, cutRecordIds), local.register, local);
  shownConfig = config;
  const grid = el('div', { className: 'idx-grid' }, buildHead(config, shownEntries.length, register.length));
  const body = el('div', { className: 'idx-list', id: LIST_ID });
  fillList(body, sortEntries(shownEntries, local.sort), config);
  grid.appendChild(body);
  stage.prepend(grid);
  const selected = shownEntries.find(entry => entry.name === local.expanded);
  if (selected) showEntry(selected);
  else local.expanded = null;
  logStamp('indizes', [['register', local.register], ['eintraege', shownEntries.length],
    ['gesamt', register.length], ['sortierung', local.sort]]);
}

function fillList(body, entries, config) {
  for (const entry of entries) body.appendChild(buildItem(entry, config));
}

function buildItem(entry, config) {
  const item = el('div', {
    className: 'idx-item', dataset: { entry: entry.name },
    onClick: event => { if (!event.target.closest('a,button')) toggleEntry(entry.name); },
  });
  item.appendChild(el('button', {
    className: 'idx-entry', type: 'button', 'aria-expanded': 'false',
    'aria-label': `Details zu ${entry.name}`,
    onClick: () => toggleEntry(entry.name),
  }, el('span', { className: 'idx-chevron', 'aria-hidden': 'true' }, '›'),
  el('span', { className: 'idx-item__identity' },
    el('span', { className: 'idx-name' }, entry.name), config.enrich(entry))));
  const count = cutCountOf(entry);
  const filter = bestandFilterFor(local.register, getFilter(), entry.name);
  const documentLabel = `Diese ${count} Dokument${count === 1 ? '' : 'e'} im Bestand öffnen`;
  item.appendChild(buildSpanCell(entry));
  item.appendChild(el('div', { className: 'idx-item__actions' },
    el('a', {
      className: 'idx-doclink', href: buildHash('bestand', null, filter),
      dataset: { tip: documentLabel, tipWrap: '' }, 'aria-label': documentLabel,
      onClick: event => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        selection.close({ restoreFocus: false });
        applyArchivFilter(REGISTER_ENTITY_TYPE[local.register], entry.name);
      },
    }, el('span', { className: 'idx-doclink__icon', html: DOKUMENT_GLYPH_SVG }),
    el('span', { className: 'idx-doclink__label' }, String(count),
      el('span', { className: 'idx-doclink__unit' }, ` Dokument${count === 1 ? '' : 'e'}`)),
    el('span', { className: 'idx-doclink__arrow', 'aria-hidden': 'true' }, '→')),
    el('button', {
      className: 'idx-jump idx-jump--row', type: 'button',
      dataset: { tip: `Umgebung von ${entry.name} im Netzwerk öffnen`, tipWrap: '' },
      'aria-label': `Umgebung von ${entry.name} im Netzwerk öffnen`, html: NETZWERK_GLYPH_SVG,
      onClick: () => navigateFromRegister('netzwerk', {
        focus: { type: REGISTER_ENTITY_TYPE[local.register], name: entry.name },
      }),
    }),
    local.register !== 'orte' && karteSelectableNames(store).has(entry.name) ? el('button', {
      className: 'idx-jump idx-jump--row', type: 'button',
      dataset: { tip: `${entry.name} auf der Karte öffnen`, tipWrap: '' },
      'aria-label': `${entry.name} auf der Karte öffnen`, html: KARTE_GLYPH_SVG,
      onClick: () => navigateFromRegister('karte', { entity: entry.name }),
    }) : null,
    el('span', { className: 'idx-item__wd' }, wikidataMark(entry))));
  return item;
}

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

function qidOf(entry) {
  const wd = entry.wikidata ? String(entry.wikidata) : '';
  return wd.startsWith('wd:') ? wd.replace('wd:', '') : '';
}

function enrichEl(text, { tip = '', derived = true, className = '' } = {}) {
  if (!text) return null;
  const marked = derived && tip.startsWith('ergänzt: ');
  const props = { className: `idx-enrich ${marked ? 'mark-derived' : ''} ${className}`.trim() };
  if (tip) props.dataset = { tip, tipWrap: '' };
  return el('span', props, text);
}

function personEnrichment(entry, { full = false } = {}) {
  const occ = entry.occupation
    ? (Array.isArray(entry.occupation) ? entry.occupation : [entry.occupation])
    : [];
  const parts = [];
  if (occ.length > 0) parts.push(full ? occ.join(', ') : occ[0]);
  if (entry.voiceType) parts.push(entry.voiceType);
  if (entry.birthDate || entry.deathDate) {
    const birth = entry.birthDate ? full ? entry.birthDate : entry.birthDate.slice(0, 4) : '?';
    const death = entry.deathDate ? full ? entry.deathDate : entry.deathDate.slice(0, 4) : '';
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

function werkEnrichment(entry) {
  return enrichEl(entry.komponist ? `Komponist: ${entry.komponist}` : '', { derived: false, className: 'idx-komponist' });
}
