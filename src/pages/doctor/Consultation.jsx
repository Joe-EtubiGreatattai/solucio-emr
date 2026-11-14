import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FlaskConical, Pill, Send, Syringe, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { Badge, Button, Card, Confirm, ErrorNote, Field, IconButton, Modal, Spinner, Tabs } from '../../components/ui';
import PatientBanner from '../../components/PatientBanner';
import BillView from '../../components/BillView';
import OrderForm from './OrderForm';
import ChartTimeline, { Result, Vitals } from './ChartTimeline';
import HomeMonitoringPanel from './HomeMonitoringPanel';

const ORDER_STATUS = {
  requested: ['Waiting', 'amber'], collected: ['Sample taken', 'blue'], resulted: ['Result in, not checked', 'blue'], verified: ['Result ready', 'green'],
  partly_dispensed: ['Partly given', 'amber'], dispensed: ['Given', 'green'], done: ['Done', 'green'], cancelled: ['Cancelled', 'slate'],
};

export default function Consultation() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const { data: visit } = useFetch(`/visits/${visitId}`);
  const [chart, setChart] = useState(null);
  const [tab, setTab] = useState('notes');
  const [orderKind, setOrderKind] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data: orders, reload: reloadOrders } = useFetch(`/visits/${visitId}/orders`, { initial: [] });
  const { data: bill, reload: reloadBill } = useFetch(`/visits/${visitId}/bill`);
  const patientId = visit?.patient?._id;
  const loadChart = useCallback(() => { if (patientId) api(`/patients/${patientId}/chart`).then(setChart).catch(() => {}); }, [patientId]);
  useEffect(loadChart, [loadChart]);
  useLive(['bill', 'result', 'queue', 'home-monitoring'], useCallback(() => { reloadOrders(); reloadBill(); loadChart(); }, [reloadOrders, reloadBill, loadChart]));

  if (!visit || !chart) return <Spinner />;
  const current = chart.visits.find((v) => v._id === visitId);
  const active = ['waiting', 'in_progress'].includes(visit.status);
  const pending = orders.filter((o) => ['requested', 'collected', 'resulted', 'partly_dispensed'].includes(o.status));

  async function complete(cancelPending = false) {
    setBusy(true);
    try {
      const r = await api(`/visits/${visitId}/complete`, { method: 'POST', body: { cancelPending } });
      const next = [...new Set(r.pending.map((p) => ({ lab: 'the lab', pharmacy: 'the pharmacy', procedure: 'the nurse' }[p.station])))];
      toast.success(r.visit.status === 'closed' ? 'Visit finished. Nothing for the patient to pay.' : `Visit finished. The patient goes to ${[...next, 'the cashier'].join(', then ')}.`);
      navigate('/doctor');
    } catch (e) { toast.error(e.message); } finally { setBusy(false); setCompleting(false); }
  }

  return (
    <div>
      <Link to="/doctor" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> My queue</Link>
      <PatientBanner patient={chart.patient} visit={visit}
        action={active && <Button icon={CheckCircle2} onClick={() => setCompleting(true)}>Finish visit</Button>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card title="History" subtitle="Earlier visits and old records" bodyClass="p-4 max-h-[70vh] overflow-y-auto">
          <ChartTimeline chart={chart} currentVisitId={visitId} />
        </Card>
        <Card bodyClass="p-0">
          <div className="px-4 pt-2"><Tabs value={tab} onChange={setTab} tabs={[
            { value: 'notes', label: 'Notes' },
            { value: 'orders', label: 'Orders', count: orders.filter((o) => o.kind !== 'referral').length },
            { value: 'results', label: 'Results', count: current?.results.length || 0 },
            { value: 'home', label: 'At home', count: chart.homeMonitoring?.entries?.filter((entry) => !entry.reviewedAt).length || 0 },
            { value: 'bill', label: 'Bill' },
          ]} /></div>
          <div className="p-4">
            {current?.vitals.length > 0 && <div className="mb-4 rounded-xl bg-brand-50/60 p-3"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-800">Today’s vitals</p>{current.vitals.map((v) => <Vitals key={v._id} v={v} />)}</div>}
            {tab === 'notes' && <NoteForm visitId={visitId} note={current?.notes[0]} disabled={!active} onSaved={loadChart} />}
            {tab === 'orders' && (
              <div>
                {active && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" icon={FlaskConical} onClick={() => setOrderKind('lab')}>Lab test</Button>
                    <Button size="sm" variant="secondary" icon={Pill} onClick={() => setOrderKind('drug')}>Prescribe</Button>
                    <Button size="sm" variant="secondary" icon={Syringe} onClick={() => setOrderKind('procedure')}>Procedure</Button>
                    <Button size="sm" variant="secondary" icon={Send} onClick={() => setOrderKind('referral')}>Refer</Button>
                  </div>
                )}
                <ul className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <li key={o._id} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{o.name}</span>
                        {o.kind === 'drug' && <span className="text-slate-500"> · {[o.dose, o.frequency, o.durationDays && `${o.durationDays} days`, `qty ${o.qty}`].filter(Boolean).join(' · ')}</span>}
                        {o.instructions && <span className="block text-xs text-slate-500">{o.instructions}</span>}
                      </span>
                      <Badge color={ORDER_STATUS[o.status]?.[1]}>{ORDER_STATUS[o.status]?.[0]}</Badge>
                      {active && ['requested', 'collected'].includes(o.status) && <CancelOrder order={o} onDone={reloadOrders} />}
                    </li>
                  ))}
                  {!orders.length && <li className="py-6 text-center text-sm text-slate-500">Nothing ordered yet.</li>}
                </ul>
              </div>
            )}
            {tab === 'results' && (
              <div className="space-y-3">
                {current?.results.map((r) => <Result key={r._id} r={r} name={current.orders.find((o) => o._id === r.order)?.name} />)}
                {!current?.results.length && <p className="py-6 text-center text-sm text-slate-500">No results yet. They appear here when the lab verifies them.</p>}
              </div>
            )}
            {tab === 'home' && <HomeMonitoringPanel patientId={patientId} homeMonitoring={chart.homeMonitoring} onRefresh={loadChart} />}
            {tab === 'bill' && <div className="-m-4"><BillView summary={bill} /></div>}
          </div>
        </Card>
      </div>
      <OrderForm kind={orderKind} visitId={visitId} onClose={() => setOrderKind(null)} onDone={() => { reloadOrders(); setTab('orders'); }} />
      <Modal open={completing} onClose={() => setCompleting(false)} title="Finish this visit?" size="sm" guardChanges={false}
        footer={pending.length > 0 ? <>
          <Button variant="danger-soft" loading={busy} onClick={() => complete(true)}>Cancel them and finish</Button>
          <Button loading={busy} onClick={() => complete(false)}>Finish, patient still collects them</Button>
        </> : <><Button variant="secondary" onClick={() => setCompleting(false)}>Back</Button><Button loading={busy} onClick={() => complete(false)}>Finish visit</Button></>}>
        <p className="text-sm text-slate-600">
          {pending.length > 0
            ? <>Not done yet: <b>{pending.map((o) => o.name).join(', ')}</b>. Usually the patient goes there next and then pays. Cancelled items are never charged.</>
            : 'You can’t add anything after this. The bill goes to the cashier.'}
        </p>
      </Modal>
    </div>
  );
}

function CancelOrder({ order, onDone }) {
  const [open, setOpen] = useState(false);
  const cancel = async () => {
    try { await api(`/orders/${order._id}/cancel`, { method: 'POST', body: { reason: 'Cancelled by doctor' } }); toast.success('Cancelled'); onDone(); } catch (e) { toast.error(e.message); }
    setOpen(false);
  };
  return (
    <>
      <IconButton icon={X} label="Cancel order" tone="danger" onClick={() => setOpen(true)} />
      <Confirm open={open} title={`Cancel ${order.name}?`} confirmLabel="Cancel order" tone="danger" onClose={() => setOpen(false)} onConfirm={cancel}>It comes off the lab or pharmacy list.</Confirm>
    </>
  );
}

function NoteForm({ visitId, note, disabled, onSaved }) {
  const [form, setForm] = useState({ complaint: '', history: '', examination: '', plan: '', diagnoses: [] });
  const [q, setQ] = useState('');
  const [found, setFound] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (note) setForm({ complaint: note.complaint || '', history: note.history || '', examination: note.examination || '', plan: note.plan || '', diagnoses: note.diagnoses || [] }); }, [note?._id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return undefined; }
    const t = setTimeout(() => api(`/diagnoses?q=${encodeURIComponent(q.trim())}`).then(setFound).catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [q]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const addDx = (d) => { if (!form.diagnoses.some((x) => x.name === d.name)) setForm({ ...form, diagnoses: [...form.diagnoses, d] }); setQ(''); setFound([]); };

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try { await api(`/visits/${visitId}/note`, { method: 'PUT', body: form }); toast.success('Saved'); onSaved(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <fieldset disabled={disabled} className="space-y-3">
        <Field label="Presenting complaint"><textarea className="input" rows={2} value={form.complaint} onChange={set('complaint')} /></Field>
        <Field label="History"><textarea className="input" rows={3} value={form.history} onChange={set('history')} /></Field>
        <Field label="Examination"><textarea className="input" rows={3} value={form.examination} onChange={set('examination')} /></Field>
        <div>
          <span className="label">Diagnosis</span>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {form.diagnoses.map((d) => (
              <span key={d.name} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-sm text-brand-800">
                {d.name}{d.code ? ` (${d.code})` : ''}
                <button type="button" aria-label={`Remove ${d.name}`} onClick={() => setForm({ ...form, diagnoses: form.diagnoses.filter((x) => x.name !== d.name) })}><X className="h-3.5 w-3.5" /></button>
              </span>
            ))}
          </div>
          <div className="relative">
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search (e.g. malaria, I10) or type your own and press Enter"
              onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) { e.preventDefault(); addDx(found[0] && found[0].name.toLowerCase().includes(q.trim().toLowerCase()) ? found[0] : { name: q.trim() }); } }} />
            {found.length > 0 && (
              <ul className="card absolute z-20 mt-1 max-h-60 w-full overflow-y-auto py-1 shadow-xl">
                {found.map((d) => <li key={d.code}><button type="button" className="w-full px-3 py-1.5 text-left text-sm hover:bg-brand-50" onClick={() => addDx(d)}><span className="money mr-2 text-slate-500">{d.code}</span>{d.name}</button></li>)}
              </ul>
            )}
          </div>
        </div>
        <Field label="Plan"><textarea className="input" rows={2} value={form.plan} onChange={set('plan')} /></Field>
      </fieldset>
      <ErrorNote>{error}</ErrorNote>
      {!disabled && <Button type="submit" loading={busy}>Save notes</Button>}
    </form>
  );
}
