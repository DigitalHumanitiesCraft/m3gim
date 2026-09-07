/** Pure calendar geometry for the continuous Chronik axis. */

const DAY = 24 * 60 * 60 * 1000;
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
    if (year < 1) return null;
    return { start: utc(year), end: utc(year + 1), precision: 'year' };
  }
  match = /^(\d{4})-(\d{2})$/.exec(raw);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (year < 1 || month < 1 || month > 12) return null;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 0 : month;
    return { start: utc(year, month - 1), end: utc(nextYear, nextMonth), precision: 'month' };
  }
  match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return null;
  const start = utc(year, month - 1, day);
  const probe = new Date(start);
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1
    || probe.getUTCDate() !== day) return null;
  return { start, end: start + DAY, precision: 'day' };
}

/** Convert one recorded date value into its inclusive calendar coverage. */
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

/** Group rows into fixed-height cells without merging or moving their anchors. */
export function layoutEntries(entries, { start, end, height, bucketHeight = 156 } = {}) {
  if (![start, end, height, bucketHeight].every(Number.isFinite)
    || end <= start || height < 0 || bucketHeight <= 0) return [];
  const scale = height / (end - start);
  const groups = new Map();
  for (const item of entries || []) {
    const extent = item && item.extent;
    if (!extent || !Number.isFinite(extent.start) || !Number.isFinite(extent.end)
      || extent.end <= start || extent.start >= end) continue;
    const anchor = Math.max(extent.start, start);
    const y = (anchor - start) * scale;
    const bucket = Math.min(Math.max(0, Math.floor(y / bucketHeight)),
      Math.max(0, Math.ceil(height / bucketHeight) - 1));
    const cellStart = start + (bucket * bucketHeight) / scale;
    const key = `time-${Math.round(cellStart)}`;
    if (!groups.has(key)) groups.set(key, { rows: [], key, y, labelY: bucket * bucketHeight });
    const group = groups.get(key);
    group.rows.push(item.row);
    group.y = Math.min(group.y, y);
  }
  return [...groups.values()].sort((a, b) => a.labelY - b.labelY);
}

function chooseStep(span, height) {
  const desired = Math.max(1, height / 70);
  const years = span / (365.2425 * DAY);
  if (years >= 2) {
    const options = [1, 2, 5, 10, 20, 50, 100, 200, 500];
    return { unit: 'year', step: options.find(step => years / step <= desired) || 1000 };
  }
  const months = span / (30.4375 * DAY);
  if (months >= 2) {
    const options = [1, 2, 3, 6];
    return { unit: 'month', step: options.find(step => months / step <= desired) || 12 };
  }
  const days = span / DAY;
  const options = [1, 2, 5, 7, 14];
  return { unit: 'day', step: options.find(step => days / step <= desired) || 28 };
}

/** Calendar ticks at roughly seventy pixels spacing for the visible window. */
export function ticksForWindow(start, end, height) {
  if (![start, end, height].every(Number.isFinite) || end <= start || height <= 0) return [];
  const { unit, step } = chooseStep(end - start, height);
  const from = new Date(start);
  const ticks = [];
  let cursor;
  if (unit === 'year') {
    const year = Math.max(1, Math.ceil(from.getUTCFullYear() / step) * step);
    cursor = utc(year);
  } else if (unit === 'month') {
    const absolute = from.getUTCFullYear() * 12 + from.getUTCMonth();
    const aligned = Math.ceil(absolute / step) * step;
    cursor = utc(Math.floor(aligned / 12), aligned % 12);
  } else {
    cursor = utc(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
    if (cursor < start) cursor += DAY;
    const ordinal = Math.floor(cursor / DAY);
    cursor += ((step - (ordinal % step)) % step) * DAY;
  }
  while (cursor < end && ticks.length < 2000) {
    const date = new Date(cursor);
    const year = date.getUTCFullYear();
    if (year > 0) {
      const major = unit === 'year' || (date.getUTCMonth() === 0 && date.getUTCDate() === 1);
      const label = unit === 'year' ? String(year)
        : unit === 'month' ? `${MONTHS[date.getUTCMonth()]} ${year}`
          : `${date.getUTCDate()}. ${MONTHS[date.getUTCMonth()]}`;
      ticks.push({ time: cursor, label, major });
    }
    if (unit === 'year') cursor = utc(year + step);
    else if (unit === 'month') cursor = utc(year, date.getUTCMonth() + step);
    else cursor += step * DAY;
  }
  return ticks;
}
