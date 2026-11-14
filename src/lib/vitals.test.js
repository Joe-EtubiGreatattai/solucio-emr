import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assess, parseBp, bmiOf, suggestUrgent, impossible } from './vitals.js';

test('blood pressure is typed as one value', () => {
  assert.deepEqual(parseBp('120/80'), { sys: 120, dia: 80 });
  assert.deepEqual(parseBp(' 145 / 95 '), { sys: 145, dia: 95 });
  assert.equal(parseBp('120'), null);
  assert.equal(parseBp('abc'), null);
});

test('adult readings are graded normal, borderline or critical', () => {
  assert.equal(assess('spo2', 98, 30).level, 'normal');
  assert.equal(assess('spo2', 93, 30).level, 'borderline');
  assert.equal(assess('spo2', 89, 30).level, 'critical');
  assert.equal(assess('tempC', 38.2, 30).level, 'borderline');
  assert.equal(assess('tempC', 39.8, 30).level, 'critical');
  assert.equal(assess('pulse', 130, 30).level, 'critical');
  assert.equal(assess('bpSys', 185, 30).level, 'critical');
  assert.equal(assess('bpDia', 95, 30).level, 'borderline');
  assert.match(assess('spo2', 89, 30).message, /oxygen/i);
});

test('children are not judged on adult pulse and breathing ranges', () => {
  assert.equal(assess('pulse', 130, 4).level, 'unrated');
  assert.equal(assess('respRate', 30, 4).level, 'unrated');
  assert.equal(assess('spo2', 89, 4).level, 'critical', 'low oxygen is dangerous at any age');
});

test('BMI with its category', () => {
  assert.deepEqual(bmiOf(70, 170), { value: 24.2, label: 'Healthy weight' });
  assert.equal(bmiOf(95, 170).label, 'Obese');
  assert.equal(bmiOf('', 170), null);
});

test('a critical reading suggests urgent, with the reasons', () => {
  const s = suggestUrgent({ spo2: 89, tempC: 37 }, 40);
  assert.equal(s.urgent, true);
  assert.equal(s.reasons.length, 1);
  assert.equal(suggestUrgent({ spo2: 97, pulse: 80 }, 40).urgent, false);
});

test('readings that cannot be real are caught', () => {
  assert.ok(impossible('pulse', 900));
  assert.ok(impossible('tempC', 3.7));
  assert.ok(impossible('spo2', 101));
  assert.equal(impossible('pulse', 72), null);
});
