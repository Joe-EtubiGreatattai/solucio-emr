// Lab result helpers: flags against normal ranges, and where a test is in its steps.

export function flagOf(field, value) {
  const n = Number(value);
  if (field.type !== 'number' || value === '' || value == null || !Number.isFinite(n)) return '';
  if (field.refLow != null && n < field.refLow) return 'low';
  if (field.refHigh != null && n > field.refHigh) return 'high';
  return 'normal';
}

export function rangeText(field) {
  if (field.type !== 'number') return '';
  const lo = field.refLow;
  const hi = field.refHigh;
  if (lo != null && hi != null) return `${lo} – ${hi}`;
  if (hi != null) return `up to ${hi}`;
  if (lo != null) return `${lo} or more`;
  return '';
}

export function abnormalSummary(fields, values) {
  return fields
    .map((f) => [f.name, flagOf(f, values[f.name])])
    .filter(([, flag]) => flag === 'low' || flag === 'high')
    .map(([name, flag]) => `${name} ${flag}`)
    .join(', ');
}

/** 0 = needs sample, 1 = needs results, 2 = needs checking, 3 = verified */
export const step = (status) => ({ requested: 0, collected: 1, resulted: 2, verified: 3 })[status] ?? 0;
