import { el } from '../utils/dom.js';

const documentCount = count => `${count} ${count === 1 ? 'Dokument' : 'Dokumente'}`;
const denominator = count => `${count} ${count === 1 ? 'Dokument' : 'Dokumenten'}`;

export function chartCoverageSummary({ cutIds, aggregates, coverage = {} }, selectedIds = []) {
  const cut = new Set(cutIds);
  const represented = new Set(aggregates.flatMap(item => item.recordIds || []));
  const visible = new Set(coverage.visibleRecordIds || represented);
  const included = [...represented].filter(id => cut.has(id)).length;
  // The figure carries the compact count; the sentence stands in its tooltip.
  const overview = `${included} von ${cut.size}`;
  const overviewTip = `${included} von ${denominator(cut.size)} im aktuellen Filter erscheinen in dieser Auswertung.`;
  const selected = [...new Set(selectedIds)];
  if (!selected.length) return { overview, overviewTip, selection: '' };
  const inCut = selected.filter(id => cut.has(id));
  const matched = selected.filter(id => represented.has(id));
  const shown = matched.filter(id => visible.has(id));
  const notes = [`Auswahl: ${matched.length} von ${denominator(selected.length)} in dieser Auswertung.`];
  if (matched.length > shown.length) notes.push(
    `${documentCount(matched.length - shown.length)} außerhalb der angezeigten Zeilen oder Spalten. Über die Liste erreichbar.`);
  const outside = selected.length - inCut.length;
  if (outside) notes.push(`${documentCount(outside)} außerhalb des aktuellen Filters.`);
  const missing = inCut.filter(id => !represented.has(id));
  const explained = new Set();
  for (const dimension of coverage.dimensions || []) {
    const present = new Set(dimension.recordIds);
    const absent = missing.filter(id => !present.has(id));
    if (absent.length) {
      notes.push(`${documentCount(absent.length)} ohne ${dimension.label}.`);
      absent.forEach(id => explained.add(id));
    }
  }
  const unrepresented = missing.filter(id => !explained.has(id)).length;
  if (unrepresented) notes.push(coverage.dimensions
    ? `Für ${documentCount(unrepresented)} liegt keine passende Verbindung dieser Angaben vor.`
    : `${documentCount(unrepresented)} ohne Eintrag in der gewählten Auswertung. Ansichtsbereich und Datenangaben prüfen.`);
  return { overview, overviewTip, selection: notes.join(' ') };
}

export function createChartCoverage(options) {
  const status = el('span', { className: 'dashboard-chart-status', tabindex: '0' });
  const selection = el('p', { className: 'dashboard-chart-selection', 'aria-live': 'polite' });
  const element = el('div', { className: 'dashboard-coverage' }, selection);
  function highlight(ids) {
    const summary = chartCoverageSummary(options, ids);
    status.textContent = summary.overview;
    status.dataset.tip = summary.overviewTip;
    status.setAttribute('aria-label', summary.overviewTip);
    selection.textContent = summary.selection;
    selection.hidden = !summary.selection;
  }
  highlight([]);
  return { element, status, highlight };
}
