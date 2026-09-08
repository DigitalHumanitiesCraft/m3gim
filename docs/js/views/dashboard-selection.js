import { el } from '../utils/dom.js';
import { createSelectionDetail } from '../ui/selection-detail.js';
import { getFilter, setFilter } from '../ui/filter-state.js';
import { navigateToView } from '../ui/router.js';
import { isInKorb, toggleKorb } from '../ui/basket.js';
import { formatSignatur, roleLabel } from '../utils/format.js';
import { aggregateExportRows } from './statistik-data.js';
import { downloadCsv, downloadJson, unitLabel } from './dashboard-shared.js';

const WITNESS_KINDS = Object.freeze({
  record: 'Dokument', doctype: 'Dokumenttyp', 'document-type': 'Dokumenttyp',
  work: 'Werkangabe', composer: 'Komponistenangabe', 'work-composer': 'Werk und Komponist',
  person: 'Personenangabe', institution: 'Institutionsangabe', agent: 'Akteursangabe',
  'agent-role': 'Akteur und Rolle', 'place-statement': 'Ortsaussage', place: 'Ortsangabe',
  placerole: 'Ortsrolle', 'primary-anchor': 'Primärer Zeitanker', time: 'Zeitangabe',
  stagepart: 'Bühnenrolle', 'performance-part': 'Werk und Bühnenrolle',
  'set-membership': 'Mengenzugehörigkeit', annotation: 'Datierte Aussage',
});

function witnessKind(item) {
  return WITNESS_KINDS[item.kind] || WITNESS_KINDS[item.sourceRef?.kind]
    || WITNESS_KINDS[item.dimension] || 'Dimensionsbeleg';
}

function witnessText(store, item) {
  const main = item.label || item.value || item.originalValue || item.key || 'Ohne Anzeigeform';
  const role = item.roleLabel || (item.role ? roleLabel(store, item.role) : '');
  const details = [role, item.anchorDate || item.date,
    item.association === 'derived-single-work' ? 'aus genau einem Werk im Dokument abgeleitet' : null,
    item.association === 'unassigned' ? 'keinem Werk zugeordnet' : null]
    .filter(value => value && !String(main).includes(String(value)));
  return details.length ? `${main} · ${details.join(' · ')}` : main;
}

function witnessSource(item) {
  return item.source || item.sourceRef || null;
}

function witnessList(store, items, emptyLabel) {
  if (!items.length) return el('p', { className: 'dashboard-selection__empty-evidence' }, emptyLabel);
  const list = el('ul', { className: 'dashboard-selection__witnesses' });
  for (const item of items) {
    const record = store.records.get(item.recordId);
    const source = witnessSource(item);
    const hasOriginal = !!(source?.sheet && source?.row != null);
    list.appendChild(el('li', {},
      el('span', { className: 'dashboard-selection__witness-kind' }, witnessKind(item)),
      el('span', {}, witnessText(store, item)),
      el('button', { type: 'button', className: 'ui-action', onClick: () => navigateToView('bestand', {
        recordId: item.recordId, preserveFilter: true,
      }) }, record ? formatSignatur(record['rico:identifier']) : item.recordId),
      el('span', { className: 'dashboard-selection__source-state' },
        hasOriginal ? 'Originalstelle ist im Datenbeleg erhalten' : 'Originalstelle nicht erfasst')));
  }
  return list;
}

function mergeMarks(marks) {
  const recordIds = [...new Set(marks.flatMap(mark => mark.recordIds || []))].sort();
  const witnessMap = new Map();
  for (const item of marks.flatMap(mark => mark.witnesses || [])) {
    const key = JSON.stringify([item.id || item.witnessId || item.nodeId || item.key || '',
      item.kind || item.dimension || '', item.recordId || '', item.sourceKey || '',
      item.source?.sheet || '', item.source?.row || '', item.source?.datenpunkt || '']);
    if (!witnessMap.has(key)) witnessMap.set(key, item);
  }
  const sourceMap = new Map();
  const directSources = marks.flatMap(mark => mark.sourceRefs || []);
  const witnessSources = [...witnessMap.values()].filter(item => item.source)
    .map(item => ({ ...item.source, recordId: item.recordId }));
  for (const source of [...directSources, ...witnessSources]) {
    const key = JSON.stringify([source?.recordId || '', source?.sheet || '', source?.row || '', source?.datenpunkt || '']);
    if (!sourceMap.has(key)) sourceMap.set(key, source);
  }
  return { recordIds, witnesses: [...witnessMap.values()], sourceRefs: [...sourceMap.values()] };
}

function markIdentity(mark) {
  return JSON.stringify([
    mark.key || '', mark.descriptor || null, mark.dimensions || null,
    [...new Set(mark.recordIds || [])].sort(),
  ]);
}

export function createDashboardSelection({ host, store, fingerprint, getQueryWitnesses, getReference, onHighlight }) {
  let marks = [];
  let lastTrigger = null;
  let lastPanel = null;
  const detail = createSelectionDetail({ host, onClose() { marks = []; onHighlight(new Set()); } });

  function render() {
    const merged = mergeMarks(marks);
    const content = el('div', { className: 'dashboard-selection' });
    const actions = el('div', { className: 'dashboard-selection__actions' });
    actions.append(
      el('button', { type: 'button', className: 'ui-action', onClick: applySelection }, 'Auswahl als Filter anwenden'),
      el('button', { type: 'button', className: 'ui-action', onClick: addToBasket }, 'Dokumente zum Korb hinzufügen'),
      el('button', { type: 'button', className: 'ui-action', onClick: downloadSelectionCsv }, 'Auswahl CSV'),
      el('button', { type: 'button', className: 'ui-action', onClick: () => downloadSelectionSources(merged) }, 'Quellen JSON'));
    content.appendChild(actions);
    if (marks.length > 1) {
      content.appendChild(el('p', { className: 'dashboard-selection__union' },
        `ODER-Auswahl aus ${marks.length} Markierungen; ${merged.recordIds.length} distinkte Dokumente.`));
      const chips = el('ul', { className: 'dashboard-selection__marks' });
      marks.forEach((mark, index) => chips.appendChild(el('li', {},
        el('span', {}, mark.label), el('button', { type: 'button', className: 'ui-action',
          'aria-label': `${mark.label} aus der Auswahl entfernen`, onClick: () => remove(index) }, '×'))));
      content.appendChild(chips);
    }
    content.appendChild(el('p', { className: 'dashboard-selection__evidence' },
      `${merged.recordIds.length} Dokumente · ${merged.witnesses.length} Dimensionsbelege · ${merged.sourceRefs.length} Quellenstellen`));
    const selectedIds = new Set(merged.recordIds);
    const queryWitnesses = (getQueryWitnesses?.() || []).filter(item => selectedIds.has(item.recordId));
    content.appendChild(el('h4', { className: 'dashboard-selection__heading' }, 'Trefferbelege des gemeinsamen Filters'));
    content.appendChild(witnessList(store, queryWitnesses,
      'Der gemeinsame Filter enthält keine aussagengebundene Bedingung.'));
    if (merged.witnesses.length) {
      content.appendChild(el('h4', { className: 'dashboard-selection__heading' }, 'Dimensionsbelege der Markierung'));
      content.appendChild(witnessList(store, merged.witnesses, 'Keine Dimensionsbelege vorhanden.'));
    }
    content.appendChild(el('h4', { className: 'dashboard-selection__heading' }, 'Vollständiger Dokumentkontext'));
    const list = el('ul', { className: 'dashboard-selection__records' });
    for (const id of merged.recordIds) {
      const record = store.records.get(id);
      const open = el('button', { type: 'button', className: 'ui-action', dataset: { recordId: id }, onClick: () => navigateToView('bestand', {
        recordId: id, preserveFilter: true,
      }) }, record ? `${formatSignatur(record['rico:identifier'])} · ${record['rico:title'] || '(ohne Titel)'}` : id);
      list.appendChild(el('li', {}, open));
    }
    content.appendChild(list);
    const units = [...new Set(marks.map(mark => mark.unit || 'documents'))];
    detail.open({ title: marks.length === 1 ? marks[0].label : 'Kombinierte Belegauswahl',
      kicker: 'Dashboard-Belege',
      subtitle: `${merged.recordIds.length} Dokumente; Einheit der Markierung: ${units.map(unit => unitLabel(unit, 2)).join(' / ')}`,
      content, trigger: lastTrigger });
    onHighlight(new Set(merged.recordIds));
  }

  function replace(mark, trigger) {
    marks = [mark]; lastTrigger = trigger || lastTrigger;
    lastPanel = trigger?.closest?.('.dashboard-panel') || lastPanel;
    render();
  }

  function add(mark, trigger) {
    const identity = markIdentity(mark);
    if (!marks.some(item => markIdentity(item) === identity)) marks = [...marks, mark];
    lastTrigger = trigger || lastTrigger;
    lastPanel = trigger?.closest?.('.dashboard-panel') || lastPanel;
    render();
  }

  function remove(index) {
    marks = marks.filter((_, itemIndex) => index !== itemIndex);
    if (marks.length) render(); else detail.close();
  }

  function applySelection() {
    const merged = mergeMarks(marks);
    const semantic = marks.length === 1 && marks[0].descriptor?.type === 'set-membership'
      ? marks[0].descriptor : { type: 'records', ids: merged.recordIds };
    const current = getFilter();
    const retained = (current.predicates || []).filter(predicate => !['records', 'set-membership'].includes(predicate.type));
    setFilter({ predicates: [...retained, semantic] });
  }

  function addToBasket() {
    const merged = mergeMarks(marks);
    for (const id of merged.recordIds) if (!isInKorb(id)) toggleKorb(id);
  }

  function downloadSelectionCsv() {
    downloadCsv('m3gim-dashboard-auswahl.csv', aggregateExportRows(marks, {
      filter: getFilter(), fingerprint, reference: getReference?.() || null,
    }));
  }

  function downloadSelectionSources(merged) {
    downloadJson('m3gim-dashboard-quellen.json', {
      dataset: fingerprint, filter: getFilter(), reference: getReference?.() || null,
      marks: marks.map(mark => ({ key: mark.key, label: mark.label,
        unit: mark.unit, count: mark.count, denominator: mark.denominator, recordIds: mark.recordIds,
        descriptor: mark.descriptor || null, dimensions: mark.dimensions || null,
        comparisonSide: mark.comparisonSide || null, referenceFilter: mark.referenceFilter || null,
        denominatorA: mark.denominatorA ?? null, denominatorB: mark.denominatorB ?? null,
        witnesses: mark.witnesses || [], sourceRefs: mark.sourceRefs || [],
      })),
      recordIds: merged.recordIds,
    });
  }

  return { replace, add, retarget(trigger) {
    if (!marks.length || trigger !== lastPanel) return;
    lastTrigger = trigger; detail.setFocusTarget?.(trigger);
  },
    close: () => detail.close(), clear() { marks = []; detail.close(); onHighlight(new Set()); },
    destroy: () => detail.destroy(), get recordIds() { return new Set(mergeMarks(marks).recordIds); } };
}
