/** A linear time surface: only labels aggregate, never the temporal coordinates. */
import { el, clear } from '../utils/dom.js';
import { dateExtent, layoutEntries, ticksForWindow } from './chronik-time-layout.js';

const YEAR = 365.2425 * 86400000;
const SCALES = { overview: ['Jahrzehnte', 24], years: ['Jahre', 260], year: ['Monate', 1800], month: ['Tage', 12000] };
const BUCKET = 156;
const PAD = 52;
const anchorOf = extent => extent.qualifier === 'nach' ? extent.end : extent.start;
const dateLabel = time => new Intl.DateTimeFormat('de-AT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(time);

export function createChronikAxis({ rows, undated, renderSummary, openRows, openRow, beforeNavigate }) {
  const entries = rows.map(row => ({ row, extent: dateExtent(row.key) }));
  const dated = entries.filter(entry => entry.extent);
  const invalid = entries.filter(entry => !entry.extent).map(entry => entry.row);
  const first = dated.length ? Math.min(...dated.map(entry => entry.extent.start)) : Date.UTC(1950, 0);
  const last = dated.length ? Math.max(...dated.map(entry => Math.max(entry.extent.end, anchorOf(entry.extent) + 1))) : Date.UTC(1951, 0);
  const start = Date.UTC(new Date(first).getUTCFullYear(), 0);
  const end = Date.UTC(new Date(last - 1).getUTCFullYear() + 1, 0);
  const frequency = new Map();
  for (const { row } of dated) {
    const count = row.sources.filter(source => source.kind === 'document').length;
    if (count) frequency.set(row.year, (frequency.get(row.year) || 0) + count);
  }
  const preferredYear = [...frequency].sort((a, b) => b[1] - a[1])[0]?.[0] ?? new Date(first).getUTCFullYear();
  let scale = 'years';
  let px = SCALES[scale][1] / YEAR;
  let frame = 0;
  let disposed = false;
  const surface = el('div', { className: 'chronik-timeline', 'aria-label': 'Chronologische Quellen und Entitäten' });
  const ticks = el('div', { className: 'chronik-ticks', 'aria-hidden': 'true' });
  const scroller = el('div', { className: 'chronik-scroll', tabindex: '0', 'aria-label': 'Zeitachse, nach unten durch die Zeit scrollen' }, surface);
  const position = time => PAD + (time - start) * px;
  const timeAt = y => start + (y - PAD) / px;
  const center = () => timeAt(scroller.scrollTop + scroller.clientHeight / 2);
  const yearSelect = el('select', { id: 'chronik-year-jump', 'aria-label': 'Zum Jahr springen', onChange: event => {
    navigate(Date.UTC(Number(event.target.value), 0));
  } }, ...Array.from({ length: new Date(end).getUTCFullYear() - new Date(start).getUTCFullYear() }, (_, offset) => {
    const year = new Date(start).getUTCFullYear() + offset;
    return el('option', { value: String(year) }, String(year));
  }));
  const scaleSelect = el('select', { id: 'chronik-scale', 'aria-label': 'Maßstab', onChange: event => {
    const anchor = center();
    beforeNavigate();
    scale = event.target.value;
    px = SCALES[scale][1] / YEAR;
    draw();
    scroller.scrollTop = position(anchor) - scroller.clientHeight / 2;
    updateTicks();
  } }, ...Object.entries(SCALES).map(([value, [label]]) => el('option', { value }, label)));
  scaleSelect.value = scale;
  const previous = el('button', { type: 'button', 'aria-label': 'Zur vorherigen Datierung', onClick: () => step(-1) }, '↑');
  const next = el('button', { type: 'button', 'aria-label': 'Zur nächsten Datierung', onClick: () => step(1) }, '↓');
  const controls = el('div', { className: 'chronik-navigation' },
    el('label', {}, 'Jahr', yearSelect), el('label', {}, 'Maßstab', scaleSelect),
    el('div', { className: 'chronik-step', role: 'group', 'aria-label': 'Datumsgruppen durchgehen' }, previous, next));
  const extra = el('div', { className: 'chronik-extra' });
  let visibleRanges = [];
  const rangesButton = el('button', { type: 'button', className: 'chronik-more chronik-visible-ranges',
    onClick: event => openRows(visibleRanges, event.currentTarget, 'Datierungsbereiche im Ausschnitt'),
  }, 'Datierungsbereiche');
  extra.appendChild(rangesButton);
  if (undated) extra.appendChild(el('button', { type: 'button', className: 'chronik-more chronik-undated',
    onClick: event => openRow(undated, event.currentTarget),
  }, `Ohne Datum · ${undated.sources.length}`));
  if (invalid.length) extra.appendChild(el('button', { type: 'button', className: 'chronik-more chronik-invalid',
    onClick: event => openRows(invalid, event.currentTarget, 'Datierung prüfen'),
  }, `Datierung prüfen · ${invalid.length}`));
  controls.appendChild(extra);

  function navigate(time) {
    beforeNavigate();
    scroller.scrollTop = Math.max(0, position(time) - PAD);
    updateTicks();
  }

  function step(direction) {
    const anchor = timeAt(scroller.scrollTop + PAD);
    const candidates = dated.map(entry => anchorOf(entry.extent)).sort((a, b) => a - b);
    const target = direction > 0 ? candidates.find(time => time > anchor + 86400000 / 2)
      : candidates.findLast(time => time < anchor - 86400000 / 2);
    if (target != null) navigate(target);
  }

  function draw() {
    clear(surface);
    const height = (end - start) * px;
    surface.style.height = `${height + PAD * 2 + BUCKET}px`;
    surface.dataset.start = String(start);
    surface.dataset.pxPerDay = String(px * 86400000);
    surface.appendChild(el('div', { className: 'chronik-axis-line', 'aria-hidden': 'true' }));
    surface.appendChild(ticks);
    const tracks = [];
    const sorted = [...dated].sort((a, b) => a.extent.start - b.extent.start || b.extent.end - a.extent.end);
    for (const { row, extent } of sorted) {
      const y = position(anchorOf(extent));
      const uncertain = extent.precision !== 'day' || extent.qualifier;
      if (uncertain && !['vor', 'nach'].includes(extent.qualifier)) {
        let track = tracks.findIndex(stop => stop <= extent.start);
        if (track < 0) track = tracks.length;
        tracks[track] = extent.end;
        const bar = el('button', { type: 'button', tabindex: '-1', className: `chronik-range${extent.isRange ? ' chronik-range--interval' : ''}`,
          dataset: { date: row.key, tip: `${row.dateLabel} · ${extent.isRange ? 'Genannter Zeitraum' : 'Datumsgenauigkeit'}` },
          'aria-label': `${row.dateLabel} · ${extent.isRange ? 'Genannter Zeitraum' : 'Datumsgenauigkeit'}, Belege ansehen`,
          onClick: event => openRow(row, event.currentTarget),
        });
        bar.style.top = `${y}px`;
        bar.style.height = `${Math.max(2, (extent.end - extent.start) * px)}px`;
        bar.style.setProperty('--track', String(track));
        surface.appendChild(bar);
      }
      const kinds = [...new Set(row.sources.map(source => source.kind))];
      for (const kind of kinds) {
        const mark = el('button', { type: 'button', tabindex: '-1', className: `chronik-mark chronik-mark--${kind}${extent.qualifier ? ' chronik-mark--qualified' : ''}`,
          dataset: { date: row.key, kind, tip: `${row.dateLabel} · ${kind === 'document' ? 'Dokumentdatum' : 'Datierte Aussage'}` },
          'aria-label': `${row.dateLabel} · ${kind === 'document' ? 'Dokumentdatum' : 'Datierte Aussage'}, Belege ansehen`,
          onClick: event => openRow(row, event.currentTarget),
        });
        mark.style.top = `${y}px`;
        if (kinds.length > 1 && kind === 'statement') mark.classList.add('chronik-mark--paired');
        if (extent.qualifier) mark.textContent = extent.qualifier === 'vor' ? '↑' : extent.qualifier === 'nach' ? '↓' : '~';
        surface.appendChild(mark);
      }
    }
    surface.style.setProperty('--track-step', `${Math.min(5, 38 / Math.max(1, tracks.length - 1))}px`);
    const groups = layoutEntries(dated.map(({ row, extent }) => ({ row,
      extent: { ...extent, start: anchorOf(extent), end: Math.max(extent.end, anchorOf(extent) + 1) },
    })), { start, end, height, bucketHeight: BUCKET });
    for (const group of groups) {
      const top = PAD + (group.labelY ?? Math.floor(group.y / BUCKET) * BUCKET);
      const card = el('section', { className: 'chronik-cluster', dataset: { groupKey: group.key },
        'aria-label': group.rows.length === 1 ? group.rows[0].dateLabel : `${group.rows.length} Datumsgruppen`,
      }, renderSummary(group.rows));
      card.style.top = `${top}px`;
      surface.appendChild(card);
      const anchor = position(Math.min(...group.rows.map(row => anchorOf(dateExtent(row.key)))));
      const line = el('div', { className: 'chronik-connector', 'aria-hidden': 'true' });
      line.style.top = `${Math.min(anchor, top + 20)}px`;
      line.style.height = `${Math.max(1, Math.abs(anchor - top - 20))}px`;
      line.classList.toggle('chronik-connector--up', anchor > top + 20);
      surface.appendChild(line);
    }
    if (!dated.length) surface.appendChild(el('p', { className: 'chronik-empty' },
      undated ? 'Die ausgewählten Dokumente haben kein einordenbares Datum.' : 'Keine Datierungen in dieser Auswahl.'));
    updateTicks();
  }

  function updateTicks() {
    if (disposed) return;
    clear(ticks);
    const from = Math.max(start, timeAt(scroller.scrollTop - 80));
    const to = Math.min(end, timeAt(scroller.scrollTop + (scroller.clientHeight || 700) + 80));
    if (to > from) for (const tick of ticksForWindow(from, to, (to - from) * px)) {
      const time = tick.time ?? tick.value;
      const node = el('div', { className: `chronik-tick${tick.major ? ' chronik-tick--major' : ''}`, dataset: { year: String(new Date(time).getUTCFullYear()) } }, tick.label);
      node.style.top = `${position(time)}px`;
      ticks.appendChild(node);
    }
    visibleRanges = dated.filter(({ extent }) =>
      (extent.isRange || extent.precision !== 'day') && !['vor', 'nach'].includes(extent.qualifier)
      && extent.start < timeAt(scroller.scrollTop + scroller.clientHeight)
      && extent.end > timeAt(scroller.scrollTop)).map(entry => entry.row);
    rangesButton.textContent = `Datierungsbereiche · ${visibleRanges.length}`;
    rangesButton.disabled = !visibleRanges.length;
    for (const group of surface.querySelectorAll('.chronik-cluster')) {
      const inView = group.offsetTop + BUCKET >= scroller.scrollTop
        && group.offsetTop <= scroller.scrollTop + scroller.clientHeight;
      for (const button of group.querySelectorAll('button')) button.tabIndex = inView ? 0 : -1;
    }
    const visible = Math.max(start, Math.min(end - 1, timeAt(scroller.scrollTop + PAD + 1)));
    yearSelect.value = String(new Date(visible).getUTCFullYear());
    scroller.setAttribute('aria-description', `Ausschnitt ab ${dateLabel(visible)}. Maßstab: ${SCALES[scale][0]}.`);
    previous.disabled = !dated.some(entry => anchorOf(entry.extent) < visible - 43200000);
    next.disabled = !dated.some(entry => anchorOf(entry.extent) > visible + 43200000);
  }

  scroller.addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; updateTicks(); });
  });
  const observer = new ResizeObserver(updateTicks);
  observer.observe(scroller);
  draw();
  requestAnimationFrame(() => { if (!disposed) navigate(Date.UTC(preferredYear, 0)); });
  return { element: scroller, controls, destroy() { disposed = true; observer.disconnect(); cancelAnimationFrame(frame); } };
}
