/**
 * M³GIM Date Parsing Utilities
 */

/** Extract the first year (4-digit number) from a date string. */
export function extractYear(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr);
  // Handle date ranges: take the start part before "/"
  const part = s.includes('/') ? s.split('/')[0] : s;
  const match = part.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

/** Convert a year to a 5-year period string, e.g. 1952 → "1950-1954". */
export function get5YearPeriod(year) {
  if (!year) return null;
  const start = Math.floor(year / 5) * 5;
  return `${start}-${start + 4}`;
}

const MONATE = ['J\u00e4n.', 'Feb.', 'M\u00e4r.', 'Apr.', 'Mai', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];

/** Format a single ISO date (YYYY, YYYY-MM-DD) to human-readable German. */
function humanDate(iso) {
  if (!iso) return '';
  if (/^\d{4}$/.test(iso)) return iso;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const [, y, mm, dd] = m;
  const day = parseInt(dd, 10);
  const mon = MONATE[parseInt(mm, 10) - 1];
  return `${day}.\u2009${mon} ${y}`;
}

/** Check if a date is the first day of a month. */
function isMonthStart(iso) { return /^\d{4}-\d{2}-01$/.test(iso); }

/** Check if a date is the last day of its month. */
function isMonthEnd(iso) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const lastDay = new Date(+m[1], +m[2], 0).getDate();
  return +m[3] === lastDay;
}

/** Format a date string for display (strip time artifacts, show range). */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  let s = String(dateStr);
  // Strip time portion (Excel artifacts like " 00:00:00")
  s = s.replace(/\s+\d{2}:\d{2}:\d{2}$/, '');
  // Single date
  if (!s.includes('/')) return humanDate(s.trim());
  // Range
  const [start, end] = s.split('/');
  const st = start.trim();
  const en = end.trim();
  const stM = st.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const enM = en.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!stM || !enM) return `${humanDate(st)} \u2013 ${humanDate(en)}`;
  const [, y1, m1, d1] = stM;
  const [, y2, m2, d2] = enM;
  // Full-year same year (1999-01-01/1999-12-31) → "1999"
  if (y1 === y2 && m1 === '01' && d1 === '01' && m2 === '12' && d2 === '31') return y1;
  // Multi-year full ranges (1950-01-01/1960-12-31) → "1950 – 1960"
  if (m1 === '01' && d1 === '01' && m2 === '12' && d2 === '31') return `${y1} \u2013 ${y2}`;
  // Full-month same month (1955-05-01/1955-05-31) → "Mai 1955"
  if (y1 === y2 && m1 === m2 && isMonthStart(st) && isMonthEnd(en)) return `${MONATE[+m1 - 1]} ${y1}`;
  // Same month+year (1958-04-06/1958-04-12) → "6. – 12. Apr. 1958"
  if (y1 === y2 && m1 === m2) return `${+d1}. \u2013 ${+d2}.\u2009${MONATE[+m1 - 1]} ${y1}`;
  // Full-month different months (1959-12-01/1961-02-28) → "Dez. 1959 – Feb. 1961"
  if (isMonthStart(st) && isMonthEnd(en)) return `${MONATE[+m1 - 1]} ${y1} \u2013 ${MONATE[+m2 - 1]} ${y2}`;
  // Fallback: full human dates
  return `${humanDate(st)} \u2013 ${humanDate(en)}`;
}
