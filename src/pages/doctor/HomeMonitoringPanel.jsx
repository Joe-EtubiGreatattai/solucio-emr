import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Check, Copy, Link2, Plus, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import { dateTime } from '../../lib/format.js';
import { Badge, Button, Card, Confirm, ErrorNote, Field, Modal } from '../../components/ui.jsx';

const VITAL_OPTIONS = [
  ['bloodPressure', 'Blood pressure'], ['pulse', 'Pulse'], ['temperature', 'Temperature'],
  ['respiratoryRate', 'Breathing rate'], ['oxygenSaturation', 'Oxygen saturation'], ['weight', 'Weight'], ['height', 'Height'],
  ['urinationFrequency', 'Urination frequency'],
];
const VITAL_LABELS = Object.fromEntries(VITAL_OPTIONS);
const EMPTY_FORM = {
  title: 'Home monitoring', instructions: '', vitals: ['bloodPressure', 'pulse', 'temperature'],
  customMeasurements: '', symptomQuestions: '', frequency: 'daily', durationDays: 14,
};

function formatMeasurement(entry) {
  const pairs = [
    [['bpSys', 'bpDia'], (v) => `BP ${v.bpSys}/${v.bpDia} mmHg`],
    [['pulse'], (v) => `Pulse ${v.pulse} /min`], [['tempC'], (v) => `Temp ${v.tempC}°C`],
    [['respRate'], (v) => `Breathing ${v.respRate} /min`], [['spo2'], (v) => `SpO2 ${v.spo2}%`],
    [['weightKg'], (v) => `Weight ${v.weightKg} kg`], [['heightCm'], (v) => `Height ${v.heightCm} cm`],
    [['urineFreq'], (v) => `Urination ${v.urineFreq}/day`],
  ];
  const fixed = pairs.filter(([fields]) => fields.some((key) => entry[key] != null)).map(([, format]) => format(entry));
  const custom = (entry.custom || []).filter((c) => c.value).map((c) => `${c.name}: ${c.value}`);
  return [...fixed, ...custom];
}

function isPlanActive(plan) { return plan.status === 'active' && new Date(plan.endsAt) >= new Date(); }

export default function HomeMonitoringPanel({ patientId, homeMonitoring = { plans: [], entries: [] }, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [revokePlan, setRevokePlan] = useState(null);
  const [reviewBusy, setReviewBusy] = useState('');
  const entries = homeMonitoring.entries || [];
  const plans = homeMonitoring.plans || [];
  const needsReview = useMemo(() => entries.filter((entry) => !entry.reviewedAt).length, [entries]);

  const toggleVital = (vital) => setForm((current) => ({
    ...current, vitals: current.vitals.includes(vital) ? current.vitals.filter((value) => value !== vital) : [...current.vitals, vital],
  }));

  async function createPlan(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const symptomQuestions = form.symptomQuestions.split('\n').map((item) => item.trim()).filter(Boolean);
      const customMeasurements = form.customMeasurements.split('\n').map((item) => item.trim()).filter(Boolean);
      const data = await api(`/home-monitoring/patients/${patientId}/plans`, {
        method: 'POST',
        body: { ...form, symptomQuestions, customMeasurements, durationDays: Number(form.durationDays) },
      });
      setShareUrl(data.shareUrl);
      setForm(EMPTY_FORM);
      setOpen(false);
      toast.success('Home monitoring plan created');
      await onRefresh?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!revokePlan) return;
    try {
      await api(`/home-monitoring/plans/${revokePlan._id}/revoke`, { method: 'POST', body: {} });
      toast.success('Patient link stopped');
      setRevokePlan(null);
      await onRefresh?.();
    } catch (e) { toast.error(e.message); }
  }

  async function markReviewed(entry) {
    setReviewBusy(String(entry._id));
    try {
      await api(`/home-monitoring/entries/${entry._id}/review`, { method: 'POST', body: {} });
      await onRefresh?.();
    } catch (e) { toast.error(e.message); } finally { setReviewBusy(''); }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Patient link copied');
    } catch {
      toast.error('Select and copy the link manually');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">At-home check-ins</h2>
          <p className="mt-0.5 text-sm text-slate-500">Patient-entered symptoms and measurements, kept separate from staff-recorded vitals.</p>
        </div>
        <Button icon={Plus} onClick={() => { setError(''); setForm(EMPTY_FORM); setOpen(true); }}>New plan</Button>
      </div>

      {shareUrl && (
        <Card className="border-brand-200 bg-brand-50/40" bodyClass="p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-800"><Link2 size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">Share this patient link</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">The private link is shown only once. Send it directly to the patient, then keep it out of the chart notes.</p>
              <div className="mt-3 flex gap-2">
                <input className="input min-w-0 bg-white text-xs" readOnly aria-label="Patient monitoring link" value={shareUrl} onFocus={(e) => e.target.select()} />
                <Button variant="secondary" icon={Copy} onClick={copyLink}>Copy</Button>
              </div>
              <button type="button" className="mt-2 text-xs text-slate-500 underline underline-offset-2" onClick={() => setShareUrl('')}>Dismiss link from this screen</button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active plans</p><p className="mt-1 text-2xl font-bold text-slate-900">{plans.filter(isPlanActive).length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Check-ins</p><p className="mt-1 text-2xl font-bold text-slate-900">{entries.length}</p></div>
        <div className={`rounded-2xl border p-4 ${needsReview ? 'border-amber-200 bg-amber-50/70' : 'border-slate-200 bg-white'}`}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Needs review</p><p className="mt-1 text-2xl font-bold text-slate-900">{needsReview}</p></div>
      </div>

      <Card title="Monitoring plans" subtitle="Links can be stopped at any time by the care team." bodyClass="p-0">
        {!plans.length ? <div className="p-5 text-sm text-slate-500">No home monitoring plans yet. Create one to choose what the patient should record.</div> : (
          <ul className="divide-y divide-slate-100">
            {plans.map((plan) => (
              <li key={plan._id} className="flex flex-wrap items-start gap-3 p-4 sm:p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Activity size={19} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{plan.title}</p><Badge color={isPlanActive(plan) ? 'green' : plan.status === 'revoked' ? 'red' : 'slate'}>{isPlanActive(plan) ? 'Active' : plan.status === 'revoked' ? 'Stopped' : 'Ended'}</Badge></div>
                  <p className="mt-1 text-xs text-slate-500">{[...(plan.vitals || []).map((v) => VITAL_LABELS[v]).filter(Boolean), ...(plan.customMeasurements || [])].join(', ')} · {dateTime(plan.startsAt)} to {dateTime(plan.endsAt)}</p>
                  {plan.instructions && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{plan.instructions}</p>}
                </div>
                {isPlanActive(plan) && <Button size="sm" variant="danger-soft" icon={X} onClick={() => setRevokePlan(plan)}>Stop link</Button>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Patient check-ins" subtitle="Entries are self-reported and have not been clinically interpreted." bodyClass="p-0">
        {!entries.length ? <div className="p-5 text-sm text-slate-500">Patient submissions will appear here as they are received.</div> : (
          <ul className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const measurements = formatMeasurement(entry);
              return (
                <li key={entry._id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Activity size={17} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{dateTime(entry.recordedAt)}</p>
                        <Badge color="blue">Patient-entered</Badge>
                        {entry.reviewedAt ? <Badge color="green">Reviewed</Badge> : <Badge color="amber">New</Badge>}
                      </div>
                      {measurements.length > 0 && <p className="mt-2 text-sm leading-6 text-slate-700">{measurements.join(' · ')}</p>}
                      {(entry.symptoms || []).filter((item) => item.answer).map((item) => <p key={`${entry._id}-${item.question}`} className="mt-2 text-sm leading-6 text-slate-700"><span className="font-medium text-slate-500">{item.question}</span><br />{item.answer}</p>)}
                      {entry.reviewedAt && <p className="mt-2 text-xs text-slate-500">Reviewed {dateTime(entry.reviewedAt)}{entry.reviewedBy?.name ? ` by ${entry.reviewedBy.name}` : ''}</p>}
                    </div>
                    {!entry.reviewedAt && <Button size="sm" variant="secondary" icon={Check} loading={reviewBusy === String(entry._id)} onClick={() => markReviewed(entry)}>Mark reviewed</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> Patient-submitted readings are not a diagnosis and may not be reviewed immediately. Continue normal clinical follow-up and direct urgent concerns to emergency care.</div>

      <Modal open={open} onClose={() => setOpen(false)} title="Start home monitoring" size="lg" footer={
        <><Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button><Button type="submit" form="home-monitoring-form" loading={busy}>Create plan and link</Button></>
      }>
        <form id="home-monitoring-form" onSubmit={createPlan} className="space-y-4">
          <Field label="Plan name"><input className="input" required maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <fieldset>
            <legend className="label">Measurements for the patient to record</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {VITAL_OPTIONS.map(([value, label]) => (
                <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium ${form.vitals.includes(value) ? 'border-brand-300 bg-brand-50 text-brand-900' : 'border-slate-200 bg-white text-slate-700'}`}>
                  <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={form.vitals.includes(value)} onChange={() => toggleVital(value)} />{label}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Other measurements to record" hint="One per line, e.g. Blood sugar (mmol/L) or Peak flow. Up to 6."><textarea className="input" rows={2} value={form.customMeasurements} onChange={(e) => setForm({ ...form, customMeasurements: e.target.value })} placeholder={'For example:\nBlood sugar (mmol/L)\nPeak flow (L/min)'} /></Field>
          <Field label="Specific symptom questions" hint="One question per line. The patient will also have a general symptom field."><textarea className="input" rows={3} maxLength={1500} value={form.symptomQuestions} onChange={(e) => setForm({ ...form, symptomQuestions: e.target.value })} placeholder={'For example:\nHave you felt short of breath today?\nHas the swelling changed?'} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Check-in schedule"><select className="input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}><option value="daily">Daily</option><option value="twice_daily">Twice daily</option><option value="weekly">Weekly</option></select></Field>
            <Field label="Plan duration"><select className="input" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option><option value="60">60 days</option></select></Field>
          </div>
          <Field label="Instructions for the patient" hint="Avoid including information that should not appear in a patient-facing message."><textarea className="input" rows={3} maxLength={1000} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Add any instructions for taking and submitting their readings." /></Field>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-950">The link lets the patient submit entries only. It does not show the patient record. Share it directly with the patient and stop the plan when monitoring ends.</div>
          <ErrorNote>{error}</ErrorNote>
        </form>
      </Modal>

      <Confirm open={Boolean(revokePlan)} title="Stop this patient link?" tone="danger" icon={ShieldCheck} confirmLabel="Stop link" onClose={() => setRevokePlan(null)} onConfirm={revoke}>
        The patient will no longer be able to submit check-ins through this plan link. Previously submitted entries remain in the chart.
      </Confirm>
    </div>
  );
}
