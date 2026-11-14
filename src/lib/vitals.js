// Vital-sign ranges for triage. Adult ranges; children (under 16) are only flagged for oxygen and temperature,
// because normal pulse, breathing and BP differ by age.

export const VITALS = {
  bpSys:    { label: 'Systolic', unit: 'mmHg', normal: [90, 139], borderline: [80, 179], scale: [60, 220], adultOnly: true, low: 'Blood pressure is low', high: 'Blood pressure is high' },
  bpDia:    { label: 'Diastolic', unit: 'mmHg', normal: [60, 89], borderline: [50, 109], scale: [30, 140], adultOnly: true, low: 'Diastolic pressure is low', high: 'Diastolic pressure is high' },
  pulse:    { label: 'Pulse', unit: '/min', normal: [60, 100], borderline: [50, 120], scale: [30, 180], adultOnly: true, low: 'Pulse is slow', high: 'Pulse is fast' },
  tempC:    { label: 'Temperature', unit: '°C', normal: [36.1, 37.5], borderline: [35, 39.4], scale: [33, 42], adultOnly: false, low: 'Temperature is low', high: 'Fever' },
  respRate: { label: 'Breathing', unit: '/min', normal: [12, 20], borderline: [9, 24], scale: [4, 40], adultOnly: true, low: 'Breathing is slow', high: 'Breathing is fast' },
  spo2:     { label: 'Oxygen (SpO₂)', unit: '%', normal: [95, 100], borderline: [92, 100], scale: [80, 100], adultOnly: false, low: 'Oxygen is low', high: '' },
};

// Values outside these can't be real readings (usually a typo, e.g. 3.7 for 37 °C)
const POSSIBLE = { bpSys: [40, 300], bpDia: [20, 200], pulse: [20, 250], tempC: [25, 45], respRate: [2, 80], spo2: [40, 100], weightKg: [0.5, 350], heightCm: [30, 250] };

export function impossible(key, value) {
  const r = POSSIBLE[key];
  const n = Number(value);
  if (!r || value === '' || value == null || !Number.isFinite(n)) return null;
  return n < r[0] || n > r[1] ? `That doesn’t look like a real reading. Check it (expected ${r[0]}–${r[1]}).` : null;
}

/** { level: 'normal' | 'borderline' | 'critical' | 'unrated' | 'empty', message } */
export function assess(key, value, ageYears) {
  const v = VITALS[key];
  const n = Number(value);
  if (value === '' || value == null || !Number.isFinite(n)) return { level: 'empty', message: '' };
  if (!v || impossible(key, n)) return { level: 'unrated', message: '' };
  if (v.adultOnly && ageYears != null && ageYears < 16) return { level: 'unrated', message: 'Child: use paediatric ranges' };
  const [nl, nh] = v.normal;
  const [bl, bh] = v.borderline;
  if (n >= nl && n <= nh) return { level: 'normal', message: '' };
  const low = n < nl;
  const level = n >= bl && n <= bh ? 'borderline' : 'critical';
  return { level, message: `${low ? v.low : v.high} (${n} ${v.unit})` };
}

export function parseBp(text) {
  const m = String(text ?? '').match(/^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/);
  return m ? { sys: Number(m[1]), dia: Number(m[2]) } : null;
}

export function bmiOf(weightKg, heightCm) {
  const w = Number(weightKg);
  const h = Number(heightCm);
  if (!(w > 0) || !(h > 0) || weightKg === '' || heightCm === '') return null;
  const value = Math.round((w / (h / 100) ** 2) * 10) / 10;
  const label = value < 18.5 ? 'Underweight' : value < 25 ? 'Healthy weight' : value < 30 ? 'Overweight' : 'Obese';
  return { value, label };
}

/** Any critical reading → suggest urgent, listing why. */
export function suggestUrgent(values, ageYears) {
  const reasons = Object.keys(VITALS)
    .map((k) => assess(k, values[k], ageYears))
    .filter((a) => a.level === 'critical')
    .map((a) => a.message);
  return { urgent: reasons.length > 0, reasons };
}

/** Where a value sits on its tile's bar, 0–100. */
export function position(key, value) {
  const [lo, hi] = VITALS[key].scale;
  return Math.max(0, Math.min(100, ((Number(value) - lo) / (hi - lo)) * 100));
}

export const ageInYears = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) y -= 1;
  return y;
};
