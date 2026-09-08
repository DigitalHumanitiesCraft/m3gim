/** Calendar lanes share a continuous rail with explicitly compressed gaps. */
import { el, clear } from '../utils/dom.js';
import { buildCalendarLayout } from './chronik-time-layout.js';

const SCALES = { overview: 'Jahrzehnte', years: 'Jahre', year: 'Monate', month: 'Tage' };
const HEADER = 62;
const calendarYear = time => new Date(time).getUTCFullYear();

export function createChronikAxis({ rows, undated, renderLanes, openRows, openRow, beforeNavigate }) {
  let scale = 'years';
  let layout;
  let disposed = false;
  let frame = 0;
  let currentHeight = 460;
  let currentHostWidth = 0;
  const expandedGaps = new Set();
  const surface = el('div', { className: 'chronik-timeline' });
  const currentYear = el('span', { className: 'chronik-current-year', 'aria-label': 'Aktueller Zeitabschnitt' });
  const head = el('div', { className: 'chronik-lane-head chronik-calendar-grid' },
    el('span', {}, 'Zeit ↓', currentYear), el('span', { 'aria-hidden': 'true' }),
    el('span', {}, 'Quellen'), ...['Orte', 'Personen', 'Werke', 'Institutionen'].map(label => el('span', { className: 'chronik-entity-heading' }, label)));
  const scroller = el('div', { className: 'chronik-scroll', tabindex: '0', 'aria-label': 'Chronik mit Kalendergruppen' }, head, surface);
  const yearSelect = el('select', { className: 'ui-select', id: 'chronik-year-jump', 'aria-label': 'Zum Jahr springen',
    onChange: event => navigate(Date.UTC(Number(event.target.value), 0)),
  });
  const scaleSelect = el('select', { className: 'ui-select', id: 'chronik-scale', 'aria-label': 'Maßstab', onChange: event => {
    const anchor = layout.timeAt(scroller.scrollTop);
    beforeNavigate();
    scale = event.target.value;
    expandedGaps.clear();
    draw(anchor);
  } }, ...Object.entries(SCALES).map(([value, label]) => el('option', { value }, label)));
  scaleSelect.value = scale;
  const previous = el('button', { type: 'button', 'aria-label': 'Zur vorherigen Kalendergruppe', onClick: () => step(-1) }, '↑');
  const next = el('button', { type: 'button', 'aria-label': 'Zur nächsten Kalendergruppe', onClick: () => step(1) }, '↓');
  const coarseButton = el('button', { type: 'button', className: 'chronik-more chronik-coarse',
    onClick: event => openRows(layout.coarseRows.map(item => item.row), event.currentTarget, 'Zeitangaben mit gröberer Datierung'),
  });
  const invalidButton = el('button', { type: 'button', className: 'chronik-more chronik-invalid',
    onClick: event => openRows(layout.invalid, event.currentTarget, 'Datierung prüfen'),
  });
  const controls = el('div', { className: 'chronik-navigation' },
    el('label', {}, 'Jahr', yearSelect), el('label', {}, 'Maßstab', scaleSelect),
    el('div', { className: 'chronik-step', role: 'group', 'aria-label': 'Kalendergruppen durchgehen' }, previous, next),
    coarseButton,
    undated ? el('button', { type: 'button', className: 'chronik-more chronik-undated',
      onClick: event => openRow(undated, event.currentTarget),
    }, `Ohne Datum · ${undated.sources.length}`) : null, invalidButton);

  function navigate(time) {
    beforeNavigate();
    scroller.scrollTop = layout.position(time);
    updateNavigation();
  }

  function step(direction) {
    const target = direction > 0 ? layout.groups.find(group => group.y > scroller.scrollTop + 2)
      : layout.groups.findLast(group => group.y < scroller.scrollTop - 2);
    if (target) navigate(target.start);
  }

  function readingHeight() {
    if (!scroller.isConnected) return currentHeight;
    const hostWidth = scroller.parentElement.clientWidth;
    const previousMaxWidth = scroller.style.maxWidth;
    // Reserve the detail column during measurement so selection cannot move time anchors.
    scroller.style.maxWidth = `${hostWidth >= 900 ? hostWidth - 300 : hostWidth}px`;
    let required = 0;
    for (const group of surface.querySelectorAll('.chronik-calendar-group')) {
      const top = group.getBoundingClientRect().top;
      for (const child of group.children) {
        if (child.getClientRects().length) required = Math.max(required, child.getBoundingClientRect().bottom - top);
      }
    }
    scroller.style.maxWidth = previousMaxWidth;
    return Math.ceil((required + 24) / 8) * 8;
  }

  function draw(anchor) {
    currentHostWidth = scroller.parentElement?.clientWidth || 0;
    layout = buildCalendarLayout(rows, { scale, rowHeight: currentHeight, expandedGaps });
    clear(surface);
    surface.appendChild(el('div', { className: 'chronik-axis-line', 'aria-hidden': 'true' }));
    for (const group of layout.groups) {
      const node = el('section', { className: 'chronik-calendar-group chronik-calendar-grid',
        dataset: { key: group.key, year: String(group.year), start: String(group.start) }, 'aria-label': group.label,
      }, el('div', { className: 'chronik-calendar-date' },
        el('button', { type: 'button', className: 'chronik-calendar-anchor',
          onClick: event => openRows(group.rows, event.currentTarget, group.label),
        }, group.label)), el('div', { className: 'chronik-context-space', 'aria-hidden': 'true' }), ...renderLanes(group));
      node.style.top = `${group.y}px`;
      node.style.height = `${group.height}px`;
      surface.appendChild(node);
    }
    const measuredHeight = readingHeight();
    if (measuredHeight !== currentHeight) {
      currentHeight = measuredHeight;
      layout = buildCalendarLayout(rows, { scale, rowHeight: currentHeight, expandedGaps });
      [...surface.querySelectorAll('.chronik-calendar-group')].forEach((node, index) => {
        node.style.top = `${layout.groups[index].y}px`;
        node.style.height = `${layout.groups[index].height}px`;
      });
    }
    surface.style.height = `${layout.height + HEADER}px`;
    for (const gap of layout.segments.filter(segment => segment.kind === 'gap')) {
      const isExpanded = expandedGaps.has(gap.key);
      const label = scale === 'year' || scale === 'month'
        ? `${new Date(gap.start).toLocaleDateString('de-AT', { timeZone: 'UTC' })}–${new Date(gap.end - 1).toLocaleDateString('de-AT', { timeZone: 'UTC' })}`
        : gap.fromYear === gap.toYear ? String(gap.fromYear) : `${gap.fromYear}–${gap.toYear}`;
      const node = el('div', { className: 'chronik-gap', dataset: { gapKey: gap.key, gapFrom: String(gap.fromYear), gapTo: String(gap.toYear) } },
        el('span', { className: 'chronik-gap__cut', 'aria-hidden': 'true' }, '⌁'),
        el('button', { type: 'button', className: 'chronik-more', 'aria-expanded': String(isExpanded), onClick: event => {
          beforeNavigate();
          if (isExpanded) expandedGaps.delete(gap.key); else expandedGaps.add(gap.key);
          draw(gap.start);
          surface.querySelector(`[data-gap-key="${gap.key}"] button`)?.focus({ preventScroll: true });
        } }, `${label} · ${isExpanded ? 'Zeitabschnitt zusammenziehen' : 'Zeitabschnitt verkürzt'}`));
      node.style.top = `${gap.y}px`;
      node.style.height = `${gap.height}px`;
      surface.appendChild(node);
    }
    if (!layout.groups.length) surface.appendChild(el('p', { className: 'chronik-empty' },
      layout.coarseRows.length ? 'Die vorhandenen Zeitangaben sind gröber datiert. Wähle einen gröberen Maßstab oder öffne die Zeitangaben.'
        : undated ? 'Die Quellen dieser Auswahl haben kein einordenbares Datum.' : 'Keine Datierungen in dieser Auswahl.'));
    coarseButton.hidden = !layout.coarseRows.length;
    coarseButton.textContent = `Gröbere Zeitangaben · ${layout.coarseRows.length}`;
    invalidButton.hidden = !layout.invalid.length;
    invalidButton.textContent = `Datierung prüfen · ${layout.invalid.length}`;
    clear(yearSelect);
    const years = [...new Set(layout.groups.map(group => calendarYear(group.start)).concat(layout.coarseRows.map(item => item.year)))].sort((a, b) => a - b);
    for (const year of years) yearSelect.appendChild(el('option', { value: String(year) }, String(year)));
    if (anchor != null) scroller.scrollTop = layout.position(anchor);
    updateNavigation();
  }

  function updateNavigation() {
    if (!layout || disposed) return;
    const year = calendarYear(layout.timeAt(scroller.scrollTop + 1));
    const segment = layout.segments.find(item => item.y + item.height > scroller.scrollTop + 1) || layout.segments.at(-1);
    const label = !segment ? '' : segment.kind === 'gap'
      ? segment.fromYear === segment.toYear ? String(segment.fromYear) : `${segment.fromYear}–${segment.toYear}`
      : scale === 'overview' ? segment.label : String(calendarYear(segment.start));
    currentYear.textContent = label;
    currentYear.classList.toggle('chronik-current-year--range', segment?.kind === 'gap');
    currentYear.dataset.period = segment?.key || '';
    currentYear.setAttribute('aria-label', `${segment?.kind === 'gap' ? 'Zeitlücke' : 'Aktueller Zeitabschnitt'} ${label}`);
    if ([...yearSelect.options].some(option => Number(option.value) === year)) yearSelect.value = String(year);
    previous.disabled = !layout.groups.some(group => group.y < scroller.scrollTop - 2);
    next.disabled = !layout.groups.some(group => group.y > scroller.scrollTop + 2);
  }
  scroller.addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; updateNavigation(); });
  });
  const observer = new ResizeObserver(() => {
    if (disposed || !scroller.isConnected) return;
    if (scroller.parentElement.clientWidth !== currentHostWidth) draw(layout.timeAt(scroller.scrollTop));
  });
  observer.observe(scroller);
  draw();
  requestAnimationFrame(() => {
    if (disposed) return;
    const documentYears = new Map();
    for (const group of layout.groups) {
      const year = calendarYear(group.start);
      documentYears.set(year, (documentYears.get(year) || 0) + group.rows.reduce((sum, row) => sum + row.sources.filter(source => source.kind === 'document').length, 0));
    }
    const firstYear = [...documentYears].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (firstYear != null) navigate(Date.UTC(firstYear, 0));
  });
  return { element: scroller, controls, destroy() { disposed = true; observer.disconnect(); cancelAnimationFrame(frame); } };
}
