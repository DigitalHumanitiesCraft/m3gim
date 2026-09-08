/** Conservative summaries of source dates shown inside calendar groups. */
import { dateExtent } from './chronik-time-layout.js';

const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function specialKind(row) {
  const raw = String(row?.key ?? '');
  if (row?.precision?.includes('malformed')) return 'unclear';
  if (raw.startsWith('circa:')) return 'circa';
  if (raw.startsWith('vor:')) return 'before';
  if (raw.startsWith('nach:')) return 'after';
  if (/^(ab|seit)(?::|\s+)/i.test(raw)) return 'openStart';
  if (row?.precision?.includes('range') || raw.includes('/')) return 'range';
  if (row?.precision === 'year') return 'year';
  return 'unclear';
}

function calendarSpan(entries) {
  const sorted = entries.map(item => ({ item, extent: dateExtent(item.row.key) }))
    .filter(item => item.extent).sort((a, b) => a.extent.start - b.extent.start);
  if (!sorted.length) return '';
  const first = new Date(sorted[0].extent.start);
  const last = new Date(sorted.at(-1).extent.start);
  const firstMonth = MONTHS[first.getUTCMonth()];
  const lastMonth = MONTHS[last.getUTCMonth()];
  if (first.getUTCFullYear() === last.getUTCFullYear()) {
    return first.getUTCMonth() === last.getUTCMonth()
      ? `${firstMonth} ${first.getUTCFullYear()}`
      : `${firstMonth}–${lastMonth} ${first.getUTCFullYear()}`;
  }
  return `${firstMonth} ${first.getUTCFullYear()}–${lastMonth} ${last.getUTCFullYear()}`;
}

function specialLabels(counts) {
  const labels = [];
  if (counts.range) labels.push(plural(counts.range, 'Zeitraum', 'Zeiträume'));
  if (counts.circa) labels.push(plural(counts.circa, 'ca.-Angabe', 'ca.-Angaben'));
  if (counts.before) labels.push(plural(counts.before, 'Vorher-Angabe', 'Vorher-Angaben'));
  if (counts.after) labels.push(plural(counts.after, 'Nachher-Angabe', 'Nachher-Angaben'));
  if (counts.openStart) labels.push(plural(counts.openStart,
    'offene Beginnangabe', 'offene Beginnangaben'));
  if (counts.year) labels.push(plural(counts.year, 'reine Jahresangabe', 'reine Jahresangaben'));
  if (counts.unclear) labels.push(plural(counts.unclear, 'unklare Datierung', 'unklare Datierungen'));
  return labels;
}

/** Summarize distinct recorded date values without turning uncertainty into precision. */
export function summarizeSourceDates(contexts) {
  const distinct = new Map();
  for (const context of contexts || []) {
    const row = context?.row;
    if (!row) continue;
    const identity = row.key == null ? `label:${row.dateLabel ?? ''}` : `key:${row.key}`;
    if (!distinct.has(identity)) distinct.set(identity, context);
  }
  const values = [...distinct.values()];
  if (!values.length) return '';
  if (values.length <= 2) return values.map(({ row }) => row.dateLabel ?? String(row.key ?? '')).join(' · ');

  const precise = [];
  const counts = { range: 0, circa: 0, before: 0, after: 0, openStart: 0,
    year: 0, unclear: 0 };
  for (const context of values) {
    const precision = context.row.precision;
    if (precision === 'day' || precision === 'month') precise.push(context);
    else counts[specialKind(context.row)]++;
  }
  const parts = [plural(values.length, 'Datierung', 'Datierungen')];
  const span = calendarSpan(precise);
  if (span) parts.push(span);
  parts.push(...specialLabels(counts));
  return parts.join(' · ');
}
