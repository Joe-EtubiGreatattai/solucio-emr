import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, FlaskConical, HeartPulse, History, Pill, Receipt, Send, ShieldCheck, Syringe, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { age, date, dateTime, fullName, naira } from '../../lib/format';
import { ageInYears, assess, bmiOf } from '../../lib/vitals';
import { Avatar, Badge, Button, Confirm, ErrorNote, IconButton, Modal, Spinner } from '../../components/ui';
import BillView from '../../components/BillView';
import OrderForm from './OrderForm';
import ChartTimeline, { Result } from './ChartTimeline';
import HomeMonitoringPanel from './HomeMonitoringPanel';

const ORDER_STATUS = {
  requested: ['Waiting', 'amber'], collected: ['Sample taken', 'blue'], resulted: ['Result in, not checked', 'blue'], verified: ['Result ready', 'green'],
  partly_dispensed: ['Partly given', 'amber'], dispensed: ['Given', 'green'], done: ['Done', 'green'], cancelled: ['Cancelled', 'slate'],
};
const KIND_ICON = { lab: FlaskConical, drug: Pill, procedure: Syringe, referral: Send };

export default function Consultation() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const { data: visit } = useFetch(`/visits/${visitId}`);
  const [chart, setChart] = useState(null);
  const [orderKind, setOrderKind] = useState(null);
  const [sheet, setSheet] = useState(''); // 'history' | 'home' | 'bill'
  const [completing, setCompleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const noteRef = useRef(null); // lets "Finish visit" save the latest notes first
  const { data: orders, reload: reloadOrders } = useFetch(`/visits/${visitId}/orders`, { initial: [] });
  const { data: bill, reload: reloadBill } = useFetch(`/visits/${visitId}/bill`);
  const patientId = visit?.patient?._id;
  const loadChart = useCallback(() => { if (patientId) api(`/patients/${patientId}/chart`).then(setChart).catch(() => {}); }, [patientId]);
  useEffect(loadChart, [loadChart]);
  useLive(['bill', 'result', 'queue', 'home-monitoring'], useCallback(() => { reloadOrders(); reloadBill(); loadChart(); }, [reloadOrders, reloadBill, loadChart]));

  if (!visit || !chart) return <Spinner />;
  const p = chart.patient;
  const years = ageInYears(p.dob);
  const current = chart.visits.find((v) => v._id === visitId);
  const past = chart.visits.filter((v) => v._id !== visitId);
  const active = ['waiting', 'in_progress'].includes(visit.status);
  const pending = orders.filter((o) => ['requested', 'collected', 'resulted', 'partly_dispensed'].includes(o.status));
  const unreviewedHome = chart.homeMonitoring?.entries?.filter((e) => !e.reviewedAt).length || 0;
  const vitals = current?.vitals?.at(-1);

  async function complete(cancelPending = false) {
    setBusy(true);
    try {
      await noteRef.current?.flush();
      const r = await api(`/visits/${visitId}/complete`, { method: 'POST', body: { cancelPending } });
      const next = [...new Set(r.pending.map((x) => ({ lab: 'the lab', pharmacy: 'the pharmacy', procedure: 'the nurse' }[x.station])))];
      toast.success(r.visit.status === 'closed' ? 'Visit finished. Nothing for the patient to pay.' : `Visit finished. The patient goes to ${[...next, 'the cashier'].join(', then ')}.`);
      navigate('/doctor');
    } catch (e) { toast.error(e.message); } finally { setBusy(false); setCompleting(false); }
  }

  return (
    <div>
      {/* Who and why */}
      <header className="card mb-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/doctor" aria-label="Back to my queue" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"><ArrowLeft className="h-5 w-5" /></Link>
          <Avatar name={fullName(p)} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold text-slate-900 sm:text-2xl">{fullName(p)}</h1>
            <p className="text-sm text-slate-500">
              {p.sex === 'male' ? 'Male' : 'Female'}{p.dob ? `, ${age(p.dob)}` : ''} · {p.patientNo} · {visit.clinic?.name}
              {visit.payer?.type === 'hmo' ? <> · <ShieldCheck className="inline h-3.5 w-3.5" /> {visit.payer.hmo?.name}</> : ' · Cash'}
            </p>
          </div>
          {active
            ? <Button size="lg" icon={CheckCircle2} onClick={() => setCompleting(true)}>Finish visit</Button>
            : <Badge color="slate">Visit finished</Badge>}
        </div>
        {(visit.complaint || p.allergies?.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {p.allergies?.length > 0 && <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800"><AlertTriangle className="h-4 w-4" /> Allergic to {p.allergies.join(', ')}</p>}
            {visit.complaint && <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"><span className="text-slate-500">Came in with: </span>{visit.complaint}</p>}
          </div>
        )}
      </header>

      <VitalsStrip vitals={vitals} years={years} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section className="card p-4 sm:p-5">
          <NoteForm ref={noteRef} visitId={visitId} note={current?.notes?.[0]} disabled={!active} onSaved={loadChart} />
        </section>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <SideCard title="Orders" icon={ClipboardList} count={orders.filter((o) => o.kind !== 'referral').length}>
            {active && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                <Button size="sm" variant="secondary" icon={FlaskConical} onClick={() => setOrderKind('lab')}>Lab test</Button>
                <Button size="sm" variant="secondary" icon={Pill} onClick={() => setOrderKind('drug')}>Prescribe</Button>
                <Button size="sm" variant="secondary" icon={Syringe} onClick={() => setOrderKind('procedure')}>Procedure</Button>
                <Button size="sm" variant="secondary" icon={Send} onClick={() => setOrderKind('referral')}>Refer</Button>
              </div>
            )}
            {!orders.length ? <p className="text-sm text-slate-500">Nothing ordered yet.</p> : (
              <ul className="-mx-1 divide-y divide-slate-100">
                {orders.map((o) => {
                  const Icon = KIND_ICON[o.kind] || ClipboardList;
                  return (
                    <li key={o._id} className="flex items-start gap-2.5 px-1 py-2 text-sm">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-slate-800">{o.name}</span>
                        {o.kind === 'drug' && <span className="block text-xs text-slate-500">{[o.dose, o.frequency, o.durationDays && `${o.durationDays} days`, `qty ${o.qty}`].filter(Boolean).join(' · ')}</span>}
                        <Badge color={ORDER_STATUS[o.status]?.[1]} className="mt-1">{ORDER_STATUS[o.status]?.[0]}</Badge>
                      </span>
                      {active && ['requested', 'collected'].includes(o.status) && <CancelOrder order={o} onDone={reloadOrders} />}
                    </li>
                  );
                })}
              </ul>
            )}
          </SideCard>

          <SideCard title="Results" icon={FlaskConical} count={current?.results?.length || 0}>
            {current?.results?.length
              ? <div className="space-y-2">{current.results.map((r) => <Result key={r._id} r={r} name={current.orders.find((o) => o._id === r.order)?.name} />)}</div>
              : <p className="text-sm text-slate-500">{pending.some((o) => o.kind === 'lab') ? 'Waiting for the lab. Results appear here as soon as they’re verified.' : 'No tests this visit.'}</p>}
          </SideCard>

          <div className="card divide-y divide-slate-100">
            <SheetLink icon={History} label="Past visits" detail={past.length ? `${past.length}, last ${date(past[0].createdAt)}` : (p.paperHistory || p.importedHistory ? 'Old records only' : 'First visit')} onClick={() => setSheet('history')} />
            <SheetLink icon={HeartPulse} label="At-home check-ins" detail={unreviewedHome ? `${unreviewedHome} to review` : 'None to review'} alert={unreviewedHome > 0} onClick={() => setSheet('home')} />
            <SheetLink icon={Receipt} label="Bill so far" detail={bill ? naira(bill.totalKobo) : '…'} onClick={() => setSheet('bill')} />
          </div>
        </aside>
      </div>

      <OrderForm kind={orderKind} visitId={visitId} onClose={() => setOrderKind(null)} onDone={reloadOrders} />

      <Modal open={sheet === 'history'} onClose={() => setSheet('')} title="Past visits and old records" size="lg" guardChanges={false}>
        <ChartTimeline chart={chart} currentVisitId={visitId} />
      </Modal>
      <Modal open={sheet === 'home'} onClose={() => setSheet('')} title="At-home check-ins" size="lg" guardChanges={false}>
        <HomeMonitoringPanel patientId={patientId} homeMonitoring={chart.homeMonitoring} onRefresh={loadChart} />
      </Modal>
      <Modal open={sheet === 'bill'} onClose={() => setSheet('')} title="Bill so far" size="lg" guardChanges={false}>
        <div className="-m-5"><BillView summary={bill} /></div>
      </Modal>

      <Modal open={completing} onClose={() => setCompleting(false)} title="Finish this visit?" size="sm" guardChanges={false}
        footer={pending.length > 0 ? <>
          <Button variant="danger-soft" loading={busy} onClick={() => complete(true)}>Cancel them and finish</Button>
          <Button loading={busy} onClick={() => complete(false)}>Finish, patient still collects them</Button>
        </> : <><Button variant="secondary" onClick={() => setCompleting(false)}>Back</Button><Button loading={busy} onClick={() => complete(false)}>Finish visit</Button></>}>
        <p className="text-sm text-slate-600">
          {pending.length > 0
            ? <>Not done yet: <b>{pending.map((o) => o.name).join(', ')}</b>. Usually the patient goes there next and then pays. Cancelled items are never charged.</>
            : 'Your notes are saved. You can’t add anything after this, and the bill goes to the cashier.'}
        </p>
      </Modal>
    </div>
  );
}

const TILE = {
  normal: 'border-slate-200 bg-white', borderline: 'border-amber-300 bg-amber-50', critical: 'border-rose-300 bg-rose-50',
  unrated: 'border-slate-200 bg-white', empty: 'border-slate-200 bg-white',
};
const WORD = { borderline: ['Check', 'text-amber-700'], critical: ['Danger', 'text-rose-700'] };

function VitalsStrip({ vitals, years }) {
  if (!vitals) {
    return <p className="card mb-4 px-4 py-3 text-sm text-slate-500">No vitals taken this visit.</p>;
  }
  const bpLevel = ['critical', 'borderline'].find((l) => [assess('bpSys', vitals.bpSys, years).level, assess('bpDia', vitals.bpDia, years).level].includes(l)) || 'normal';
  const bmi = bmiOf(vitals.weightKg, vitals.heightCm);
  const tiles = [
    vitals.bpSys != null && { label: 'Blood pressure', value: `${vitals.bpSys}/${vitals.bpDia ?? '?'}`, unit: 'mmHg', level: bpLevel },
    vitals.pulse != null && { label: 'Pulse', value: vitals.pulse, unit: '/min', level: assess('pulse', vitals.pulse, years).level },
    vitals.tempC != null && { label: 'Temperature', value: vitals.tempC, unit: '°C', level: assess('tempC', vitals.tempC, years).level },
    vitals.spo2 != null && { label: 'Oxygen', value: vitals.spo2, unit: '%', level: assess('spo2', vitals.spo2, years).level },
    vitals.respRate != null && { label: 'Breathing', value: vitals.respRate, unit: '/min', level: assess('respRate', vitals.respRate, years).level },
    bmi && { label: 'BMI', value: bmi.value, unit: bmi.label, level: 'normal' },
  ].filter(Boolean);
  return (
    <section className="mb-4" aria-label="Today’s vitals">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-xl border px-3 py-2.5 ${TILE[t.level] || TILE.normal}`}>
            <p className="flex items-baseline justify-between gap-2 text-xs text-slate-500">{t.label}{WORD[t.level] && <span className={`font-semibold ${WORD[t.level][1]}`}>{WORD[t.level][0]}</span>}</p>
            <p className="money mt-0.5 text-xl font-semibold text-slate-900">{t.value} <span className="text-xs font-normal text-slate-500">{t.unit}</span></p>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">Taken {dateTime(vitals.createdAt)}{vitals.notes ? ` · Nurse: ${vitals.notes}` : ''}</p>
    </section>
  );
}

function SideCard({ title, icon: Icon, count, children }) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><Icon className="h-4 w-4 text-brand-700" />{title}{count > 0 && <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-500">{count}</span>}</h2>
      {children}
    </section>
  );
}

function SheetLink({ icon: Icon, label, detail, alert, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50">
      <Icon className={`h-4 w-4 ${alert ? 'text-amber-600' : 'text-slate-400'}`} />
      <span className="flex-1 text-sm font-medium text-slate-800">{label}</span>
      <span className={`text-xs ${alert ? 'font-semibold text-amber-700' : 'text-slate-500'}`}>{detail}</span>
    </button>
  );
}

function CancelOrder({ order, onDone }) {
  const [open, setOpen] = useState(false);
  const cancel = async () => {
    try { await api(`/orders/${order._id}/cancel`, { method: 'POST', body: { reason: 'Cancelled by doctor' } }); toast.success(`${order.name} cancelled`); onDone(); } catch (e) { toast.error(e.message); }
    setOpen(false);
  };
  return (
    <>
      <IconButton icon={X} label={`Cancel ${order.name}`} tone="danger" onClick={() => setOpen(true)} />
      <Confirm open={open} title={`Cancel ${order.name}?`} confirmLabel="Cancel order" tone="danger" onClose={() => setOpen(false)} onConfirm={cancel}>It comes off the lab, pharmacy or nurse’s list, and isn’t charged.</Confirm>
    </>
  );
}

const SECTIONS = [
  ['complaint', 'Presenting complaint', 2, 'In the patient’s words, and for how long'],
  ['history', 'History', 3, 'Relevant medical, drug and family history'],
  ['examination', 'Examination', 3, 'Findings'],
];

/** Doctor's notes. Saves by itself a moment after typing stops, and before the visit is finished. */
function NoteFormInner({ visitId, note, disabled, onSaved }, ref) {
  const [form, setForm] = useState({ complaint: '', history: '', examination: '', plan: '', diagnoses: [] });
  const [status, setStatus] = useState('saved'); // saved | unsaved | saving | error
  const [savedAt, setSavedAt] = useState(null);
  const [q, setQ] = useState('');
  const [found, setFound] = useState([]);
  const [error, setError] = useState('');
  const latest = useRef(form);
  const loaded = useRef(false);
  latest.current = form;

  useEffect(() => {
    if (note && !loaded.current) {
      setForm({ complaint: note.complaint || '', history: note.history || '', examination: note.examination || '', plan: note.plan || '', diagnoses: note.diagnoses || [] });
      setSavedAt(note.updatedAt);
    }
    loaded.current = true;
  }, [note]);

  const save = useCallback(async () => {
    setStatus('saving');
    setError('');
    try {
      const saved = await api(`/visits/${visitId}/note`, { method: 'PUT', body: latest.current });
      setStatus('saved');
      setSavedAt(saved.updatedAt || new Date().toISOString());
      onSaved?.();
    } catch (e) { setStatus('error'); setError(e.message); }
  }, [visitId, onSaved]);

  useEffect(() => {
    if (status !== 'unsaved' || disabled) return undefined;
    const t = setTimeout(save, 1500);
    return () => clearTimeout(t);
  }, [form, status, disabled, save]);

  // Unsaved notes are never lost by closing the tab
  useEffect(() => {
    const warn = (e) => { if (status === 'unsaved' || status === 'saving') { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status]);

  useImperativeHandle(ref, () => ({ flush: async () => { if (status === 'unsaved' || status === 'error') await save(); } }), [status, save]);

  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return undefined; }
    const t = setTimeout(() => api(`/diagnoses?q=${encodeURIComponent(q.trim())}`).then(setFound).catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [q]);

  const update = (patch) => { setForm((f) => ({ ...f, ...patch })); setStatus('unsaved'); };
  const addDx = (d) => { if (!form.diagnoses.some((x) => x.name === d.name)) update({ diagnoses: [...form.diagnoses, d] }); setQ(''); setFound([]); };
  const STATUS = {
    saved: savedAt ? `Saved ${dateTime(savedAt)}` : 'Notes save as you type',
    unsaved: 'Not saved yet…', saving: 'Saving…', error: 'Couldn’t save',
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Consultation notes</h2>
        {!disabled && (
          <span className={`flex items-center gap-2 text-xs ${status === 'error' ? 'font-semibold text-rose-700' : 'text-slate-500'}`} role="status">
            {status === 'saved' && savedAt && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
            {STATUS[status]}
            {status === 'error' && <button type="button" className="underline" onClick={save}>Try again</button>}
          </span>
        )}
      </div>
      <fieldset disabled={disabled} className="space-y-4">
        {SECTIONS.map(([k, label, rows, hint]) => (
          <label key={k} className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>
            <textarea className="input" rows={rows} value={form[k]} placeholder={hint} onChange={(e) => update({ [k]: e.target.value })} />
          </label>
        ))}
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-slate-800">Diagnosis</span>
          {form.diagnoses.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {form.diagnoses.map((d) => (
                <span key={d.name} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-3 pr-1.5 text-sm text-brand-800">
                  {d.name}{d.code && <span className="money text-xs text-brand-600">{d.code}</span>}
                  {!disabled && <button type="button" aria-label={`Remove ${d.name}`} className="rounded-full p-0.5 hover:bg-brand-100" onClick={() => update({ diagnoses: form.diagnoses.filter((x) => x.name !== d.name) })}><X className="h-3.5 w-3.5" /></button>}
                </span>
              ))}
            </div>
          )}
          {!disabled && (
            <div className="relative">
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or ICD-10 code, or type your own and press Enter"
                onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) { e.preventDefault(); addDx(found[0] && found[0].name.toLowerCase().includes(q.trim().toLowerCase()) ? found[0] : { name: q.trim() }); } }} />
              {found.length > 0 && (
                <ul className="card absolute z-20 mt-1 max-h-60 w-full overflow-y-auto py-1 shadow-xl">
                  {found.map((d) => <li key={d.code}><button type="button" className="flex w-full gap-3 px-3 py-1.5 text-left text-sm hover:bg-brand-50" onClick={() => addDx(d)}><span className="money w-14 shrink-0 text-slate-500">{d.code}</span>{d.name}</button></li>)}
                </ul>
              )}
            </div>
          )}
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-800">Plan</span>
          <textarea className="input" rows={3} value={form.plan} placeholder="Treatment, advice, follow-up" onChange={(e) => update({ plan: e.target.value })} />
        </label>
      </fieldset>
      <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>
    </div>
  );
}

const NoteForm = forwardRef(NoteFormInner);
