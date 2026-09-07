import test from 'node:test';
import assert from 'node:assert/strict';

import { dateExtent, layoutEntries, ticksForWindow } from '../../docs/js/views/chronik-time-layout.js';

const day = value => Date.parse(`${value}T00:00:00Z`);

test('date precision produces exclusive calendar extents', () => {
  assert.deepEqual(dateExtent('1953'), {
    start: day('1953-01-01'), end: day('1954-01-01'), precision: 'year', qualifier: null, isRange: false,
  });
  assert.deepEqual(dateExtent('1953-02'), {
    start: day('1953-02-01'), end: day('1953-03-01'), precision: 'month', qualifier: null, isRange: false,
  });
  assert.equal(dateExtent('1952-02-29').end, day('1952-03-01'));
  assert.equal(dateExtent('1953-02-29'), null);
});

test('ranges include the complete last value and preserve uncertainty', () => {
  const twoYears = dateExtent('circa:1951/1952');
  assert.deepEqual(twoYears, {
    start: day('1951-01-01'), end: day('1953-01-01'), precision: 'range', qualifier: 'circa', isRange: true,
  });
  assert.ok(twoYears.end - twoYears.start > dateExtent('1951').end - dateExtent('1951').start);
  assert.equal(dateExtent('vor:1953').qualifier, 'vor');
  assert.equal(dateExtent('nach:1953-04').qualifier, 'nach');
  assert.equal(dateExtent('1953/'), null);
  assert.equal(dateExtent('1954/1953'), null);
  assert.equal(dateExtent('1953-13'), null);
  assert.equal(dateExtent('undated'), null);
});

test('layout includes intersecting ranges and excludes exact outer boundaries', () => {
  const start = day('1950-01-01');
  const end = day('1952-01-01');
  const rows = [
    { id: 'overlap-left', raw: '1949/1950' },
    { id: 'inside', raw: '1951-06-01' },
    { id: 'ends-at-start', raw: '1949' },
    { id: 'starts-at-end', raw: '1952' },
  ];
  const groups = layoutEntries(rows.map(row => ({ row, extent: dateExtent(row.raw) })),
    { start, end, height: 1000, bucketHeight: 120 });
  assert.deepEqual(groups.flatMap(group => group.rows).map(row => row.id), ['overlap-left', 'inside']);
  assert.equal(groups[0].y, 0);
  assert.equal(groups[0].labelY, 0);
});

test('dense buckets retain every original row and stable cell geometry', () => {
  const start = day('1953-01-01');
  const end = day('1954-01-01');
  const rows = Array.from({ length: 40 }, (_, index) => ({ id: index, raw: `1953-07-${String(index % 20 + 1).padStart(2, '0')}` }));
  const groups = layoutEntries(rows.map(row => ({ row, extent: dateExtent(row.raw) })),
    { start, end, height: 600, bucketHeight: 156 });
  assert.equal(groups.flatMap(group => group.rows).length, rows.length);
  assert.ok(groups.length < rows.length);
  assert.ok(groups.every(group => group.labelY % 156 === 0 && group.y >= group.labelY));
  assert.equal(new Set(groups.map(group => group.key)).size, groups.length);
});

test('ticks adapt from years to months and days and remain positive', () => {
  const years = ticksForWindow(day('1055-01-01'), day('2009-01-01'), 900);
  assert.ok(years.length >= 5 && years.length <= 20);
  assert.ok(years.every(tick => /^\d+$/.test(tick.label) && tick.major));
  const months = ticksForWindow(day('1953-01-01'), day('1953-07-01'), 700);
  assert.ok(months.length >= 4 && months.some(tick => tick.label.includes('1953')));
  const days = ticksForWindow(day('1952-02-25'), day('1952-03-05'), 700);
  assert.ok(days.some(tick => tick.label === '29. Februar'));
  assert.ok([...years, ...months, ...days].every(tick => new Date(tick.time).getUTCFullYear() > 0));
});
