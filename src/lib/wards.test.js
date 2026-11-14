import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bedNumbers, daysIn, stayLabel } from './wards.js';

const NOW = new Date(2026, 10, 14, 10, 0); // local (hospital) time

test('days in hospital count calendar nights, starting at day 1', () => {
  assert.equal(daysIn(new Date(2026, 10, 14, 8, 0), NOW), 1);
  assert.equal(daysIn(new Date(2026, 10, 12, 23, 0), NOW), 3, 'admitted late on the 12th: day 3 on the 14th');
  assert.equal(stayLabel(new Date(2026, 10, 14, 8, 0), NOW), 'Day 1');
  assert.equal(stayLabel(new Date(2026, 10, 5, 8, 0), NOW), 'Day 10');
});

test('bed numbers for a range, padded, skipping ones that exist', () => {
  assert.deepEqual(bedNumbers('MED-', 1, 3, []), ['MED-01', 'MED-02', 'MED-03']);
  assert.deepEqual(bedNumbers('MED-', 1, 3, ['MED-02']), ['MED-01', 'MED-03']);
  assert.deepEqual(bedNumbers('ICU ', 9, 11, []), ['ICU 09', 'ICU 10', 'ICU 11']);
  assert.deepEqual(bedNumbers('B', 5, 2, []), [], 'from must not be after to');
  assert.equal(bedNumbers('B', 1, 80, []).length, 50, 'at most 50 at once');
});
