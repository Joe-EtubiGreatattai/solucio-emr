import { useCallback, useState } from 'react';
import { CheckCircle2, Printer, TestTube } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { age, dateTime, fullName } from '../../lib/format';
import { Badge, Button, Card, Empty, ErrorNote, Field, MetricGrid, Modal, PageHeader, Spinner } from '../../components/ui';
import LabReport from './LabReport';

const STATUS = { requested: ['Waiting for sample', 'amber'], collected: ['Sample taken', 'blue'], resulted: ['Check and verify', 'teal'], verified: ['Verified', 'green'] };
const flagCls = { low: 'border-sky-300 bg-sky-50', high: 'border-rose-300 bg-rose-50' };
const flagOf = (f, v) => {
  const n = Number(v);
  if (f.type !== 'number' || v === '' || !Number.isFinite(n)) return '';
  if (f.refLow != null && n < f.refLow) return 'low';
  if (f.refHigh != null && n > f.refHigh) return 'high';
  return 'normal';
};

export default function LabWorklist({ done = false }) {
  const { data, loading, reload } = useFetch(`/lab/worklist${done ? '?status=verified' : ''}`, { initial: [] });
  useLive(['queue', 'result'], useCallback(() => reload(), [reload]));
  const [open, setOpen] = useState(null);
  const [print, setPrint] = useState(null);
  const tests = data || [];
  const metrics = done ? [
    { label: 'Verified', value: loading ? '—' : tests.length, hint: 'Recent results', tone: 'green' },
    { label: 'Urgent results', value: loading ? '—' : tests.filter((o) => o.visit?.priority === 1).length, hint: 'Prioritise for review', tone: 'amber' },
  ] : [
    { label: 'Tests in progress', value: loading ? '—' : tests.length, hint: 'Across all patients', tone: 'brand' },
    { label: 'Awaiting sample', value: loading ? '—' : tests.filter((o) => o.status === 'requested').length, hint: 'Collect to begin', tone: 'amber' },
    { label: 'Ready to verify', value: loading ? '—' : tests.filter((o) => o.status === 'resulted').length, hint: 'Review and release', tone: 'green' },
    { label: 'Urgent', value: loading ? '—' : tests.filter((o) => o.visit?.priority === 1).length, hint: 'High priority', tone: 'red', warn: !loading && tests.some((o) => o.visit?.priority === 1) },
  ];

  return (
    <div>
      <PageHeader title={done ? 'Verified results' : 'Lab worklist'} subtitle={done ? 'Recent results. Print a copy for the patient.' : 'Collect the sample, enter the result, then verify. Verifying adds the test to the bill.'} />
      <MetricGrid items={metrics} />
      <Card bodyClass="p-0">
        {loading ? <Spinner /> : !data.length ? <Empty title={done ? 'No verified results yet' : 'No tests waiting'} icon={TestTube} /> : (
          <table className="table">
            <thead><tr><th>Patient</th><th>Test</th><th>Requested</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.map((o) => (
                <tr key={o._id}>
                  <td data-label=""><span className="font-semibold">{fullName(o.patient)}</span><span className="block text-xs text-slate-500">{o.patient?.patientNo} · {o.patient?.sex === 'male' ? 'M' : 'F'}{o.patient?.dob ? ` · ${age(o.patient.dob)}` : ''}</span></td>
                  <td data-label="Test">{o.name}{o.visit?.priority === 1 && <Badge color="red" className="ml-2">Urgent</Badge>}</td>
                  <td data-label="Requested">{dateTime(o.createdAt)}<span className="block text-xs text-slate-500">{o.orderedBy?.name}</span></td>
                  <td data-label="Status"><Badge color={STATUS[o.status][1]}>{STATUS[o.status][0]}</Badge></td>
                  <td data-label="">{done ? <Button size="sm" variant="secondary" icon={Printer} onClick={() => setPrint(o)}>Print</Button> : <Button size="sm" onClick={() => setOpen(o)}>Open</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <ResultModal order={open} onClose={() => setOpen(null)} onChanged={reload} />
      <LabReport order={print} onClose={() => setPrint(null)} />
    </div>
  );
}

function ResultModal({ order, onClose, onChanged }) {
  const [values, setValues] = useState({});
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [key, setKey] = useState(null);
  if (order && key !== order._id) {
    setKey(order._id);
    setValues(Object.fromEntries((order.result?.values || []).map((v) => [v.name, v.value])));
    setComment(order.result?.comment || '');
    setStatus(order.status);
    setError('');
  }
  if (!order) return null;
  const fields = order.labFields.length ? order.labFields : [{ name: 'Result', type: 'text' }];

  const act = async (what) => {
    setBusy(what);
    setError('');
    try {
      if (what === 'collect') { await api(`/lab/orders/${order._id}/collect`, { method: 'POST' }); setStatus('collected'); }
      if (what === 'save' || what === 'verify') {
        await api(`/lab/orders/${order._id}/result`, { method: 'PUT', body: { values: fields.map((f) => ({ name: f.name, value: values[f.name] ?? '' })), comment } });
        setStatus('resulted');
      }
      if (what === 'verify') { await api(`/lab/orders/${order._id}/verify`, { method: 'POST' }); toast.success('Verified. The doctor can see it now.'); onChanged(); onClose(); return; }
      onChanged();
      if (what === 'save') toast.success('Saved. Verify when checked.');
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  return (
    <Modal open onClose={onClose} title={order.name} size="lg" guardChanges={false}
      footer={status === 'requested'
        ? <Button icon={TestTube} loading={busy === 'collect'} onClick={() => act('collect')}>Sample collected</Button>
        : <><Button variant="secondary" loading={busy === 'save'} onClick={() => act('save')}>Save</Button><Button icon={CheckCircle2} loading={busy === 'verify'} onClick={() => act('verify')}>Verify result</Button></>}>
      <p className="mb-4 text-sm text-slate-600"><b>{fullName(order.patient)}</b> · {order.patient?.patientNo} · {order.patient?.sex === 'male' ? 'Male' : 'Female'}{order.patient?.dob ? `, ${age(order.patient.dob)}` : ''}{order.instructions ? ` · Note: ${order.instructions}` : ''}</p>
      {status !== 'requested' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((f) => {
            const fl = flagOf(f, values[f.name]);
            return (
              <Field key={f.name} label={`${f.name}${f.unit ? ` (${f.unit})` : ''}`} hint={f.type === 'number' && (f.refLow != null || f.refHigh != null) ? `Normal ${f.refLow ?? ''}–${f.refHigh ?? ''}${fl === 'low' ? ' · LOW' : fl === 'high' ? ' · HIGH' : ''}` : ''}>
                {f.type === 'choice' ? (
                  <select className="input" value={values[f.name] ?? ''} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}><option value="">Choose…</option>{f.choices.map((c) => <option key={c}>{c}</option>)}</select>
                ) : (
                  <input className={`input ${flagCls[fl] || ''}`} inputMode={f.type === 'number' ? 'decimal' : 'text'} value={values[f.name] ?? ''} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
                )}
              </Field>
            );
          })}
          <Field label="Comment" className="sm:col-span-2"><textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
        </div>
      )}
      <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>
    </Modal>
  );
}
