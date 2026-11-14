import { useCallback, useState } from 'react';
import { Boxes, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { date } from '../../lib/format';
import { Badge, Button, Card, Empty, ErrorNote, Field, Modal, PageHeader, Spinner } from '../../components/ui';

// Supplies the pharmacy holds (transferred in from the General Store). Drugs for dispensing live on the Stock page.
export default function PharmacyStore() {
  const { data, loading, reload } = useFetch('/store?store=pharmacy', { initial: [] });
  useLive(['store', 'transfer', 'stock'], useCallback(() => reload(), [reload]));
  const [use, setUse] = useState(null);
  const [q, setQ] = useState('');
  const list = data.filter((d) => !q || `${d.name} ${d.code}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Pharmacy supplies" subtitle="Consumables the pharmacy holds, transferred in from the General Store. Dispensing drugs are on the Stock page." />
      <Card bodyClass="p-0">
        <div className="flex items-center justify-between px-4 pt-3">
          <p className="text-sm text-slate-500">{list.length} item{list.length === 1 ? '' : 's'}</p>
          <input className="input !w-64" placeholder="Search supplies" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search supplies" />
        </div>
        {loading ? <Spinner /> : !list.length ? (
          <Empty title="No supplies yet">Supplies appear here once the pharmacy receives a transfer from the General Store.</Empty>
        ) : (
          <table className="table">
            <thead><tr><th>Supply</th><th className="text-right">On hand</th><th>Batches</th><th /></tr></thead>
            <tbody>
              {list.map((d) => (
                <tr key={d._id}>
                  <td data-label=""><span className="font-semibold">{d.name}</span><span className="block text-xs text-slate-500">{d.code}{d.reorderLevel ? ` · reorder at ${d.reorderLevel}` : ''}</span></td>
                  <td data-label="On hand" className="text-right"><span className="money font-semibold">{d.onHand}</span> <span className="text-xs text-slate-500">{d.unit}</span>{d.reorderLevel > 0 && d.onHand <= d.reorderLevel && <Badge color={d.onHand <= 0 ? 'red' : 'amber'} className="ml-2">{d.onHand <= 0 ? 'Out' : 'Low'}</Badge>}</td>
                  <td data-label="Batches">{d.batches.map((b) => (
                    <button key={b._id} type="button" onClick={() => setUse({ ...b, name: d.name, unit: d.unit })} className="mb-1 mr-1 inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-xs hover:bg-brand-50" title="Record usage / adjust">
                      {b.batchNo} · {b.qtyOnHand} · exp {date(b.expiry)}
                    </button>
                  ))}</td>
                  <td data-label="" />
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <UseModal batch={use} onClose={() => setUse(null)} onDone={reload} />
    </div>
  );
}

function UseModal({ batch, onClose, onDone }) {
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('Used');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!batch) return null;
  async function go() {
    setBusy(true); setError('');
    try {
      await api('/store/adjust', { method: 'POST', body: { batch: batch._id, qty: -Math.abs(Number(qty)), reason } });
      toast.success('Recorded');
      onDone(); onClose(); setQty('');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={`Use ${batch.name}`} size="sm" guardChanges={false}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={Minus} loading={busy} disabled={!Number(qty) || !reason.trim()} onClick={go}>Record usage</Button></>}>
      <p className="mb-3 text-sm text-slate-600">Batch {batch.batchNo}: {batch.qtyOnHand} {batch.unit} on hand.</p>
      <div className="space-y-3">
        <Field label={`How many ${batch.unit} used`}><input className="input money" type="number" min="1" max={batch.qtyOnHand} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></Field>
        <Field label="Reason"><select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>{['Used', 'Given to a ward', 'Damaged', 'Expired', 'Count correction'].map((r) => <option key={r}>{r}</option>)}</select></Field>
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Modal>
  );
}
