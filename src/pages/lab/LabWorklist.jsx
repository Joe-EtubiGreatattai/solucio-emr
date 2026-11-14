import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, Clock, FlaskConical, Printer, TestTube } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { age, dateTime, fullName, minutes } from '../../lib/format';
import { abnormalSummary, flagOf, rangeText, step } from '../../lib/lab';
import { Avatar, Badge, Button, ErrorNote, Skeleton } from '../../components/ui';
import LabReport from './LabReport';

const FILTERS = [
  ['all', 'All', () => true],
  ['collect', 'To collect', (o) => o.status === 'requested'],
  ['enter', 'To enter', (o) => o.status === 'collected'],
  ['check', 'To check', (o) => o.status === 'resulted'],
];
const STATUS_TEXT = { requested: ['Collect sample', 'text-amber-700'], collected: ['Enter results', 'text-sky-700'], resulted: ['Check and verify', 'text-brand-700'], verified: ['Verified', 'text-emerald-700'] };
const waitedMinutes = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

export default function LabWorklist({ done = false }) {
  const { data, loading, error, reload } = useFetch(`/lab/worklist${done ? '?status=verified' : ''}`, { initial: [] });
  useLive(['queue', 'result'], useCallback(() => reload(), [reload]));
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  // Urgent first, then whoever has waited longest (verified results: newest first)
  const tests = [...(data || [])].sort((a, b) => done ? 0 : ((a.visit?.priority === 1 ? 0 : 1) - (b.visit?.priority === 1 ? 0 : 1)) || (new Date(a.createdAt) - new Date(b.createdAt)));
  const shown = tests.filter(FILTERS.find(([k]) => k === filter)[2]);
  const selected = tests.find((o) => o._id === selectedId) || null;

  // After a test is verified it leaves the list; move on to the next one waiting
  const goNext = useCallback((afterId) => {
    const rest = tests.filter((o) => o._id !== afterId);
    const next = rest.find((o) => o.visit?.priority === 1) || rest[0];
    setSelectedId(next?._id || null);
  }, [tests]);

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
      <aside className={`${selected ? 'hidden lg:block' : ''} lg:sticky lg:top-4`}>
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-4">
            <h1 className="text-xl font-semibold text-slate-900">{done ? 'Verified results' : 'Lab worklist'}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {done ? 'Recent results, ready to print.' : tests.length ? `${tests.length} test${tests.length === 1 ? '' : 's'} in progress` : 'Nothing waiting'}
              {!done && tests.some((o) => o.visit?.priority === 1) && <>, <span className="font-semibold text-rose-700">{tests.filter((o) => o.visit?.priority === 1).length} urgent</span></>}
            </p>
            {!done && (
              <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Show">
                {FILTERS.map(([k, label, test]) => {
                  const n = tests.filter(test).length;
                  return (
                    <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k}
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${filter === k ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                      {label} <span className="opacity-70">{n}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {loading ? (
            <div className="space-y-2 p-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : error ? (
            <p className="p-4 text-sm text-rose-700">{error}</p>
          ) : !shown.length ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">{done ? 'No verified results yet.' : filter === 'all' ? 'Tests appear here as soon as a doctor orders them.' : 'Nothing at this step.'}</p>
          ) : (
            <ul className="max-h-[calc(100vh-15rem)] divide-y divide-slate-100 overflow-y-auto">
              {shown.map((o) => {
                const active = o._id === selectedId;
                const wait = waitedMinutes(o.createdAt);
                const [label, tone] = STATUS_TEXT[o.status] || ['', ''];
                return (
                  <li key={o._id}>
                    <button type="button" onClick={() => setSelectedId(o._id)} aria-current={active ? 'true' : undefined}
                      className={`relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${active ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                      {(active || o.visit?.priority === 1) && <span className={`absolute inset-y-0 left-0 w-1 ${active ? 'bg-brand-600' : 'bg-rose-500'}`} />}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold text-slate-900">{o.name}</span>
                          {o.visit?.priority === 1 && <Badge color="red">Urgent</Badge>}
                        </span>
                        <span className="block truncate text-sm text-slate-500">{fullName(o.patient)} · {o.patient?.patientNo}</span>
                        <span className={`mt-0.5 block text-xs font-semibold ${tone}`}>{label}</span>
                      </span>
                      <span className={`flex shrink-0 items-center gap-1 text-xs ${done ? 'text-slate-500' : wait >= 120 ? 'font-semibold text-rose-700' : wait >= 60 ? 'text-amber-700' : 'text-slate-500'}`}>
                        {done ? dateTime(o.result?.verifiedAt) : <><Clock className="h-3.5 w-3.5" />{minutes(wait)}</>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section className={selected ? '' : 'hidden lg:block'}>
        {selected ? (
          done
            ? <VerifiedPanel key={selected._id} order={selected} onBack={() => setSelectedId(null)} />
            : <TestPanel key={selected._id} order={selected} siblings={tests.filter((o) => o.visit?._id && o.visit._id === selected.visit?._id && o._id !== selected._id)} onBack={() => setSelectedId(null)} onChanged={reload} onVerified={() => { goNext(selected._id); reload(); }} />
        ) : (
          <div className="card flex min-h-[24rem] flex-col items-center justify-center gap-2 p-8 text-center">
            <FlaskConical className="h-10 w-10 text-brand-600" />
            <p className="text-lg font-semibold text-slate-900">{done ? 'Pick a result to view or print' : 'Pick a test to work on'}</p>
            <p className="max-w-sm text-sm text-slate-500">{done ? 'Results stay here after they’re verified.' : 'Collect the sample, enter the results, then verify. Verifying sends the result to the doctor and adds the test to the bill.'}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Steps({ at }) {
  const names = ['Sample', 'Results', 'Verified'];
  return (
    <ol className="flex items-center gap-2 text-xs font-semibold" aria-label="Progress">
      {names.map((n, i) => {
        // at: 0 needs sample, 1 needs results, 2 needs verifying, 3 verified
        const doneStep = i < at || at === 3;
        const current = i === at;
        return (
          <li key={n} className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full ${doneStep ? 'bg-emerald-600 text-white' : current ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {doneStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={doneStep || current ? 'text-slate-800' : 'text-slate-400'}>{n}</span>
            {i < names.length - 1 && <span className="h-px w-5 bg-slate-200 sm:w-8" />}
          </li>
        );
      })}
    </ol>
  );
}

function PatientLine({ order, onBack }) {
  const p = order.patient;
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 sm:p-5">
      <button type="button" onClick={onBack} aria-label="Back to worklist" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 lg:hidden"><ArrowLeft className="h-4 w-4" /></button>
      <Avatar name={fullName(p)} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-xl font-semibold text-slate-900">{order.name}</h2>
        <p className="text-sm text-slate-500">{fullName(p)} · {p?.sex === 'male' ? 'Male' : 'Female'}{p?.dob ? `, ${age(p.dob)}` : ''} · {p?.patientNo}</p>
      </div>
      {order.visit?.priority === 1 && <Badge color="red">Urgent</Badge>}
    </header>
  );
}

function TestPanel({ order, siblings, onBack, onChanged, onVerified }) {
  const fields = order.labFields?.length ? order.labFields : [{ name: 'Result', type: 'text' }];
  const [status, setStatus] = useState(order.status);
  const [values, setValues] = useState(() => Object.fromEntries((order.result?.values || []).map((v) => [v.name, v.value])));
  const [comment, setComment] = useState(order.result?.comment || '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const inputs = useRef([]);
  useEffect(() => { if (status !== 'requested') inputs.current[0]?.focus(); }, [status]);
  const uncollected = siblings.filter((o) => o.status === 'requested');
  const abnormal = useMemo(() => abnormalSummary(fields, values), [fields, values]);
  const filled = fields.filter((f) => String(values[f.name] ?? '').trim()).length;

  async function collect(all) {
    setBusy(all ? 'collect-all' : 'collect');
    setError('');
    try {
      for (const o of [order, ...(all ? uncollected : [])]) await api(`/lab/orders/${o._id}/collect`, { method: 'POST' });
      setStatus('collected');
      toast.success(all ? `${uncollected.length + 1} samples collected` : 'Sample collected');
      onChanged();
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  }

  async function save(verify) {
    setBusy(verify ? 'verify' : 'save');
    setError('');
    try {
      await api(`/lab/orders/${order._id}/result`, { method: 'PUT', body: { values: fields.map((f) => ({ name: f.name, value: values[f.name] ?? '' })), comment } });
      setStatus('resulted');
      if (verify) {
        await api(`/lab/orders/${order._id}/verify`, { method: 'POST' });
        toast.success(`${order.name} verified. The doctor can see it now.`);
        onVerified();
        return;
      }
      toast.success('Saved. Verify once you’ve checked it.');
      onChanged();
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  }

  const nextField = (i) => (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); inputs.current[i + 1]?.focus(); }
  };

  return (
    <div className="card overflow-hidden">
      <PatientLine order={order} onBack={onBack} />
      <div className="space-y-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Steps at={step(status)} />
          <p className="text-xs text-slate-500">Ordered {dateTime(order.createdAt)}{order.orderedBy?.name ? ` by ${order.orderedBy.name}` : ''}</p>
        </div>
        {order.instructions && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900"><span className="font-semibold">Doctor’s note: </span>{order.instructions}</p>}

        {status === 'requested' ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
            <TestTube className="mx-auto h-9 w-9 text-brand-600" />
            <p className="mt-2 font-semibold text-slate-900">Take the sample, then mark it collected</p>
            {uncollected.length > 0 && <p className="mt-1 text-sm text-slate-500">{fullName(order.patient)} also has {uncollected.map((o) => o.name).join(', ')} waiting.</p>}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button size="lg" icon={TestTube} loading={busy === 'collect'} onClick={() => collect(false)}>Sample collected</Button>
              {uncollected.length > 0 && <Button size="lg" variant="secondary" loading={busy === 'collect-all'} onClick={() => collect(true)}>Collect all {uncollected.length + 1}</Button>}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_7rem_4.5rem] gap-3 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 sm:grid">
                <span>Test</span><span>Result</span><span>Normal range</span><span />
              </div>
              <ul className="divide-y divide-slate-100">
                {fields.map((f, i) => {
                  const flag = flagOf(f, values[f.name]);
                  const set = (v) => setValues((cur) => ({ ...cur, [f.name]: v }));
                  return (
                    <li key={f.name} className={`grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_7rem_4.5rem] sm:items-center sm:gap-3 ${flag === 'low' || flag === 'high' ? 'bg-rose-50/50' : ''}`}>
                      <label htmlFor={`f-${i}`} className="text-sm font-medium text-slate-800">{f.name}{f.unit && <span className="ml-1 font-normal text-slate-500">({f.unit})</span>}</label>
                      {f.type === 'choice' && f.choices?.length <= 5 ? (
                        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={f.name}>
                          {f.choices.map((c, ci) => (
                            <button key={c} type="button" role="radio" aria-checked={values[f.name] === c} ref={ci === 0 ? (el) => { inputs.current[i] = el; } : undefined}
                              onClick={() => { set(c); inputs.current[i + 1]?.focus(); }}
                              className={`rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition-colors ${values[f.name] === c ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>{c}</button>
                          ))}
                        </div>
                      ) : f.type === 'choice' ? (
                        <select id={`f-${i}`} ref={(el) => { inputs.current[i] = el; }} className="input" value={values[f.name] ?? ''} onChange={(e) => set(e.target.value)} onKeyDown={nextField(i)}>
                          <option value="">Choose…</option>{f.choices.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      ) : (
                        <input id={`f-${i}`} ref={(el) => { inputs.current[i] = el; }} className={`input money ${flag === 'low' || flag === 'high' ? '!border-rose-300' : ''}`}
                          inputMode={f.type === 'number' ? 'decimal' : 'text'} value={values[f.name] ?? ''} onChange={(e) => set(e.target.value)} onKeyDown={nextField(i)} />
                      )}
                      <span className="text-xs text-slate-500 sm:text-sm">{rangeText(f) && <><span className="sm:hidden">Normal </span>{rangeText(f)}</>}</span>
                      <span>
                        {flag === 'low' && <span className="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">Low</span>}
                        {flag === 'high' && <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">High</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-800">Comment (optional)</span>
              <textarea ref={(el) => { inputs.current[fields.length] = el; }} className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="e.g. Sample slightly haemolysed" />
            </label>
            {abnormal && <p className="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-sm text-rose-900"><span className="font-semibold">Outside normal range: </span>{abnormal}</p>}
            <ErrorNote>{error}</ErrorNote>
          </>
        )}
        {status === 'requested' && <ErrorNote>{error}</ErrorNote>}
      </div>

      {status !== 'requested' && (
        <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
          <p className={`text-sm ${filled && filled < fields.length ? 'text-amber-700' : 'text-slate-500'}`}>{filled} of {fields.length} filled{filled && filled < fields.length ? `, ${fields.length - filled} left empty` : ''}</p>
          <div className="flex gap-2">
            <Button variant="secondary" loading={busy === 'save'} onClick={() => save(false)}>Save for now</Button>
            <Button icon={CheckCircle2} loading={busy === 'verify'} disabled={!filled} onClick={() => save(true)}>Verify and send to doctor</Button>
          </div>
        </footer>
      )}
    </div>
  );
}

function VerifiedPanel({ order, onBack }) {
  const [print, setPrint] = useState(false);
  const values = order.result?.values || [];
  return (
    <div className="card overflow-hidden">
      <PatientLine order={order} onBack={onBack} />
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Steps at={3} />
          <Button icon={Printer} onClick={() => setPrint(true)}>Print report</Button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <ul className="divide-y divide-slate-100">
            {values.map((v) => (
              <li key={v.name} className={`grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_7rem] gap-3 px-4 py-2.5 text-sm ${v.flag === 'low' || v.flag === 'high' ? 'bg-rose-50/50' : ''}`}>
                <span className="text-slate-700">{v.name}</span>
                <span className="money font-semibold text-slate-900">{String(v.value ?? '').trim() ? `${v.value} ${v.unit || ''}` : <span className="font-normal text-slate-400">—</span>}{v.flag === 'low' && <span className="ml-2 text-xs font-bold text-sky-700">Low</span>}{v.flag === 'high' && <span className="ml-2 text-xs font-bold text-rose-700">High</span>}</span>
                <span className="text-slate-500">{rangeText({ type: 'number', refLow: v.refLow, refHigh: v.refHigh })}</span>
              </li>
            ))}
          </ul>
        </div>
        {order.result?.comment && <p className="text-sm text-slate-700"><span className="text-slate-500">Comment: </span>{order.result.comment}</p>}
        <p className="text-xs text-slate-500">Verified {dateTime(order.result?.verifiedAt)}</p>
      </div>
      {print && <LabReport order={order} onClose={() => setPrint(false)} />}
    </div>
  );
}
