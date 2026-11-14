import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, HeartPulse, Loader2, ShieldCheck } from 'lucide-react';

const API_ORIGIN = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://solucio-website.techtree.lifestyle/emr-api' : '');
const API_BASE = `${API_ORIGIN.replace(/\/+$/, '')}/api/home-monitoring`;
const VITALS = {
  bloodPressure: [
    { key: 'bpSys', label: 'Systolic', unit: 'mmHg' },
    { key: 'bpDia', label: 'Diastolic', unit: 'mmHg' },
  ],
  pulse: [{ key: 'pulse', label: 'Pulse', unit: 'beats/min' }],
  temperature: [{ key: 'tempC', label: 'Temperature', unit: '°C' }],
  respiratoryRate: [{ key: 'respRate', label: 'Breathing rate', unit: 'breaths/min' }],
  oxygenSaturation: [{ key: 'spo2', label: 'Oxygen saturation', unit: '%' }],
  weight: [{ key: 'weightKg', label: 'Weight', unit: 'kg' }],
  height: [{ key: 'heightCm', label: 'Height', unit: 'cm' }],
};
const localDateTime = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    cache: 'no-store',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not reach the clinic. Please try again.');
  return data;
}

export default function HomeMonitoring({ token }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [values, setValues] = useState({});
  const [symptoms, setSymptoms] = useState([]);
  const [recordedAt, setRecordedAt] = useState(localDateTime);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let alive = true;
    request(`/public/${encodeURIComponent(token)}`)
      .then((data) => {
        if (!alive) return;
        setPlan(data);
        setSymptoms(data.symptomQuestions.map((question) => ({ question, answer: '' })));
      })
      .catch((e) => { if (alive) setLoadError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  const selectedFields = useMemo(() => (plan?.vitals || []).flatMap((type) => VITALS[type] || []), [plan]);
  const setSymptom = (index, answer) => setSymptoms((current) => current.map((item, i) => i === index ? { ...item, answer } : item));

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await request(`/public/${encodeURIComponent(token)}/entries`, {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          symptoms,
          recordedAt: new Date(recordedAt).toISOString(),
          consent,
        }),
      });
      setSubmitted(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function anotherCheckIn() {
    setValues({});
    setSymptoms(plan.symptomQuestions.map((question) => ({ question, answer: '' })));
    setRecordedAt(localDateTime());
    setConsent(false);
    setError('');
    setSubmitted(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-700 text-white"><HeartPulse size={22} aria-hidden="true" /></span>
          <span><span className="block font-bold tracking-tight text-slate-900">Solucio Hospital</span><span className="block text-xs text-slate-500">At-home health check-in</span></span>
        </header>

        {loading ? (
          <div className="card flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-700" aria-label="Loading monitoring plan" /></div>
        ) : loadError ? (
          <section className="card p-6 sm:p-8" role="alert">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><AlertTriangle /></span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">This check-in link is unavailable</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">It may have expired or been stopped by your care team. Please contact the clinic for help.</p>
          </section>
        ) : submitted ? (
          <section className="card p-6 text-center sm:p-10">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={28} /></span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Check-in received</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Your care team can review this entry in the EMR. If you need to add another reading, you can submit a new check-in.</p>
            <button type="button" onClick={anotherCheckIn} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800">Add another check-in</button>
          </section>
        ) : (
          <>
            <section className="card mb-5 overflow-hidden">
              <div className="bg-gradient-to-br from-brand-900 to-slate-800 px-5 py-6 text-white sm:px-7">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-100">Home monitoring</p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{plan.title}</h1>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-200"><Clock3 size={15} />{plan.frequency === 'twice_daily' ? 'Check in twice daily' : plan.frequency === 'weekly' ? 'Check in weekly' : 'Check in daily'}</p>
              </div>
              <div className="px-5 py-4 sm:px-7">
                {plan.instructions && <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{plan.instructions}</p>}
                <p className="mt-1 flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand-700" />Only the measurements and symptoms you submit are shared with your care team through this link.</p>
              </div>
            </section>

            <form onSubmit={submit} className="card space-y-6 p-5 sm:p-7">
              {selectedFields.length > 0 && (
                <fieldset>
                  <legend className="text-base font-bold text-slate-900">Measurements</legend>
                  <p className="mt-1 text-sm text-slate-500">Enter the readings you have. You can leave a measurement blank.</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {selectedFields.map((field) => (
                      <label key={field.key} className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-slate-700">{field.label} <span className="font-normal text-slate-500">({field.unit})</span></span>
                        <input className="input" type="number" inputMode="decimal" min="0" step="any" value={values[field.key] || ''} onChange={(e) => setValues((current) => ({ ...current, [field.key]: e.target.value }))} />
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <fieldset>
                <legend className="text-base font-bold text-slate-900">Symptoms</legend>
                <p className="mt-1 text-sm text-slate-500">Tell your care team how you have been feeling.</p>
                <div className="mt-4 space-y-4">
                  {symptoms.map((item, index) => (
                    <label key={item.question} className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{item.question}</span>
                      <textarea className="input min-h-24 resize-y" rows={3} maxLength={2000} value={item.answer} onChange={(e) => setSymptom(index, e.target.value)} placeholder="Describe what you have noticed" />
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">When did you take these readings?</span>
                <input className="input" type="datetime-local" required value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} />
              </label>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                This form is not monitored for emergencies. If symptoms are severe or getting worse, contact your clinic or local emergency service now.
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 text-sm leading-6 text-slate-700">
                <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-brand-700" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
                <span>I agree to share the health information I submit with my care team for this monitoring plan.</span>
              </label>

              {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
              <button type="submit" disabled={busy || !consent} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-5 font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? 'Sending check-in...' : 'Send check-in'}
              </button>
            </form>
          </>
        )}
        <p className="mt-5 text-center text-xs leading-5 text-slate-500">If this link was not sent to you by your care team, close this page and contact the clinic.</p>
      </div>
    </main>
  );
}
