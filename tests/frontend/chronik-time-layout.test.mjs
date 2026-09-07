import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCalendarLayout, dateExtent } from '../../docs/js/views/chronik-time-layout.js';

const day = value => Date.parse(`${value}T00:00:00Z`);
const entry = (id, raw) => ({ row: { id, key: raw }, extent: dateExtent(raw) });

test('date extents retain calendar precision, qualifiers and exclusive ends', () => {
  assert.deepEqual(dateExtent('1953'), { start: day('1953-01-01'), end: day('1954-01-01'),
    precision: 'year', qualifier: null, isRange: false });
  assert.equal(dateExtent('1952-02-29').end, day('1952-03-01'));
  assert.equal(dateExtent('1953-02-29'), null);
  assert.equal(dateExtent('1954/1953'), null);
  assert.equal(dateExtent('undated'), null);
});

test('empty centuries collapse without making a range end an active year', () => {
  const layout = buildCalendarLayout([entry('range', '1055/1952'), entry('late', '2009-06-01')]);
  assert.deepEqual(layout.groups.map(group => group.key), ['year-1055', 'year-2009']);
  assert.equal(layout.segments.filter(segment => segment.kind === 'gap').length, 1);
  assert.equal(layout.groups.some(group => group.year === 1952), false);
  assert.equal(layout.height, 556);
  assert.deepEqual([layout.years[0], layout.years.at(-1)], [1055, 2009]);
});

test('crowded day groups retain all identities without merging rows', () => {
  const crowded = Array.from({ length: 46 }, (_, index) => entry(`person-${index}`, '1953-07-26'));
  const layout = buildCalendarLayout([...crowded, entry('next', '1953-07-27')], { scale: 'month' });
  assert.equal(layout.groups[0].key, 'day-1953-07-26');
  assert.equal(layout.groups[0].label, '26. Juli 1953');
  assert.equal(layout.groups[0].rows.length, 46);
  assert.equal(new Set(layout.groups[0].rows).size, 46);
  assert.equal(layout.groups[1].start, layout.groups[0].end);
});

test('coarse precision remains context instead of becoming a false first day', () => {
  const yearly = entry('year', '1953'); const monthly = entry('month', '1953-07');
  const range = entry('range', '1953/1954'); const exact = entry('day', '1953-07-26');
  const months = buildCalendarLayout([yearly, monthly, range, exact], { scale: 'year' });
  assert.deepEqual(months.coarseRows.map(item => item.row.id), ['year', 'range']);
  assert.deepEqual(months.groups.map(group => group.key), ['month-1953-07']);
  const days = buildCalendarLayout([yearly, monthly, range, exact], { scale: 'month' });
  assert.deepEqual(days.coarseRows.map(item => item.row.id), ['year', 'month', 'range']);
  assert.deepEqual(days.groups.map(group => group.key), ['day-1953-07-26']);
  const contextOnly = buildCalendarLayout([yearly], { scale: 'year' });
  assert.equal(contextOnly.position(day('1953-07-01')) > 0, true);
  assert.equal(contextOnly.timeAt(contextOnly.height), day('1954-01-01'));
});

test('after qualifiers use the following calendar boundary as their sole group', () => {
  const layout = buildCalendarLayout([entry('after', 'nach:1956')]);
  assert.equal(layout.groups.length, 1);
  assert.equal(layout.groups[0].key, 'year-1957');
});

test('piecewise mapping is monotone, continuous and invertible', () => {
  const layout = buildCalendarLayout([entry('a', '1953-01-01'), entry('b', '1955-01-01')],
    { rowHeight: 200, gapHeight: 40 });
  const samples = ['1953-01-01', '1953-07-01', '1954-01-01', '1954-07-01', '1955-01-01'].map(day);
  const positions = samples.map(layout.position);
  assert.ok(positions.every((value, index) => index === 0 || value >= positions[index - 1]));
  for (const time of samples) assert.ok(Math.abs(layout.timeAt(layout.position(time)) - time) < 1);
  assert.equal(layout.position(day('1954-01-01')), 200);
});

test('expanded gaps keep stable keys and bounded calendar height', () => {
  const rows = [entry('a', '1900'), entry('b', '2000')];
  const compact = buildCalendarLayout(rows); const gap = compact.segments.find(item => item.kind === 'gap');
  const expanded = buildCalendarLayout(rows, { expandedGaps: new Set([gap.key]) });
  assert.equal(expanded.segments.find(item => item.kind === 'gap').height, 4000);
  assert.equal(expanded.groups.length, 2);
});

test('invalid rows remain available and extra years extend navigation', () => {
  const bad = { id: 'bad', key: '1953-13' };
  const layout = buildCalendarLayout([bad, entry('valid', '1953')], { extraYears: [1940, 1960] });
  assert.deepEqual(layout.invalid, [bad]);
  assert.deepEqual([layout.years[0], layout.years.at(-1)], [1940, 1960]);
  assert.equal(layout.groups.length, 1);
});
