/** Dated statements and document context share a vertical time axis. */
import { el, clear, scrollBehavior } from '../utils/dom.js';
import { formatSignatur, getDocTypeId, dftLabel } from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { familyIcon } from '../ui/family-icons.js';
import { selectRecord } from '../ui/router.js';
import { getFilter } from '../ui/filter-state.js';
import { yearBounds, recordsFor } from '../data/records-for.js';
import { logStamp } from '../utils/env.js';
import { buildChronikTimeline } from './chronik-timeline-data.js';

const FAMILIES = { ort: 'Orte', person: 'Personen', werk: 'Werke', institution: 'Institutionen' };
const PREVIEW_LIMIT = 3;
let store;
let sidebar;
let viewContainer;
let visibleRecords = 0;
let combined = false;
let serial = 0;
let activeEvidence = null;

export function renderChronik(storeRef, container) {
  store = storeRef;
  clear(container);
  const main = el('div', { className: 'view-main archiv-main chronik-main' });
  viewContainer = el('div', { className: 'chronik-timeline-container' });
  main.appendChild(viewContainer);
  if (sidebar) sidebar.destroy();
  sidebar = createSidebar(store, {
    yearSpan: yearBounds(store),
    getCount: () => visibleRecords,
    search: { placeholder: 'Signatur, Titel, Typ oder Datum' },
    onChange: updateChronikView,
  });
  main.insertBefore(sidebar.strip, main.firstChild);
  container.appendChild(viewShell(sidebar.element, main));
  updateChronikView();
}

function updateChronikView() {
  activeEvidence = null;
  serial = 0;
  clear(viewContainer);
  const shared = getFilter();
  const cut = recordsFor(store, shared).ids;
  const records = store.allRecords.filter(record => cut.has(record['@id']));
  visibleRecords = records.length;
  sidebar.update();
  const { rows, undated } = buildChronikTimeline(store, records);
  const years = [...new Set(rows.map(row => row.year).filter(year => year != null))];
  viewContainer.classList.toggle('chronik--combined', combined);
  const modes = [false, true].map(value => el('button', {
    type: 'button', className: 'chronik-mode', 'aria-pressed': String(combined === value),
    onClick: () => {
      combined = value;
      updateChronikView();
      viewContainer.querySelector('.chronik-mode[aria-pressed="true"]').focus({ preventScroll: true });
    },
  }, value ? 'Alle Entitäten' : 'Getrennte Lanes'));
  const jump = el('select', { id: 'chronik-year-jump', 'aria-label': 'Zum Jahr springen',
    onChange: event => {
      const target = viewContainer.querySelector('[data-year="' + event.target.value + '"]');
      if (target) {
        target.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
        target.focus({ preventScroll: true });
      }
    },
  }, el('option', { value: '' }, 'Zum Jahr …'),
  ...years.map(year => el('option', { value: year }, String(year))));

  viewContainer.appendChild(el('div', { className: 'chronik-intro' },
    el('div', {}, el('h2', { className: 'chronik-title' }, 'Chronik'),
      el('p', { className: 'chronik-scope' },
        `${rows.length} Datumsgruppen · ${records.length} Dokumente · Zeit verläuft nach unten ↓`)),
    el('div', { className: 'chronik-modes', role: 'group', 'aria-label': 'Entitäten anordnen' }, ...modes)));
  viewContainer.appendChild(el('p', { className: 'chronik-reading' },
    'Dokumentdatum und datierte Aussagen stehen getrennt. „Im Dokument“ bezeichnet Nennungen im Kontext der Quelle.'));
  if (Array.isArray(shared.zeitfenster)) viewContainer.appendChild(el('p', { className: 'chronik-reading' },
    'Der Zeitfilter wählt Dokumente nach ihrem Zeitanker. Hier erscheinen alle ihre Datierungen, auch aus anderen Jahren.'));
  const head = el('div', { className: 'chronik-head chronik-grid' },
    el('span', {}, 'Zeit ↓'), el('span', {}, 'Quellen'),
    el('span', { className: 'chronik-head__entities' }, 'Alle Entitäten'),
    ...(combined ? [] : Object.entries(FAMILIES).map(([family, label]) =>
      el('span', { className: `chronik-family chronik-family--${family}` }, familyIcon(family), label))));
  viewContainer.appendChild(el('div', { className: 'chronik-sticky' },
    el('div', { className: 'chronik-navigation' }, jump, el('span', {}, 'Name wählen → Belege lesen')), head));

  const timeline = el('div', { className: 'chronik-timeline', 'aria-label': 'Chronologische Quellen und Entitäten' });
  let previousYear = null;
  for (const row of rows) {
    if (row.year !== previousYear) {
      if (previousYear != null && row.year != null && row.year - previousYear > 1) {
        const first = previousYear + 1;
        const last = row.year - 1;
        timeline.appendChild(el('p', { className: 'chronik-gap' },
          `${first === last ? first : first + '–' + last} · Keine weiteren Jahreseinträge`));
      }
      if (row.year != null) timeline.appendChild(el('h3', {
        className: 'chronik-year', dataset: { year: String(row.year) }, tabindex: '-1',
      }, String(row.year)));
      previousYear = row.year;
    }
    timeline.appendChild(renderDateRow(row));
  }
  if (!rows.length && !undated) timeline.appendChild(el('p', { className: 'chronik-empty' },
    'Keine Dokumente in dieser Auswahl. Passe die Filter links an.'));
  if (undated) timeline.appendChild(el('details', { className: 'chronik-undated' },
    el('summary', {}, `Ohne Dokumentdatum · ${undated.sources.length} Dokumente`),
    el('p', { className: 'chronik-reading' },
      'Diese Dokumente und ihre Nennungen haben kein eigenes Datum. Datierte Aussagen daraus stehen zusätzlich an der Zeitachse.'),
    renderDateRow(undated)));
  viewContainer.appendChild(timeline);
  logStamp('chronik', [
    ['records', records.length], ['jahre-belegt', years.length], ['datumsgruppen', rows.length],
    ['quellenbezuege', rows.reduce((sum, row) => sum + row.sources.length, 0)],
    ['ohne-dokumentdatum', undated ? undated.sources.length : 0],
    ['spanne', years.length ? `${years[0]}–${years.at(-1)}` : 'ohne Datum'],
  ]);
}

function renderDateRow(row) {
  const section = el('section', {
    className: 'chronik-date chronik-grid', dataset: { date: row.key, precision: row.precision },
    'aria-label': row.dateLabel,
  });
  const precision = row.precision.includes('malformed') ? 'Datierung prüfen'
    : row.precision.includes('range') ? 'Zeitraum' : row.precision === 'year' ? 'Jahr' : '';
  section.appendChild(el('div', { className: 'chronik-date__label' },
    el('span', { className: 'chronik-date__dot', 'aria-hidden': 'true' }),
    el('h4', {}, row.dateLabel), precision ? el('small', {}, precision) : null));
  const sources = [...row.sources].sort((a, b) =>
    Number(b.kind === 'document') - Number(a.kind === 'document')
    || recordLabel(a.recordId).localeCompare(recordLabel(b.recordId), 'de', { numeric: true }));
  section.appendChild(renderLane(sources, 'Quellen', renderSource, 'source'));
  if (combined) section.appendChild(renderLane(Object.values(row.lanes).flat(), 'Entitäten',
    entry => renderEntity(entry, row, section), 'all'));
  else for (const [family, label] of Object.entries(FAMILIES)) {
    const lane = renderLane(row.lanes[family], label,
      entry => renderEntity(entry, row, section), family);
    if (family === 'werk' && row.lanes.part?.length) lane.appendChild(el('details', {
      className: 'chronik-parts',
      onToggle: event => {
        if (!event.currentTarget.open && activeEvidence
          && event.currentTarget.contains(activeEvidence.trigger)) closeEvidence(false);
      },
    }, el('summary', {}, `Partien · ${row.lanes.part.length}`),
    renderLane(row.lanes.part, 'Partien', entry => renderEntity(entry, row, section), 'part')));
    section.appendChild(lane);
  }
  return section;
}

function renderLane(items, label, render, family) {
  const lane = el('div', { className: `chronik-lane chronik-lane--${family}`,
    dataset: { lane: family, count: String(items.length) } });
  if (!items.length) return lane;
  lane.appendChild(el('div', { className: 'chronik-lane__label' }, `${label} · ${items.length}`));
  const listId = `chronik-list-${++serial}`;
  const list = el('ul', { id: listId, className: 'chronik-list', 'aria-label': label },
    ...items.slice(0, PREVIEW_LIMIT).map(item => el('li', {}, render(item))));
  lane.appendChild(list);
  if (items.length > PREVIEW_LIMIT) {
    let expanded = false;
    const more = el('button', { type: 'button', className: 'chronik-more',
      'aria-expanded': 'false', 'aria-controls': listId,
      onClick: () => {
        expanded = !expanded;
        if (expanded) items.slice(PREVIEW_LIMIT).forEach(item => list.appendChild(el('li', {}, render(item))));
        else {
          if (activeEvidence && list.contains(activeEvidence.trigger)) closeEvidence(false);
          while (list.children.length > PREVIEW_LIMIT) list.lastElementChild.remove();
        }
        more.textContent = expanded ? 'Weniger anzeigen' : `+ ${items.length - PREVIEW_LIMIT} weitere`;
        more.setAttribute('aria-expanded', String(expanded));
      },
    }, `+ ${items.length - PREVIEW_LIMIT} weitere`);
    lane.appendChild(more);
  }
  return lane;
}

function recordLabel(recordId) {
  const record = store.records.get(recordId);
  return record ? formatSignatur(record['rico:identifier']) : recordId;
}

function renderSource(source) {
  const record = store.records.get(source.recordId);
  const title = record?.['rico:title'] || '(ohne Titel)';
  const type = record ? dftLabel(store, getDocTypeId(record)) : '';
  const ownDate = formatDate(record?.['rico:date'] || record?.['rico:creationDate']);
  const context = source.kind === 'document' ? (ownDate ? 'Dokumentdatum' : 'Ohne Dokumentdatum')
    : `Aussage${ownDate ? ' · Quelle vom ' + ownDate : ''}`;
  const card = el('div', { className: `chronik-source chronik-source--${source.kind}` },
    el('span', { className: 'chronik-source__context' }, context),
    el('button', { className: 'chronik-source__link', type: 'button',
      dataset: { recordId: source.recordId }, onClick: () => selectRecord(source.recordId),
      'aria-label': `${recordLabel(source.recordId)} · ${title} — Dokument öffnen`,
    }, el('strong', {}, recordLabel(source.recordId)),
    el('span', { className: 'chronik-source__title' }, title)),
    el('span', { className: 'chronik-source__roles' },
      [...new Set([type, ...source.labels].filter(Boolean))].join(' · ')));
  if (source.notes.length) card.appendChild(el('details', { className: 'chronik-notes' },
    el('summary', {}, 'Hinweise zur Quelle'), ...source.notes.map(note => el('p', {}, note))));
  return card;
}

function renderEntity(entry, row, section) {
  const contexts = new Set(entry.evidence.map(item => item.context));
  const context = contexts.size > 1 ? 'Datiert / im Dokument'
    : contexts.has('statement') ? 'Datierte Aussage' : 'Im Dokument';
  const role = entry.roles.includes('Partie') ? 'Partie · ' : '';
  const button = el('button', { type: 'button',
    className: `chronik-entity chronik-family--${entry.family}`,
    dataset: { entityKey: entry.key }, 'aria-expanded': 'false',
    onClick: () => showEvidence(entry, row, section, button),
  }, el('span', { className: 'chronik-entity__name' }, familyIcon(entry.family, { size: 14 }), entry.name),
  el('span', { className: 'chronik-entity__context' },
    `${role}${context}${entry.recordIds.length > 1 ? ' · ' + entry.recordIds.length + ' Belege' : ''}`));
  if (activeEvidence?.key === entry.key) button.classList.add('chronik-entity--selected');
  return button;
}

function closeEvidence(restoreFocus = true) {
  if (!activeEvidence) return;
  const { trigger, panel } = activeEvidence;
  panel.remove();
  trigger.setAttribute('aria-expanded', 'false');
  trigger.removeAttribute('aria-controls');
  viewContainer.querySelectorAll('.chronik-entity--selected').forEach(button =>
    button.classList.remove('chronik-entity--selected'));
  activeEvidence = null;
  if (restoreFocus && trigger.isConnected) trigger.focus({ preventScroll: true });
}

function showEvidence(entry, row, section, trigger) {
  const same = activeEvidence?.trigger === trigger;
  closeEvidence(false);
  if (same) return;
  const panelId = `chronik-evidence-${++serial}`;
  const heading = el('h4', { id: `${panelId}-title` }, entry.name);
  const panel = el('div', { className: 'chronik-evidence', id: panelId,
    role: 'region', 'aria-labelledby': heading.id, tabindex: '-1',
    onKeydown: event => {
      if (event.key === 'Escape') { event.stopPropagation(); closeEvidence(); }
    },
  }, el('div', { className: 'chronik-evidence__head' }, heading,
    el('button', { type: 'button', className: 'chronik-evidence__close',
      onClick: () => closeEvidence() }, 'Schließen')),
  el('p', { className: 'chronik-evidence__date' },
    `${row.dateLabel} · ${entry.recordIds.length} ${entry.recordIds.length === 1 ? 'Beleg' : 'Belege'}`));
  const list = el('ul', { className: 'chronik-evidence__list' });
  for (const recordId of entry.recordIds) {
    const evidence = entry.evidence.filter(item => item.recordId === recordId);
    list.appendChild(el('li', {},
      el('button', { type: 'button', className: 'chronik-evidence__source',
        dataset: { recordId }, onClick: () => selectRecord(recordId) },
      `${recordLabel(recordId)} · ${store.records.get(recordId)?.['rico:title'] || 'Dokument öffnen'}`),
      ...evidence.map(item => el('div', { className: 'chronik-evidence__statement' },
        el('p', {}, `${item.context === 'document' ? 'Im Dokument' : 'Datierte Aussage'} · ${item.label}`),
        ...item.notes.map(note => el('p', { className: 'chronik-evidence__note' }, note))))));
  }
  panel.appendChild(list);
  if (entry.evidence.some(item => item.context === 'document')) panel.appendChild(el('p', {
    className: 'chronik-evidence__caution',
  }, 'Die Nennung im Dokument belegt für dieses Datum keinen gemeinsamen Auftritt oder Aufenthalt.'));
  section.appendChild(panel);
  trigger.setAttribute('aria-expanded', 'true');
  trigger.setAttribute('aria-controls', panelId);
  activeEvidence = { trigger, panel, key: entry.key };
  viewContainer.querySelectorAll('.chronik-entity').forEach(button =>
    button.classList.toggle('chronik-entity--selected', button.dataset.entityKey === entry.key));
  panel.focus({ preventScroll: true });
  panel.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
}
