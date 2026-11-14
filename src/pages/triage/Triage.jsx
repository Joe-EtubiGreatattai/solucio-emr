import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, HeartPulse, Search, Send, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { age, date, fullName, minutes } from '../../lib/format';
import { ageInYears, assess, bmiOf, impossible, parseBp, position, suggestUrgent, VITALS } from '../../lib/vitals';
import { Avatar, Badge, Button, ErrorNote, Skeleton } from '../../components/ui';

const LEVEL = {
  normal: { text: 'text-emerald-700', dot: 'bg-emerald-500', tile: 'border-slate-200 bg-white', word: 'Normal' },
  borderline: { text: 'text-amber-700', dot: 'bg-amber-500', tile: 'border-amber-300 bg-amber-50/60', word: 'Check' },
  critical: { text: 'text-rose-700', dot: 'bg-rose-600', tile: 'border-rose-300 bg-rose-50/70', word: 'Danger' },
  invalid: { text: 'text-amber-700', dot: 'bg-amber-500', tile: 'border-amber-400 bg-amber-50', word: 'Check reading' },
  unrated: { text: 'text-slate-500', dot: 'bg-slate-400', tile: 'border-slate-200 bg-white', word: '' },
  empty: { text: 'text-slate-400', dot: 'bg-slate-300', tile: 'border-slate-200 bg-white', word: '' },
};
const worst = (...levels) => ['critical', 'borderline', 'normal', 'unrated', 'empty'].find((l) => levels.includes(l)) || 'empty';
const blank = { bp: '', pulse: '', tempC: '', respRate: '', spo2: '', weightKg: '', heightCm: '', notes: '' };

export default function Triage() {
  const { data: queue, loading, reload } = useFetch('/queues/triage', { initial: [] });
  const { data: clinics } = useFetch('/clinics', { initial: [] });
  useLive(['queue'], useCallback(() => reload(), [reload]));
  const [current, setCurrent] = useState(null);
  const [sent, setSent] = useState(null);

  const open = (e) => {
    setSent(null);
    setCurrent(e);
    if (e.status === 'waiting') api(`/queues/${e._id}/start`, { method: 'POST' }).catch(() => {});
  };
  const next = queue.find((e) => e.status === 'waiting' && e._id !== current?._id);
  const clinicName = (id) => clinics.find((c) => c._id === id)?.name || 'the doctor';

  return (
    <div className="grid gap-4 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start">
      <aside className={`${current || sent ? 'hidden lg:block' : ''} lg:sticky lg:top-4`}>
        <QueuePanel queue={queue} loading={loading} currentId={current?._id} onOpen={open} />
      </aside>

      <section className={current || sent ? '' : 'hidden lg:block'}>
        {current ? (
          <TriageForm
            key={current._id}
            entry={current}
            clinicName={clinicName(current.visit?.clinic)}
            onBack={() => setCurrent(null)}
            onSent={(name) => { setSent({ name, clinic: clinicName(current.visit?.clinic) }); setCurrent(null); reload(); }}
          />
        ) : (
          <Idle sent={sent} next={next} onStart={() => next && open(next)} onBack={() => setSent(null)} />
        )}
      </section>
    </div>
  );
}

function QueuePanel({ queue, loading, currentId, onOpen }) {
  const [query, setQuery] = useState('');
  const waiting = queue.filter((e) => e.status === 'waiting');
  const urgent = waiting.filter((e) => e.priority === 1).length;
  const longest = waiting.reduce((m, e) => Math.max(m, e.waitingMinutes || 0), 0);
  const q = query.trim().toLowerCase();
  const shown = queue.filter((e) => !q || `${fullName(e.patient)} ${e.patient?.patientNo || ''} ${e.visit?.complaint || ''}`.toLowerCase().includes(q));
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-4">
        <h1 className="text-xl font-semibold text-slate-900">Triage</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {waiting.length ? <>{waiting.length} waiting{urgent > 0 && <>, <span className="font-semibold text-rose-700">{urgent} urgent</span></>} · longest wait {minutes(longest)}</> : queue.length ? 'Nobody else waiting' : 'Nobody waiting'}
        </p>
        {queue.length > 0 && (
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input !py-2 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient or number" aria-label="Search the triage queue" />
          </div>
        )}
      </div>
      {loading ? (
        <div className="space-y-2 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : !queue.length ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500">New patients appear here as reception checks them in.</p>
      ) : !shown.length ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500">No patients match your search.</p>
      ) : (
        <ul className="max-h-[calc(100vh-14rem)] divide-y divide-slate-100 overflow-y-auto">
          {shown.map((e) => {
            const active = e._id === currentId;
            const wait = e.waitingMinutes || 0;
            return (
              <li key={e._id}>
                <button type="button" onClick={() => onOpen(e)} aria-current={active ? 'true' : undefined}
                  className={`relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${active ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                  {active && <span className="absolute inset-y-0 left-0 w-1 bg-brand-600" />}
                  {e.priority === 1 && !active && <span className="absolute inset-y-0 left-0 w-1 bg-rose-500" />}
                  <Avatar name={fullName(e.patient)} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold text-slate-900">{fullName(e.patient)}</span>
                      {e.priority === 1 && <Badge color="red">Urgent</Badge>}
                    </span>
                    <span className="block truncate text-sm text-slate-500">
                      {e.patient?.sex === 'male' ? 'M' : 'F'}{e.patient?.dob ? `, ${age(e.patient.dob)}` : ''}{e.visit?.complaint ? ` · ${e.visit.complaint}` : ''}
                    </span>
                  </span>
                  <span className={`flex shrink-0 items-center gap-1 text-xs font-medium ${e.status === 'in_progress' ? 'text-brand-700' : wait >= 60 ? 'text-rose-700' : wait >= 30 ? 'text-amber-700' : 'text-slate-500'}`}>
                    {e.status === 'in_progress' ? 'Being seen' : <><Clock className="h-3.5 w-3.5" />{minutes(wait)}</>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Idle({ sent, next, onStart, onBack }) {
  return (
    <div className="card flex min-h-[26rem] flex-col items-center justify-center gap-3 p-8 text-center">
      <button type="button" onClick={onBack} className="mb-2 inline-flex items-center gap-1 self-start text-sm text-slate-500 hover:text-slate-800 lg:hidden"><ArrowLeft className="h-4 w-4" /> Queue</button>
      {sent ? (
        <>
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          <p className="text-lg font-semibold text-slate-900">{sent.name} is in the queue for {sent.clinic}</p>
        </>
      ) : (
        <>
          <HeartPulse className="h-10 w-10 text-brand-600" />
          <p className="text-lg font-semibold text-slate-900">Pick a patient to start triage</p>
          <p className="max-w-sm text-sm text-slate-500">Urgent patients are marked in red. The queue updates by itself.</p>
        </>
      )}
      {next && <Button className="mt-2" size="lg" onClick={onStart}>Start next patient: {fullName(next.patient)}</Button>}
    </div>
  );
}

function TriageForm({ entry, clinicName, onBack, onSent }) {
  const patient = entry.patient;
  const years = ageInYears(patient?.dob);
  const [form, setForm] = useState(blank);
  const [priority, setPriority] = useState(entry.visit?.priority || 2);
  const [touchedPriority, setTouchedPriority] = useState(false);
  const [last, setLast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Previous visit's vitals, for comparison
  useEffect(() => {
    api(`/patients/${patient._id}/chart`).then((c) => {
      const prev = c.visits.filter((v) => v._id !== entry.visit._id && v.vitals.length).at(0);
      if (prev) setLast({ at: prev.createdAt, v: prev.vitals.at(-1) });
    }).catch(() => {});
  }, [patient._id, entry.visit._id]);

  const bp = parseBp(form.bp);
  const values = { bpSys: bp?.sys, bpDia: bp?.dia, pulse: form.pulse, tempC: form.tempC, respRate: form.respRate, spo2: form.spo2 };
  const bmi = bmiOf(form.weightKg, form.heightCm);
  const suggestion = useMemo(() => suggestUrgent(values, years), [form.bp, form.pulse, form.tempC, form.respRate, form.spo2, years]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (suggestion.urgent && !touchedPriority) setPriority(1); }, [suggestion.urgent, touchedPriority]);

  const problems = [
    form.bp && !bp ? 'Write blood pressure as two numbers, like 120/80.' : null,
    ...Object.entries({ ...values, weightKg: form.weightKg, heightCm: form.heightCm }).map(([k, v]) => {
      const msg = impossible(k, v);
      return msg ? `${VITALS[k]?.label || (k === 'weightKg' ? 'Weight' : 'Height')}: ${msg}` : null;
    }),
  ].filter(Boolean);
  const warnings = Object.keys(VITALS).map((k) => assess(k, values[k], years)).filter((a) => ['critical', 'borderline'].includes(a.level));

  async function send(ev) {
    ev.preventDefault();
    if (problems.length) { setError(problems[0]); return; }
    setBusy(true);
    setError('');
    try {
      await api(`/visits/${entry.visit._id}/vitals`, {
        method: 'POST',
        body: { bpSys: bp?.sys ?? '', bpDia: bp?.dia ?? '', pulse: form.pulse, tempC: form.tempC, respRate: form.respRate, spo2: form.spo2, weightKg: form.weightKg, heightCm: form.heightCm, notes: form.notes, priority },
      });
      toast.success(`Sent to ${clinicName}`);
      onSent(fullName(patient));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={send} className="card overflow-hidden">
      <header className="flex flex-wrap items-center gap-4 border-b border-slate-100 p-4 sm:p-5">
        <button type="button" onClick={onBack} aria-label="Back to queue" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 lg:hidden"><ArrowLeft className="h-5 w-5" /></button>
        <Avatar name={fullName(patient)} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-semibold text-slate-900">{fullName(patient)}</h2>
          <p className="text-sm text-slate-500">
            {patient.sex === 'male' ? 'Male' : 'Female'}{patient.dob ? `, ${age(patient.dob)}` : ', age not recorded'} · {patient.patientNo} · going to {clinicName}
          </p>
        </div>
        {entry.visit?.complaint && (
          <p className="w-full rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 sm:w-auto sm:max-w-xs">
            <span className="text-slate-500">Reason for visit: </span>{entry.visit.complaint}
          </p>
        )}
        {patient.allergies?.length > 0 && (
          <p className="flex w-full items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
            <AlertTriangle className="h-4 w-4 shrink-0" /> Allergic to {patient.allergies.join(', ')}
          </p>
        )}
      </header>

      <div className="space-y-6 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <BpTile value={form.bp} onChange={set('bp')} bp={bp} years={years} last={last?.v} />
          <VitalTile k="pulse" value={form.pulse} onChange={set('pulse')} years={years} last={last?.v?.pulse} />
          <VitalTile k="tempC" value={form.tempC} onChange={set('tempC')} years={years} last={last?.v?.tempC} step="0.1" />
          <VitalTile k="spo2" value={form.spo2} onChange={set('spo2')} years={years} last={last?.v?.spo2} />
          <VitalTile k="respRate" value={form.respRate} onChange={set('respRate')} years={years} last={last?.v?.respRate} />
          <BodyTile form={form} set={set} bmi={bmi} last={last?.v} />
        </div>
        {last && <p className="-mt-3 text-xs text-slate-500">Grey figures are from the last visit on {date(last.at)}.</p>}

        {warnings.length > 0 && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4" role="status">
            <p className="flex items-center gap-2 text-sm font-semibold text-rose-800"><AlertTriangle className="h-4 w-4" /> Readings to act on</p>
            <ul className="mt-1.5 space-y-0.5 text-sm text-rose-900">
              {warnings.map((w) => <li key={w.message}>{w.level === 'critical' ? 'Danger: ' : 'Check: '}{w.message}</li>)}
            </ul>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-slate-800">How urgent</legend>
            <div className="grid grid-cols-3 gap-2">
              {[[1, 'Urgent', 'border-rose-400 bg-rose-600 text-white'], [2, 'Normal', 'border-brand-600 bg-brand-700 text-white'], [3, 'Routine', 'border-slate-500 bg-slate-600 text-white']].map(([v, l, on]) => (
                <label key={v} className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition-colors ${priority === v ? on : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                  <input type="radio" name="priority" className="sr-only" checked={priority === v} onChange={() => { setPriority(v); setTouchedPriority(true); }} />{l}
                </label>
              ))}
            </div>
            {suggestion.urgent && (
              <p className={`mt-2 text-xs ${priority === 1 ? 'text-rose-700' : 'font-semibold text-rose-700'}`}>
                {priority === 1 ? 'Set to urgent because of the readings above.' : 'The readings suggest this patient is urgent.'}
              </p>
            )}
          </fieldset>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">Notes for the doctor</span>
            <textarea className="input" rows={3} value={form.notes} onChange={set('notes')} placeholder="What the patient says is wrong, how long, anything you noticed" />
          </label>
        </div>
        <ErrorNote>{error}</ErrorNote>
      </div>

      <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
        <p className="text-sm text-slate-500"><Stethoscope className="mr-1 inline h-4 w-4" />Next: {clinicName}</p>
        <Button type="submit" size="lg" icon={Send} loading={busy} className={priority === 1 ? '!bg-rose-600 hover:!bg-rose-700' : ''}>
          {priority === 1 ? 'Send to doctor as urgent' : 'Send to doctor'}
        </Button>
      </footer>
    </form>
  );
}

function RangeBar({ k, value, level }) {
  const v = VITALS[k];
  const [lo, hi] = v.scale;
  const band = { left: `${((v.normal[0] - lo) / (hi - lo)) * 100}%`, width: `${((Math.min(v.normal[1], hi) - v.normal[0]) / (hi - lo)) * 100}%` };
  const has = value !== '' && value != null && Number.isFinite(Number(value));
  return (
    <div className="relative mt-3 h-1.5 rounded-full bg-slate-100" aria-hidden="true">
      <div className="absolute inset-y-0 rounded-full bg-emerald-200" style={band} />
      {has && <div className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white transition-[left] duration-200 ${LEVEL[level].dot}`} style={{ left: `${position(k, value)}%` }} />}
    </div>
  );
}

function TileShell({ label, unit, level, note, children, last, bar }) {
  const L = LEVEL[level];
  return (
    <div className={`rounded-2xl border p-4 transition-colors ${L.tile}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        {L.word && <span className={`text-xs font-semibold ${L.text}`}>{L.word}</span>}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        {children}
        <span className="text-sm text-slate-500">{unit}</span>
      </div>
      {bar}
      {last != null && last !== '' && <p className="mt-1 text-xs text-slate-400">Last: {last}</p>}
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

const bigInput = 'money w-full min-w-0 bg-transparent text-3xl font-semibold text-slate-900 outline-none placeholder:text-slate-300 focus-visible:outline-none';

function VitalTile({ k, value, onChange, years, last, step = '1' }) {
  const v = VITALS[k];
  const a = assess(k, value, years);
  const bad = impossible(k, value);
  const level = bad ? 'invalid' : a.level;
  return (
    <TileShell label={v.label} unit={v.unit} level={level} last={last}
      note={bad ? `Not a real ${v.label.toLowerCase()}: did you mean something else?` : a.level === 'unrated' ? a.message : ''}
      bar={<RangeBar k={k} value={bad ? '' : value} level={level} />}>
      <input aria-label={`${v.label} (${v.unit})`} aria-describedby={`${k}-status`} className={bigInput} type="number" inputMode="decimal" step={step} min="0" placeholder="—" value={value} onChange={onChange} />
      <span id={`${k}-status`} className="sr-only">{a.message || LEVEL[level].word}</span>
    </TileShell>
  );
}

function BpTile({ value, onChange, bp, years, last }) {
  const s = assess('bpSys', bp?.sys, years);
  const d = assess('bpDia', bp?.dia, years);
  const level = value && !bp ? 'invalid' : worst(s.level, d.level);
  return (
    <div>
      <TileShell label="Blood pressure" unit="mmHg" level={level} note={value && !bp ? 'Type it like 120/80' : s.level === 'unrated' ? s.message : ''} last={last?.bpSys ? `${last.bpSys}/${last.bpDia ?? '?'}` : null}
        bar={<RangeBar k="bpSys" value={bp?.sys ?? ''} level={level} />}>
        <input aria-label="Blood pressure, systolic over diastolic" autoFocus className={bigInput} inputMode="numeric" placeholder="120/80" value={value} onChange={onChange} />
      </TileShell>
    </div>
  );
}

function BodyTile({ form, set, bmi, last }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <span className="text-sm font-medium text-slate-600">Weight and height</span>
      <div className="mt-1 grid grid-cols-2 gap-3">
        <label className="flex items-baseline gap-1.5">
          <input aria-label="Weight (kg)" className="money w-full min-w-0 bg-transparent text-2xl font-semibold text-slate-900 outline-none placeholder:text-slate-300" type="number" inputMode="decimal" step="0.1" min="0" placeholder="—" value={form.weightKg} onChange={set('weightKg')} />
          <span className="text-sm text-slate-500">kg</span>
        </label>
        <label className="flex items-baseline gap-1.5">
          <input aria-label="Height (cm)" className="money w-full min-w-0 bg-transparent text-2xl font-semibold text-slate-900 outline-none placeholder:text-slate-300" type="number" inputMode="decimal" step="0.1" min="0" placeholder="—" value={form.heightCm} onChange={set('heightCm')} />
          <span className="text-sm text-slate-500">cm</span>
        </label>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        {bmi ? <>BMI <b className="money text-slate-900">{bmi.value}</b> · {bmi.label}</> : last?.weightKg ? <span className="text-xs text-slate-400">Last: {last.weightKg} kg{last.heightCm ? `, ${last.heightCm} cm` : ''}</span> : 'BMI is worked out for you'}
      </p>
    </div>
  );
}
