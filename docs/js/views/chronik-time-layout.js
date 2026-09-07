/** Pure calendar geometry for the compressed Chronik axis. */
const DAY = 86400000;
const QUALIFIER = /^(circa|vor|nach):/;
const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function utc(year, month = 0, day = 1) {
  const value = new Date(0);
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCFullYear(year, month, day);
  return value.getTime();
}

function pointExtent(raw) {
  let match = /^(\d{4})$/.exec(raw);
  if (match) {
    const year = Number(match[1]);
    return year > 0 ? { start: utc(year), end: utc(year + 1), precision: 'year' } : null;
  }
  match = /^(\d{4})-(\d{2})$/.exec(raw);
  if (match) {
    const year = Number(match[1]); const month = Number(match[2]);
    return year > 0 && month >= 1 && month <= 12
      ? { start: utc(year, month - 1), end: utc(year, month), precision: 'month' } : null;
  }
  match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return null;
  const start = utc(year, month - 1, day); const probe = new Date(start);
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  return { start, end: start + DAY, precision: 'day' };
}

export function dateExtent(raw) {
  if (raw == null) return null;
  let text = String(raw).trim();
  if (!text || text === 'undated') return null;
  const qualifierMatch = text.match(QUALIFIER);
  const qualifier = qualifierMatch ? qualifierMatch[1] : null;
  if (qualifierMatch) text = text.slice(qualifierMatch[0].length);
  const parts = text.split('/');
  if (parts.length > 2 || parts.some(part => !part)) return null;
  const first = pointExtent(parts[0]);
  if (!first) return null;
  if (parts.length === 1) return { ...first, qualifier, isRange: false };
  const last = pointExtent(parts[1]);
  if (!last || last.start < first.start) return null;
  return { start: first.start, end: last.end, precision: 'range', qualifier, isRange: true };
}

const anchorOf = extent => extent.qualifier === 'nach' ? extent.end : extent.start;

function cellFor(time, scale) {
  const date = new Date(time); const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); const day = date.getUTCDate();
  if (scale === 'overview') {
    const decade = Math.floor(year / 10) * 10;
    return { key: `decade-${decade}`, label: `${decade}er`, start: utc(decade), end: utc(decade + 10), year };
  }
  if (scale === 'year') return { key: `month-${year}-${String(month + 1).padStart(2, '0')}`,
    label: `${MONTHS[month]} ${year}`, start: utc(year, month), end: utc(year, month + 1), year };
  if (scale === 'month') return { key: `day-${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    label: `${day}. ${MONTHS[month]} ${year}`, start: utc(year, month, day), end: utc(year, month, day + 1), year };
  return { key: `year-${year}`, label: String(year), start: utc(year), end: utc(year + 1), year };
}

function isCoarse(extent, scale) {
  if (extent.isRange) return scale === 'year' || scale === 'month';
  if (scale === 'year') return extent.precision === 'year';
  if (scale === 'month') return extent.precision === 'year' || extent.precision === 'month';
  return false;
}

function unitCount(start, end, scale) {
  const first = new Date(start); const last = new Date(end);
  if (scale === 'month') return Math.round((end - start) / DAY);
  if (scale === 'year') return (last.getUTCFullYear() - first.getUTCFullYear()) * 12 + last.getUTCMonth() - first.getUTCMonth();
  const years = last.getUTCFullYear() - first.getUTCFullYear();
  return scale === 'overview' ? Math.ceil(years / 10) : years;
}

function makeGap(start, end, y, options) {
  const key = `gap-${start}-${end}`;
  const height = options.expandedGaps.has(key)
    ? Math.min(4000, unitCount(start, end, options.scale) * options.rowHeight) : options.gapHeight;
  return { kind: 'gap', key, start, end, y, height,
    fromYear: new Date(start).getUTCFullYear(), toYear: new Date(end - 1).getUTCFullYear() };
}

export function buildCalendarLayout(rows, {
  scale = 'years', rowHeight = 250, gapHeight = 56, expandedGaps = new Set(), extraYears = [],
} = {}) {
  const empty = { groups: [], segments: [], height: 0, position: () => 0, timeAt: () => 0,
    years: [], invalid: [], coarseRows: [] };
  if (!['overview', 'years', 'year', 'month'].includes(scale) || !Number.isFinite(rowHeight)
    || rowHeight <= 0 || !Number.isFinite(gapHeight) || gapHeight < 0) return { ...empty, invalid: [...(rows || [])] };
  const invalid = []; const coarseRows = []; const buckets = new Map();
  const extentStarts = []; const extentEnds = [];
  for (const item of rows || []) {
    const row = item?.row ?? item; const extent = item?.extent ?? dateExtent(row?.key);
    if (!extent) { invalid.push(row); continue; }
    const anchor = anchorOf(extent);
    if (extent.qualifier === 'vor' || extent.qualifier === 'nach') {
      const boundaryCell = cellFor(anchor, scale);
      extentStarts.push(boundaryCell.start); extentEnds.push(boundaryCell.end);
    } else {
      extentStarts.push(extent.start); extentEnds.push(extent.end);
    }
    if (isCoarse(extent, scale)) {
      coarseRows.push({ row, extent, year: new Date(anchor).getUTCFullYear() }); continue;
    }
    const cell = cellFor(anchor, scale);
    if (!buckets.has(cell.key)) buckets.set(cell.key, { ...cell, rows: [] });
    buckets.get(cell.key).rows.push(row);
  }
  const groups = [...buckets.values()].sort((a, b) => a.start - b.start);
  const extra = [...new Set((extraYears || []).map(Number).filter(year => Number.isInteger(year) && year > 0))];
  const starts = groups.map(group => group.start).concat(extentStarts, extra.map(year => utc(year)));
  const ends = groups.map(group => group.end).concat(extentEnds, extra.map(year => utc(year + 1)));
  if (!starts.length) return { ...empty, groups, invalid, coarseRows };
  const domainStart = Math.min(...starts); const domainEnd = Math.max(...ends);
  const segments = []; let cursor = domainStart; let height = 0;
  const options = { scale, rowHeight, gapHeight, expandedGaps };
  for (const group of groups) {
    if (group.start > cursor) {
      const gap = makeGap(cursor, group.start, height, options); segments.push(gap); height += gap.height;
    }
    group.kind = 'group'; group.y = height; group.height = rowHeight;
    segments.push(group); height += rowHeight; cursor = Math.max(cursor, group.end);
  }
  if (cursor < domainEnd) {
    const gap = makeGap(cursor, domainEnd, height, options); segments.push(gap); height += gap.height;
  }
  const minYear = new Date(domainStart).getUTCFullYear(); const maxYear = new Date(domainEnd - 1).getUTCFullYear();
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);
  const position = time => {
    if (!Number.isFinite(time) || !segments.length || time <= domainStart) return 0;
    if (time >= domainEnd) return height;
    const segment = segments.find(part => time < part.end) || segments.at(-1);
    return segment.y + (time - segment.start) / (segment.end - segment.start) * segment.height;
  };
  const timeAt = y => {
    if (!Number.isFinite(y) || !segments.length || y <= 0) return domainStart;
    if (y >= height) return domainEnd;
    const segment = segments.find(part => y < part.y + part.height) || segments.at(-1);
    return segment.start + (y - segment.y) / segment.height * (segment.end - segment.start);
  };
  return { groups, segments, height, position, timeAt, years, invalid, coarseRows };
}
