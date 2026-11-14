import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { date, naira } from '../../lib/format';
import { newRequestId } from '../../lib/id';
import { Badge, Button, Card, ErrorNote, Field, Modal, Spinner } from '../../components/ui';
import PatientBanner from '../../components/PatientBanner';

export default function Dispense() {
  const { visitId } = useParams();
  const { data: visit } = useFetch(`/visits/${visitId}`);
  const { data: orders, loading, reload } = useFetch(`/pharmacy/orders/${visitId}`, { initial: [] });
  useLive(['stock'], useCallback(() => reload(), [reload]));
  const [ret, setRet] = useState(null);
  if (loading || !visit) return <Spinner />;
  return (
    <div>
      <Link to="/pharmacy" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Prescriptions</Link>
      <PatientBanner patient={visit.patient} visit={visit} />
      <div className="space-y-3">
        {orders.map((o) => <OrderRow key={o._id} order={o} onDone={reload} onReturn={setRet} />)}
      </div>
      <ReturnModal dispense={ret} onClose={() => setRet(null)} onDone={reload} />
    </div>
  );
}

function OrderRow({ order, onDone, onReturn }) {
  const remaining = order.qty - order.qtyDispensed;
  const open = ['requested', 'partly_dispensed'].includes(order.status);
  const [qty, setQty] = useState(String(Math.min(remaining, order.onHand)));
  const [reason, setReason] = useState('');
  const [requestId, setRequestId] = useState(() => newRequestId());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setQty(String(Math.max(0, Math.min(remaining, order.onHand)))); }, [remaining, order.onHand]);
  const less = Number(qty) < remaining;

  async function dispense() {
    setBusy(true);
    setError('');
    try {
      await api('/pharmacy/dispense', { method: 'POST', body: { orderId: order._id, qty: Number(qty), reason: less ? reason : undefined, requestId } });
      toast.success(`Dispensed ${qty} × ${order.priceItem?.name}`);
      setRequestId(newRequestId());
      onDone();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <Card bodyClass="p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{order.priceItem?.name}</p>
          <p className="text-sm text-slate-500">{[order.dose, order.frequency, order.durationDays && `${order.durationDays} days`].filter(Boolean).join(' · ')}{order.instructions ? ` · ${order.instructions}` : ''} · by {order.orderedBy?.name}</p>
          <p className="mt-1 text-sm">Prescribed <b>{order.qty}</b>{order.qtyDispensed > 0 && <> · given <b>{order.qtyDispensed}</b></>} · in stock <b className={order.onHand < remaining ? 'text-rose-700' : ''}>{order.onHand}</b> · {naira(order.priceItem?.cashPriceKobo)} each</p>
          {order.nextBatch && open && <p className="text-xs text-slate-500">Will use batch {order.nextBatch.batchNo}, expires {date(order.nextBatch.expiry)}</p>}
        </div>
        {!open && <Badge color={order.status === 'cancelled' ? 'slate' : 'green'}>{order.status === 'cancelled' ? 'Cancelled' : 'Given'}</Badge>}
      </div>
      {open && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Field label="Quantity to give"><input className="input money !w-28" type="number" min="1" max={remaining} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          {less && <Field label="Why less than prescribed?" className="min-w-56 flex-1"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Not enough in stock; patient will buy outside" /></Field>}
          <Button loading={busy} disabled={!Number(qty) || (less && !reason.trim())} onClick={dispense}>Dispense</Button>
        </div>
      )}
      {order.dispenses.map((d) => (
        <p key={d._id} className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          Gave {d.qty}{d.returnedQty ? ` (returned ${d.returnedQty})` : ''} from {d.batches.map((b) => b.batchNo).join(', ')}
          {d.qty - (d.returnedQty || 0) > 0 && <button type="button" className="inline-flex items-center gap-1 text-brand-700 hover:underline" onClick={() => onReturn(d)}><Undo2 className="h-3 w-3" />Return</button>}
        </p>
      ))}
      <div className="mt-2"><ErrorNote>{error}</ErrorNote></div>
    </Card>
  );
}

function ReturnModal({ dispense, onClose, onDone }) {
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setQty(''); setReason(''); setError(''); }, [dispense?._id]);
  if (!dispense) return null;
  const max = dispense.qty - (dispense.returnedQty || 0);
  async function go() {
    setBusy(true);
    try { await api(`/pharmacy/dispenses/${dispense._id}/return`, { method: 'POST', body: { qty: Number(qty), reason } }); toast.success('Returned to stock and taken off the bill'); onDone(); onClose(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={`Return ${dispense.name}`} size="sm" guardChanges={false}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={!qty || !reason.trim()} onClick={go}>Return</Button></>}>
      <div className="space-y-3">
        <Field label={`How many (up to ${max})`}><input className="input money" type="number" min="1" max={max} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
        <Field label="Reason"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Unopened, patient didn’t need it" /></Field>
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Modal>
  );
}
