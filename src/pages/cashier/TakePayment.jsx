import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, DoorOpen, Plus, Printer, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { dateTime, naira, toKobo } from '../../lib/format';
import { newRequestId } from '../../lib/id';
import { Badge, Button, Card, ErrorNote, Field, IconButton, Modal, MoneyInput, Spinner, SuccessCheck } from '../../components/ui';
import PatientBanner from '../../components/PatientBanner';
import BillView from '../../components/BillView';
import Receipt from './Receipt';

const METHODS = [['cash', 'Cash'], ['pos', 'POS'], ['transfer', 'Transfer']];

export default function TakePayment() {
  const { visitId } = useParams();
  const { data, loading, reload } = useFetch(`/cashier/bills/${visitId}`);
  useLive(['bill'], useCallback((e) => { if (!e.visit || e.visit === visitId) reload(); }, [reload, visitId]));
  const [rows, setRows] = useState([{ method: 'cash', amount: '' }]);
  const [requestId, setRequestId] = useState(newRequestId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [leave, setLeave] = useState(false);
  const [reason, setReason] = useState('');

  if (loading || !data) return <Spinner />;
  const { visit, patient, summary, pending = [] } = data;
  const total = rows.reduce((s, r) => s + toKobo(r.amount), 0);
  const left = summary.balanceKobo - total;
  const payable = visit.status === 'awaiting_payment' || (visit.status === 'closed' && summary.balanceKobo > 0);

  async function pay() {
    setBusy(true);
    setError('');
    try {
      const r = await api(`/cashier/bills/${visitId}/payments`, { method: 'POST', body: { requestId, payments: rows.map((x) => ({ method: x.method, amountKobo: toKobo(x.amount) })).filter((x) => x.amountKobo > 0) } });
      toast.success(`Paid ${naira(total)}`);
      setRows([{ method: 'cash', amount: '' }]);
      setRequestId(newRequestId());
      reload();
      setReceipt(r.payments[0]?._id);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function close() {
    setBusy(true);
    try { await api(`/cashier/bills/${visitId}/close`, { method: 'POST', body: { reason } }); toast.success('Closed. The balance stays on the patient’s record.'); setLeave(false); reload(); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div>
      <Link to="/cashier" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Awaiting payment</Link>
      <PatientBanner patient={patient} visit={visit} />
      {pending.length > 0 && visit.status === 'awaiting_payment' && (
        <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Still to collect: <b>{pending.map((p) => `${p.name} (${{ lab: 'lab', pharmacy: 'pharmacy', procedure: 'nurse' }[p.station]})`).join(', ')}</b>.
          Send the patient there first. Those charges are added when they’re done, so the bill may grow.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card title="Bill" subtitle={`${visit.clinic?.name || ''} · ${visit.visitNo}`} bodyClass="p-0"><BillView summary={summary} /></Card>
        <div className="space-y-4">
          {payable ? (
            <Card title="Take payment">
              <p className="mb-4 text-sm text-slate-500">Balance due <b className="money text-lg text-slate-900">{naira(summary.balanceKobo)}</b></p>
              <div className="space-y-2">
                {rows.map((r, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <Field label={i === 0 ? 'How' : ''} className="w-32 shrink-0">
                      <select className="input" value={r.method} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, method: e.target.value } : x)))}>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                    </Field>
                    <Field label={i === 0 ? 'Amount' : ''} className="flex-1"><MoneyInput value={r.amount} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} /></Field>
                    {rows.length > 1 && <IconButton icon={Trash2} label="Remove" onClick={() => setRows(rows.filter((_, j) => j !== i))} />}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" icon={Plus} onClick={() => setRows([...rows, { method: 'pos', amount: '' }])}>Split payment</Button>
                <Button size="sm" variant="ghost" onClick={() => setRows([{ ...rows[0], amount: String(summary.balanceKobo / 100) }, ...rows.slice(1).map((r) => ({ ...r, amount: '' }))])}>Pay all</Button>
              </div>
              <p className={`mt-3 text-sm ${left < 0 ? 'font-semibold text-rose-700' : 'text-slate-600'}`}>{left < 0 ? `That’s ${naira(-left)} too much` : `Left after this: ${naira(left)}`}</p>
              <div className="mt-2"><ErrorNote>{error}</ErrorNote></div>
              <Button className="mt-3 w-full" size="lg" loading={busy} disabled={total <= 0 || left < 0} onClick={pay}>Take {naira(total)}</Button>
              {visit.status === 'awaiting_payment' && summary.balanceKobo > 0 && (
                <Button className="mt-2 w-full" variant="ghost" icon={DoorOpen} onClick={() => { setLeave(true); setReason(''); }}>Patient leaving without paying in full</Button>
              )}
            </Card>
          ) : (
            <Card><div className="flex flex-col items-center gap-2 py-4 text-center"><SuccessCheck /><p className="font-semibold">Nothing owed</p><p className="text-sm text-slate-500">This visit is {visit.status === 'closed' ? 'closed' : 'still with the doctor'}.</p></div></Card>
          )}
          {summary.payments.length > 0 && (
            <Card title="Payments">
              <ul className="space-y-2 text-sm">
                {summary.payments.map((p) => (
                  <li key={p._id} className="flex items-center gap-2">
                    <span className="flex-1">{dateTime(p.createdAt)} · {p.method.toUpperCase()} · <b className="money">{naira(p.amountKobo)}</b>
                      <span className="block text-xs text-slate-500">{p.receiptNo || (p.receiptStatus === 'pending' ? 'Receipt number pending' : p.paymentNo)}</span></span>
                    {p.receiptStatus === 'pending' && <Badge color="amber">Receipt pending</Badge>}
                    <IconButton icon={Printer} label="Print receipt" onClick={() => setReceipt(p._id)} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
      <Receipt paymentId={receipt} onClose={() => setReceipt(null)} />
      <Modal open={leave} onClose={() => setLeave(false)} title="Leaving with a balance" size="sm" guardChanges={false}
        footer={<><Button variant="secondary" onClick={() => setLeave(false)}>Back</Button><Button loading={busy} disabled={!reason.trim()} onClick={close}>Close the bill</Button></>}>
        <p className="mb-3 text-sm text-slate-600">The patient still owes <b>{naira(summary.balanceKobo)}</b>. It stays on their record and reception sees it next time.{pending.length > 0 && ' Anything not yet collected is cancelled.'}</p>
        <Field label="Reason"><input className="input" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Will pay on Friday" /></Field>
      </Modal>
    </div>
  );
}
