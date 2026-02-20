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

/** Format a date string for display (strip time artifacts, show range). */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  let s = String(dateStr);
  // Strip time portion (Excel artifacts like " 00:00:00")
  s = s.replace(/\s+\d{2}:\d{2}:\d{2}$/, '');
  // For ranges, format nicely
  if (s.includes('/')) {
    const [start, end] = s.split('/');
    const y1 = extractYear(start);
    const y2 = extractYear(end);
    if (y1 && y2 && y1 === y2) {
      return start.trim();
    }
    return `${start.trim()} – ${end.trim()}`;
  }
  return s.trim();
}
