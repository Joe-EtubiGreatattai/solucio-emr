import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abnormalSummary, flagOf, rangeText, step } from './lab.js';

const hb = { name: 'Haemoglobin', type: 'number', unit: 'g/dL', refLow: 12, refHigh: 16 };

test('numeric results are flagged against the normal range', () => {
  assert.equal(flagOf(hb, '9'), 'low');
  assert.equal(flagOf(hb, '17.2'), 'high');
  assert.equal(flagOf(hb, '13'), 'normal');
  assert.equal(flagOf(hb, ''), '');
  assert.equal(flagOf({ name: 'MP', type: 'choice' }, '+'), '');
});

test('range text reads naturally', () => {
  assert.equal(rangeText(hb), '12 – 16');
  assert.equal(rangeText({ type: 'number', refHigh: 5.2 }), 'up to 5.2');
  assert.equal(rangeText({ type: 'number', refLow: 95 }), '95 or more');
  assert.equal(rangeText({ type: 'text' }), '');
});

test('abnormal summary lists what is out of range', () => {
  const fields = [hb, { name: 'WBC', type: 'number', refLow: 4, refHigh: 11 }, { name: 'Platelets', type: 'number', refLow: 150, refHigh: 400 }];
  assert.equal(abnormalSummary(fields, { Haemoglobin: '9', WBC: '20', Platelets: '250' }), 'Haemoglobin low, WBC high');
  assert.equal(abnormalSummary(fields, { Haemoglobin: '13' }), '');
});

test('each test status maps to a step', () => {
  assert.equal(step('requested'), 0);
  assert.equal(step('collected'), 1);
  assert.equal(step('resulted'), 2);
  assert.equal(step('verified'), 3);
});
