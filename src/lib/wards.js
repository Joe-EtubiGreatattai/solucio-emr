// Small helpers for the wards and beds screen.

/** Day 1 is the day of admission (calendar days, local time). */
export function daysIn(admittedAt, now = new Date()) {
  const a = new Date(admittedAt);
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(1, Math.round((today - start) / 86400000) + 1);
}
export const stayLabel = (admittedAt, now) => `Day ${daysIn(admittedAt, now)}`;

/** "MED-01" … for a range; skips numbers already used; at most 50 at once. */
export function bedNumbers(prefix, from, to, existing) {
  const f = Number(from);
  const t = Number(to);
  if (!Number.isInteger(f) || !Number.isInteger(t) || f < 0 || t < f) return [];
  const width = Math.max(2, String(t).length);
  const taken = new Set(existing.map((b) => b.toUpperCase()));
  const out = [];
  for (let n = f; n <= t && out.length < 50; n++) {
    const name = `${prefix}${String(n).padStart(width, '0')}`;
    if (!taken.has(name.toUpperCase())) out.push(name);
  }
  return out;
}
