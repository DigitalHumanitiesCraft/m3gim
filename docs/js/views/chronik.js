/** Dated statements and document context share a vertical time axis. */
import { el, clear } from '../utils/dom.js';
import { formatSignatur, getDocTypeId, dftLabel, ensureArray } from '../utils/format.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { familyIcon } from '../ui/family-icons.js';
import { selectRecord } from '../ui/router.js';
import { getFilter } from '../ui/filter-state.js';
import { yearBounds, recordsFor } from '../data/records-for.js';
import { logStamp } from '../utils/env.js';
import { buildChronikTimeline, dateMeta } from './chronik-timeline-data.js';
import { createChronikAxis } from './chronik-axis.js';
import { aggregateCalendarGroup } from './chronik-calendar-data.js';
import { summarizeSourceDates } from './chronik-date-summary.js';
import { createSelectionDetail } from '../ui/selection-detail.js';

const FAMILIES = { ort: 'Orte', person: 'Personen', werk: 'Werke', institution: 'Institutionen' };
const PREVIEW_LIMIT = 3;
let store;
let sidebar;
let viewContainer;
let workspace;
let details;
let axis;
let topbar;
let visibleRecords = 0;
let activeEvidence = null;

export function renderChronik(storeRef, container) {
  sidebar?.destroy();
  axis?.destroy();
  details?.destroy();
  activeEvidence = null;
  store = storeRef;
  clear(container);
  const main = el('div', { className: 'view-main chronik-main' });
  topbar = el('div', { className: 'chronik-topbar' });
  workspace = el('div', { className: 'chronik-workspace' });
  main.append(topbar, workspace);
  details = createSelectionDetail({ host: workspace, onClose: () => {
    activeEvidence = null;
    markSelection();
  } });
  if (sidebar) sidebar.destroy();
  sidebar = createSidebar(store, {
    yearSpan: yearBounds(store), getCount: () => visibleRecords,
    search: { placeholder: 'Signatur, Titel, Typ oder Datum' }, onChange: updateChronikView,
  });
  container.appendChild(viewShell(sidebar.element, main));
  updateChronikView();
}

function renderLegend() {
  const marks = [['document', 'Dokumentdatum'], ['statement', 'Datierte Aussage']];
  return el('aside', { className: 'chronik-legend', 'aria-label': 'Legende' },
    ...marks.map(([kind, label]) => el('span', { className: 'chronik-legend__item' },
      el('i', { className: `chronik-legend__mark chronik-legend__mark--${kind}`, 'aria-hidden': 'true' }), label)));
}

function updateChronikView() {
  closeEvidence(false);
  axis?.destroy();
  axis?.element.remove();
  const shared = getFilter();
  const cut = recordsFor(store, shared).ids;
  const records = store.allRecords.filter(record => cut.has(record['@id']));
  visibleRecords = records.length;
  sidebar.update();
  const { rows, undated } = buildChronikTimeline(store, records);
  axis = createChronikAxis({ rows, undated, renderLanes: renderCalendarLanes, openRows, openRow,
    beforeNavigate: () => closeEvidence(false) });
  viewContainer = axis.element;
  workspace.prepend(viewContainer);
  clear(topbar);
  topbar.append(axis.controls, renderLegend());
  if (Array.isArray(shared.zeitfenster)) axis.controls.dataset.tip =
    'Der Zeitfilter wählt Dokumente nach ihrem Dokumentdatum. Die Achse zeigt alle Datierungen dieser Dokumente.';
  const years = [...new Set(rows.map(row => row.year).filter(year => year != null))];
  logStamp('chronik', [
    ['records', records.length], ['jahre-belegt', years.length], ['datumsgruppen', rows.length],
    ['quellenbezuege', rows.reduce((sum, row) => sum + row.sources.length, 0)],
    ['ohne-dokumentdatum', undated ? undated.sources.length : 0],
    ['spanne', years.length ? `${years[0]}–${years.at(-1)}` : 'ohne Datum'],
  ]);
}

function renderCalendarLanes(group) {
  const data = aggregateCalendarGroup(group);
  const lanes = [renderLane(data.sources, 'Quellen', item => renderCalendarSource(item), 'source', data)];
  for (const [family, label] of Object.entries(FAMILIES)) {
    const lane = renderLane(data.lanes[family], label, entry => renderEntity(entry, data), family, data);
    if (family === 'werk' && data.lanes.part.length) lane.appendChild(el('button', {
      type: 'button', className: 'chronik-parts chronik-more',
      onClick: event => showList(data.lanes.part, 'Partien', entry => renderEntity(entry, data), data, event.currentTarget),
    }, `Partien · ${data.lanes.part.length}`));
    lanes.push(lane);
  }
  return lanes;
}

function renderCalendarSource(item) {
  if (item.contexts.length === 1) {
    const { source, row } = item.contexts[0];
    return renderSource(source, row);
  }
  const record = store.records.get(item.recordId);
  const kinds = new Set(item.contexts.map(context => context.source.kind));
  const kind = kinds.size > 1 ? 'mixed' : [...kinds][0];
  const button = el('button', { type: 'button', className: `chronik-source chronik-source__link chronik-source--aggregate chronik-source--${kind}`,
    dataset: { recordId: item.recordId }, 'aria-pressed': 'false',
    onClick: event => {
      const rows = item.contexts.map(({ row, source }) => ({ ...row, sources: [source] }));
      openRows(rows, event.currentTarget, record?.['rico:title'] || recordLabel(item.recordId));
      activeEvidence.recordId = item.recordId;
      markSelection();
    },
  }, el('span', { className: 'chronik-source__title' }, record?.['rico:title'] || '(ohne Titel)'),
  el('span', { className: 'chronik-source__context' }, kinds.size > 1 ? 'Dokumentdatum und Aussagen'
    : kinds.has('document') ? 'Dokumentdaten' : 'Datierte Aussagen'),
  el('span', { className: 'chronik-source__dates' }, summarizeSourceDates(item.contexts)),
  el('span', { className: 'chronik-source__meta' },
    el('span', { className: 'chronik-source__signature' }, recordLabel(item.recordId))));
  return button;
}

function openRows(rows, trigger, title = 'Quellen und Datierungen', family = null) {
  const content = el('div', { className: 'chronik-group-list' }, ...rows.map(row =>
    el('section', { className: 'chronik-group-row', dataset: { date: row.key } },
      el('h4', {}, row.dateLabel), family
        ? el('ul', { className: 'chronik-list' }, ...row.lanes[family].map(entry => el('li', {}, renderEntity(entry, row))))
        : el('ul', { className: 'chronik-list' }, ...row.sources.map(source => el('li', {}, renderSource(source, row)))),
      family ? null : el('button', { type: 'button', className: 'chronik-more', onClick: event => openRow(row, event.currentTarget) }, 'Entitäten und Belege'))));
  openPanel(title, `${rows.length} Datumsgruppen`, content, trigger);
}

function openRow(row, trigger) {
  if (row.sources.length === 1) return showSource(row.sources[0], row, trigger);
  openPanel('Quellen und Entitäten', row.dateLabel, renderDateRow(row), trigger);
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
  for (const [family, label] of Object.entries(FAMILIES)) {
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
  }, `Alle ${items.length} ansehen`));
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
    el('span', { className: 'chronik-source__dates' }, row.dateLabel),
    el('span', { className: 'chronik-source__meta' },
      el('span', { className: 'chronik-source__signature' }, recordLabel(source.recordId)),
      source.kind === 'statement' ? ` · ${ownDate ? 'Quelle vom ' + ownDate : 'Quelle ohne Dokumentdatum'}` : ''));
}

function renderEntity(entry, row) {
  const contexts = new Set(entry.evidence.map(item => item.context));
  const context = contexts.size > 1 ? 'Datierte Aussage / in der Quelle genannt'
    : contexts.has('statement') ? 'Datierte Aussage' : 'In der Quelle genannt';
  const role = entry.roles.includes('Partie') ? 'Partie · ' : '';
  return el('button', { type: 'button', className: `chronik-entity chronik-family--${entry.family}`,
    dataset: { entityKey: entry.key, recordIds: JSON.stringify(entry.recordIds) }, 'aria-pressed': 'false',
    onClick: event => showEvidence(entry, row, event.currentTarget),
  }, el('span', { className: 'chronik-entity__name' }, familyIcon(entry.family, { size: 14 }), entry.name),
  el('span', { className: 'chronik-entity__context' },
    `${role}${context}${entry.recordIds.length > 1 ? ' · ' + entry.recordIds.length + ' Belege' : ''}`));
}

function markSelection() {
  const { key, sourceKey, recordId, trigger } = activeEvidence || {};
  viewContainer?.querySelectorAll('.chronik-entity, .chronik-source__link, .chronik-more, .chronik-calendar-anchor').forEach(button => {
    const selected = button === trigger || (key && button.dataset.entityKey === key)
      || (recordId && button.dataset.recordIds && JSON.parse(button.dataset.recordIds).includes(recordId))
      || (recordId && button.dataset.recordId === recordId)
      || (sourceKey && button.dataset.sourceKey === sourceKey);
    button.classList.toggle('chronik-selected', !!selected);
    button.setAttribute('aria-pressed', String(!!selected));
  });
}

function closeEvidence(restoreFocus = true) {
  activeEvidence = null;
  details?.close({ restoreFocus, notify: false });
  markSelection();
}

function displayPanel(state) {
  const previous = state.previous;
  details.open({ title: state.title, kicker: 'Chronik', subtitle: state.subtitle,
    content: state.content, trigger: state.trigger,
    back: previous ? () => {
      activeEvidence = previous;
      displayPanel(previous);
      details.scrollElement.scrollTop = previous.scrollTop || 0;
      state.nestedTrigger?.focus({ preventScroll: true });
    } : null,
  });
  markSelection();
}

function openPanel(title, subtitle, content, trigger, { key, sourceKey, recordId } = {}) {
  const previous = activeEvidence?.content.contains(trigger) ? activeEvidence : null;
  if (previous) previous.scrollTop = details.scrollElement.scrollTop;
  activeEvidence = { title, subtitle, content, key, sourceKey, recordId, previous,
    trigger: previous?.trigger || trigger, nestedTrigger: previous ? trigger : null };
  displayPanel(activeEvidence);
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
    row.precision.includes('range') ? el('p', { className: 'chronik-source__date-extent' },
      'In dieser Quelle erfasster Zeitraum. Die Bedeutung ergibt sich aus der zugehörigen Aussage im Beleg.')
      : row.precision === 'year' || row.precision === 'month' ? el('p', { className: 'chronik-source__date-extent' },
        row.precision === 'year' ? 'Nur das Jahr ist bekannt; Monat und Tag sind nicht genauer datiert.'
          : 'Nur der Monat ist bekannt; der Tag ist nicht genauer datiert.') : null,
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
    content, trigger, { sourceKey: `${row.key}|${source.recordId}`, recordId: source.recordId });
}

function showEvidence(entry, row, trigger) {
  const list = el('ul', { className: 'chronik-evidence__list' });
  for (const recordId of entry.recordIds) {
    const evidence = entry.evidence.filter(item => item.recordId === recordId);
    list.appendChild(el('li', {}, recordJump(recordId),
      ...evidence.map(item => el('div', { className: 'chronik-evidence__statement' },
        el('p', {}, `${item.date ? dateMeta(item.date).dateLabel + ' · ' : 'Ohne eigene Datierung · '}${item.context === 'document' ? 'In der Quelle genannt' : 'Datierte Aussage'} · ${item.label}`),
        ...item.notes.map(note => el('p', { className: 'chronik-evidence__note' }, note))))));
  }
  const content = el('div', {}, list);
  if (entry.evidence.some(item => item.context === 'document')) content.appendChild(el('p', {
    className: 'chronik-evidence__caution',
  }, 'Die Nennung im Dokument belegt für dieses Datum keinen gemeinsamen Auftritt oder Aufenthalt.'));
  openPanel(entry.name, `${row.dateLabel} · ${entry.recordIds.length} ${entry.recordIds.length === 1 ? 'Beleg' : 'Belege'}`,
    content, trigger, { key: entry.key });
}
