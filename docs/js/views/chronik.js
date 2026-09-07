/** Dated statements and document context share a vertical time axis. */
import { el, clear, scrollBehavior } from '../utils/dom.js';
import { formatSignatur, getDocTypeId, dftLabel, ensureArray } from '../utils/format.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { familyIcon } from '../ui/family-icons.js';
import { selectRecord } from '../ui/router.js';
import { getFilter } from '../ui/filter-state.js';
import { yearBounds, recordsFor } from '../data/records-for.js';
import { logStamp } from '../utils/env.js';
import { buildChronikTimeline, dateMeta } from './chronik-timeline-data.js';

const FAMILIES = { ort: 'Orte', person: 'Personen', werk: 'Werke', institution: 'Institutionen' };
const PREVIEW_LIMIT = 3;
let store;
let sidebar;
let viewContainer;
let workspace;
let detailSlot;
let dialog;
let resizeObserver;
let visibleRecords = 0;
let combined = false;
let serial = 0;
let activeEvidence = null;

export function renderChronik(storeRef, container) {
  closeEvidence(false);
  resizeObserver?.disconnect();
  store = storeRef;
  clear(container);
  const main = el('div', { className: 'view-main chronik-main' });
  viewContainer = el('div', { className: 'chronik-timeline-container' });
  const scroller = el('div', { className: 'chronik-scroll' }, viewContainer);
  detailSlot = el('aside', { className: 'chronik-detail-slot', 'aria-label': 'Details und Belege' });
  dialog = el('dialog', { className: 'chronik-dialog', 'aria-label': 'Details und Belege',
    onCancel: event => { event.preventDefault(); closeEvidence(); },
  });
  workspace = el('div', { className: 'chronik-workspace' }, scroller, renderLegend(), detailSlot);
  main.append(workspace, dialog);
  if (sidebar) sidebar.destroy();
  sidebar = createSidebar(store, {
    yearSpan: yearBounds(store), getCount: () => visibleRecords,
    search: { placeholder: 'Signatur, Titel, Typ oder Datum' }, onChange: updateChronikView,
  });
  main.insertBefore(sidebar.strip, main.firstChild);
  container.appendChild(viewShell(sidebar.element, main));
  resizeObserver = new ResizeObserver(() => {
    if (activeEvidence && workspace.clientWidth > 0) placePanel();
  });
  resizeObserver.observe(workspace);
  updateChronikView();
}

function renderLegend() {
  const marks = [['document', 'Dokumentdatum'], ['statement', 'Datierte Aussage'],
    ['point', 'Einzeldatum'], ['range', 'Zeitraum']];
  return el('aside', { className: 'chronik-legend', 'aria-label': 'Legende' },
    ...marks.map(([kind, label]) => el('span', { className: 'chronik-legend__item' },
      el('i', { className: `chronik-legend__mark chronik-legend__mark--${kind}`, 'aria-hidden': 'true' }), label)));
}

function updateChronikView() {
  closeEvidence(false);
  serial = 0;
  clear(viewContainer);
  showEmptyDetail();
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
  if (Array.isArray(shared.zeitfenster)) viewContainer.appendChild(el('p', { className: 'chronik-reading' },
    'Der Zeitfilter wählt Dokumente nach ihrem Zeitanker. Hier erscheinen alle ihre Datierungen, auch aus anderen Jahren.'));
  const head = el('div', { className: 'chronik-head chronik-grid' },
    el('span', {}, 'Zeit ↓'), el('span', {}, 'Quellen'),
    el('span', { className: 'chronik-head__entities' }, 'Entitäten'),
    ...(combined ? [] : Object.entries(FAMILIES).map(([family, label]) =>
      el('span', { className: `chronik-family chronik-family--${family}` }, familyIcon(family), label))));
  viewContainer.appendChild(el('div', { className: 'chronik-sticky' },
    el('div', { className: 'chronik-navigation' }, jump,
      el('div', { className: 'chronik-modes', role: 'group', 'aria-label': 'Entitäten anordnen' }, ...modes)), head));

  const timeline = el('div', { className: 'chronik-timeline', 'aria-label': 'Chronologische Quellen und Entitäten' });
  let previousYear = null;
  for (const row of rows) {
    if (row.year !== previousYear) {
      if (row.gapBefore) timeline.appendChild(el('div', {
        className: 'chronik-gap', role: 'separator',
        'aria-label': `Zeitsprung von ${row.gapBefore.from} bis ${row.gapBefore.to}`,
        dataset: { gapFrom: row.gapBefore.from, gapTo: row.gapBefore.to },
      }, el('span', { 'aria-hidden': 'true' }, '⋮')));
      if (row.year != null) timeline.appendChild(el('h3', {
        className: 'chronik-year', dataset: { year: String(row.year) }, tabindex: '-1',
      }, String(row.year)));
      previousYear = row.year;
    }
    timeline.appendChild(renderDateRow(row));
  }
  if (!rows.length && !undated) timeline.appendChild(el('p', { className: 'chronik-empty' },
    'Keine Dokumente in dieser Auswahl. Passe die Filter links an.'));
  if (undated) timeline.appendChild(el('section', { className: 'chronik-undated' },
    el('h3', {}, `Ohne Dokumentdatum · ${undated.sources.length} Dokumente`), renderDateRow(undated)));
  viewContainer.appendChild(timeline);
  logStamp('chronik', [
    ['records', records.length], ['jahre-belegt', years.length], ['datumsgruppen', rows.length],
    ['quellenbezuege', rows.reduce((sum, row) => sum + row.sources.length, 0)],
    ['ohne-dokumentdatum', undated ? undated.sources.length : 0],
    ['spanne', years.length ? `${years[0]}–${years.at(-1)}` : 'ohne Datum'],
  ]);
}

function compactDate(row) {
  if (row.precision === 'year') return 'ohne Tagesdatum';
  if (row.precision === 'undated') return 'ohne Datum';
  if (row.precision.endsWith('day') || row.precision.endsWith('month')) {
    return row.dateLabel.replace(new RegExp(` ${row.year}$`), '');
  }
  return row.dateLabel;
}

function renderDateRow(row) {
  const section = el('section', {
    className: 'chronik-date chronik-grid', dataset: { date: row.key, precision: row.precision },
    'aria-label': row.dateLabel,
  });
  section.appendChild(el('div', { className: 'chronik-date__label' },
    el('span', { className: 'chronik-date__dot', 'aria-hidden': 'true' }),
    el('h4', {}, compactDate(row)), row.precision.includes('malformed')
      ? el('small', {}, 'Datierung prüfen') : null));
  const sources = [...row.sources].sort((a, b) =>
    Number(b.kind === 'document') - Number(a.kind === 'document')
    || recordLabel(a.recordId).localeCompare(recordLabel(b.recordId), 'de', { numeric: true }));
  section.appendChild(renderLane(sources, 'Quellen', item => renderSource(item, row), 'source', row));
  if (combined) section.appendChild(renderLane(Object.values(row.lanes).flat(), 'Entitäten',
    entry => renderEntity(entry, row), 'all', row));
  else for (const [family, label] of Object.entries(FAMILIES)) {
    const lane = renderLane(row.lanes[family], label, entry => renderEntity(entry, row), family, row);
    if (family === 'werk' && row.lanes.part?.length) lane.appendChild(el('button', {
      type: 'button', className: 'chronik-parts chronik-more',
      onClick: event => showList(row.lanes.part, 'Partien', entry => renderEntity(entry, row), row, event.currentTarget),
    }, `Partien · ${row.lanes.part.length}`));
    section.appendChild(lane);
  }
  return section;
}

function renderLane(items, label, render, family, row) {
  const lane = el('div', { className: `chronik-lane chronik-lane--${family}`,
    dataset: { lane: family, count: String(items.length) } });
  if (!items.length) return lane;
  if (family !== 'source' || items.length > 1) lane.appendChild(el('div', {
    className: 'chronik-lane__label',
  }, `${label} · ${items.length}`));
  lane.appendChild(el('ul', { className: 'chronik-list', 'aria-label': label },
    ...items.slice(0, PREVIEW_LIMIT).map(item => el('li', {}, render(item)))));
  if (items.length > PREVIEW_LIMIT) lane.appendChild(el('button', {
    type: 'button', className: 'chronik-more',
    'aria-label': `${label}: alle ${items.length} Einträge für ${row.dateLabel} ansehen`,
    onClick: event => showList(items, label, render, row, event.currentTarget),
  }, `+ ${items.length - PREVIEW_LIMIT} weitere`));
  return lane;
}

function recordLabel(recordId) {
  const record = store.records.get(recordId);
  return record ? formatSignatur(record['rico:identifier']) : recordId;
}

function recordDate(record) {
  return [...new Set(ensureArray(record?.['rico:date']).concat(ensureArray(record?.['rico:creationDate'])))]
    .filter(Boolean).map(date => dateMeta(date).dateLabel).join(' · ');
}

function statementLabel(source, row) {
  if (source.kind === 'document') return row.precision === 'undated' ? 'Ohne Dokumentdatum' : 'Dokumentdatum';
  if (source.labels.every(label => /^(erwähnt|Datierung)$/i.test(label))) {
    return row.precision === 'year' ? `Erwähnung des Jahres ${row.dateLabel}` : `Datumsnennung · ${row.dateLabel}`;
  }
  return source.labels.join(' · ') || 'Datierte Aussage';
}

function renderSource(source, row) {
  const record = store.records.get(source.recordId);
  const title = record?.['rico:title'] || '(ohne Titel)';
  const ownDate = recordDate(record);
  return el('button', {
    className: `chronik-source chronik-source--${source.kind} chronik-source__link`, type: 'button',
    dataset: { recordId: source.recordId, sourceKey: `${row.key}|${source.recordId}` }, 'aria-pressed': 'false',
    onClick: event => showSource(source, row, event.currentTarget),
    'aria-label': `${recordLabel(source.recordId)} · ${title} — Details und Belege`,
  }, el('span', { className: 'chronik-source__title' }, title),
    el('span', { className: 'chronik-source__context' }, statementLabel(source, row)),
    el('span', { className: 'chronik-source__meta' },
      el('span', { className: 'chronik-source__signature' }, recordLabel(source.recordId)),
      source.kind === 'statement' ? ` · ${ownDate ? 'Quelle vom ' + ownDate : 'Quelle ohne Dokumentdatum'}` : ''));
}

function renderEntity(entry, row) {
  const contexts = new Set(entry.evidence.map(item => item.context));
  const context = contexts.size > 1 ? 'Datiert / im Dokument'
    : contexts.has('statement') ? 'Datierte Aussage' : 'Im Dokument';
  const role = entry.roles.includes('Partie') ? 'Partie · ' : '';
  return el('button', { type: 'button', className: `chronik-entity chronik-family--${entry.family}`,
    dataset: { entityKey: entry.key }, 'aria-pressed': 'false',
    onClick: event => showEvidence(entry, row, event.currentTarget),
  }, el('span', { className: 'chronik-entity__name' }, familyIcon(entry.family, { size: 14 }), entry.name),
  el('span', { className: 'chronik-entity__context' },
    `${role}${context}${entry.recordIds.length > 1 ? ' · ' + entry.recordIds.length + ' Belege' : ''}`));
}

function showEmptyDetail() {
  if (!detailSlot) return;
  clear(detailSlot);
  detailSlot.appendChild(el('p', { className: 'chronik-detail-empty' },
    'Eintrag auswählen, um Details und Belege zu sehen.'));
}

function markSelection() {
  const { key, sourceKey, trigger } = activeEvidence || {};
  viewContainer.querySelectorAll('.chronik-entity, .chronik-source__link, .chronik-more').forEach(button => {
    const selected = button === trigger || (key && button.dataset.entityKey === key)
      || (sourceKey && button.dataset.sourceKey === sourceKey);
    button.classList.toggle('chronik-selected', !!selected);
    button.setAttribute('aria-pressed', String(!!selected));
  });
}

function closeEvidence(restoreFocus = true) {
  if (!activeEvidence) return;
  const { trigger, panel } = activeEvidence;
  activeEvidence = null;
  if (dialog.open) dialog.close();
  panel.remove();
  markSelection();
  showEmptyDetail();
  if (restoreFocus && trigger.isConnected) trigger.focus({ preventScroll: true });
}

function placePanel() {
  const panel = activeEvidence.panel;
  if (workspace.clientWidth < 900) {
    if (panel.parentElement !== dialog) { dialog.appendChild(panel); showEmptyDetail(); }
    if (!dialog.open) dialog.showModal();
  } else {
    const wasModal = dialog.open;
    if (dialog.open) dialog.close();
    if (panel.parentElement !== detailSlot) { clear(detailSlot); detailSlot.appendChild(panel); }
    if (wasModal) panel.focus({ preventScroll: true });
  }
}

function openPanel(title, subtitle, content, trigger, { key, sourceKey } = {}) {
  const previous = activeEvidence?.panel.contains(trigger) ? activeEvidence : null;
  if (previous) previous.scrollTop = dialog.open ? dialog.scrollTop : detailSlot.scrollTop;
  activeEvidence?.panel.remove();
  const panelId = `chronik-evidence-${++serial}`;
  const panel = el('div', { className: 'chronik-evidence', id: panelId, role: 'region',
    'aria-labelledby': `${panelId}-title`, tabindex: '-1',
    onKeydown: event => {
      if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); closeEvidence(); }
    },
  }, el('div', { className: 'chronik-evidence__actions' },
    previous ? el('button', { type: 'button', className: 'chronik-more', onClick: () => {
      activeEvidence.panel.remove();
      activeEvidence = previous;
      placePanel();
      markSelection();
      detailSlot.scrollTop = dialog.scrollTop = previous.scrollTop;
      trigger.focus({ preventScroll: true });
    } }, 'Zurück zur Liste') : null,
    el('button', { type: 'button', className: 'chronik-evidence__close', onClick: () => closeEvidence() }, 'Schließen')),
    el('h3', { id: `${panelId}-title` }, title),
    el('p', { className: 'chronik-evidence__date' }, subtitle), content);
  activeEvidence = { trigger: previous?.trigger || trigger, panel, key, sourceKey };
  markSelection();
  placePanel();
  panel.focus({ preventScroll: true });
  detailSlot.scrollTop = dialog.scrollTop = 0;
}

function showList(items, label, render, row, trigger) {
  openPanel(label, `${row.dateLabel} · ${items.length} Einträge`,
    el('ul', { className: 'chronik-list', 'aria-label': label },
      ...items.map(item => el('li', {}, render(item)))), trigger);
}

function recordJump(recordId) {
  return el('button', { type: 'button', className: 'chronik-evidence__source', dataset: { recordId },
    onClick: () => { closeEvidence(false); selectRecord(recordId); },
  }, `${recordLabel(recordId)} · ${store.records.get(recordId)?.['rico:title'] || 'Dokument öffnen'}`);
}

function showSource(source, row, trigger) {
  const record = store.records.get(source.recordId);
  const type = record ? dftLabel(store, getDocTypeId(record)) : '';
  const content = el('div', {},
    el('p', { className: 'chronik-evidence__statement' }, statementLabel(source, row)),
    el('p', { className: 'chronik-evidence__date' },
      [type, recordDate(record) ? `Dokumentdatum: ${recordDate(record)}` : 'Ohne Dokumentdatum'].filter(Boolean).join(' · ')),
    source.kind === 'document' ? el('p', { className: 'chronik-evidence__statement' }, source.labels.join(' · ')) : null,
    ...source.notes.map(note => el('p', { className: 'chronik-evidence__note' }, note)));
  for (const [family, entries] of Object.entries(row.lanes)) {
    const linked = entries.filter(entry => entry.recordIds.includes(source.recordId)).map(entry => {
      const evidence = entry.evidence.filter(item => item.recordId === source.recordId);
      return { ...entry, evidence, recordIds: [source.recordId], roles: [...new Set(evidence.map(item => item.label))] };
    });
    if (linked.length) content.appendChild(el('section', { className: 'chronik-source-entities' },
      el('h4', {}, FAMILIES[family] || 'Partien'),
      el('ul', { className: 'chronik-list' }, ...linked.map(entry => el('li', {}, renderEntity(entry, row))))));
  }
  content.appendChild(el('p', {}, recordJump(source.recordId)));
  openPanel(record?.['rico:title'] || '(ohne Titel)', `${recordLabel(source.recordId)} · ${row.dateLabel}`,
    content, trigger, { sourceKey: `${row.key}|${source.recordId}` });
}

function showEvidence(entry, row, trigger) {
  const list = el('ul', { className: 'chronik-evidence__list' });
  for (const recordId of entry.recordIds) {
    const evidence = entry.evidence.filter(item => item.recordId === recordId);
    list.appendChild(el('li', {}, recordJump(recordId),
      ...evidence.map(item => el('div', { className: 'chronik-evidence__statement' },
        el('p', {}, `${item.context === 'document' ? 'Im Dokument' : 'Datierte Aussage'} · ${item.label}`),
        ...item.notes.map(note => el('p', { className: 'chronik-evidence__note' }, note))))));
  }
  const content = el('div', {}, list);
  if (entry.evidence.some(item => item.context === 'document')) content.appendChild(el('p', {
    className: 'chronik-evidence__caution',
  }, 'Die Nennung im Dokument belegt für dieses Datum keinen gemeinsamen Auftritt oder Aufenthalt.'));
  openPanel(entry.name, `${row.dateLabel} · ${entry.recordIds.length} ${entry.recordIds.length === 1 ? 'Beleg' : 'Belege'}`,
    content, trigger, { key: entry.key });
}
