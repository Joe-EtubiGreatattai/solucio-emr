import { useCallback, useState } from 'react';
import { ArrowLeftRight, Plus, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch.js';
import { useLive } from '../../lib/live.js';
import { date, dateTime } from '../../lib/format.js';
import { Badge, Button, Card, ErrorNote, Field, Modal, PageHeader, Spinner } from '../../components/ui.jsx';

const STATUS = { in_transit: ['In transit', 'amber'], received: ['Received', 'green'], cancelled: ['Cancelled', 'slate'] };

export default function Transfers() {
  const { data: transfers, loading, reload } = useFetch('/store/transfers', { initial: [] });
  const { data: stock, reload: reloadStock } = useFetch('/store', { initial: [] });
  const refresh = useCallback(() => { reload(); reloadStock(); }, [reload, reloadStock]);
  useLive(['store', 'transfer'], refresh);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader title="Store transfers" subtitle="Send General Store stock to Pharmacy. Store quantities are reserved when a transfer is created."
        actions={<><Link to="/store" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">General Store</Link><Button icon={Send} onClick={() => setCreateOpen(true)}>Create transfer</Button></>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2"><Summary label="In transit" value={transfers.filter((transfer) => transfer.status === 'in_transit').length} tone="amber" /><Summary label="Received" value={transfers.filter((transfer) => transfer.status === 'received').length} tone="green" /></div>
      <Card title="Transfer history" subtitle="Drug transfers replenish Pharmacy dispensing stock when received." bodyClass="p-0">
        {loading ? <Spinner /> : !transfers.length ? <p className="px-5 py-10 text-center text-sm text-slate-500">No transfers yet. Create one to send stock to Pharmacy.</p> : (
          <ul className="divide-y divide-slate-100">
            {transfers.map((transfer) => (
              <li key={transfer._id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><ArrowLeftRight size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{transfer.ref}</p><Badge color={STATUS[transfer.status]?.[1]}>{STATUS[transfer.status]?.[0] || transfer.status}</Badge></div>
                    <p className="mt-0.5 text-xs text-slate-500">Created {dateTime(transfer.createdAt)}{transfer.createdBy?.name ? ` by ${transfer.createdBy.name}` : ''}{transfer.receivedAt ? ` · received ${dateTime(transfer.receivedAt)}` : ''}{transfer.receivedBy?.name ? ` by ${transfer.receivedBy.name}` : ''}</p>
                    <ul className="mt-3 space-y-2 text-sm">{transfer.items.map((item, index) => <li key={`${item.storeItem}-${index}`}><span className="font-medium text-slate-800">{item.name}</span><span className="text-slate-600"> · {item.qty} {item.unit} · {item.kind === 'drug' ? 'Drug' : 'Supply'}</span>{item.batches?.length > 0 && <span className="block text-xs text-slate-500">{item.batches.map((batch) => `${batch.batchNo}: ${batch.qty} · exp ${date(batch.expiry)}`).join(' | ')}</span>}</li>)}</ul>
                    {transfer.note && <p className="mt-2 text-xs text-slate-500">Note: {transfer.note}</p>}
                    {transfer.receiveNote && <p className="mt-1 text-xs text-slate-500">Pharmacy note: {transfer.receiveNote}</p>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {createOpen && <CreateTransferModal stock={stock} onClose={() => setCreateOpen(false)} onDone={() => { refresh(); setCreateOpen(false); }} />}
    </div>
  );
}

function Summary({ label, value, tone }) {
  return <div className={`rounded-2xl border p-4 ${tone === 'amber' ? 'border-amber-200 bg-amber-50/60' : 'border-emerald-200 bg-emerald-50/60'}`}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>;
}

function CreateTransferModal({ stock, onClose, onDone }) {
  const [items, setItems] = useState([{ storeItemId: '', qty: '' }]);
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const transfer = await api('/store/transfers', { method: 'POST', body: { items: items.filter((item) => item.storeItemId && item.qty).map((item) => ({ ...item, qty: Number(item.qty) })), note } });
      toast.success(`${transfer.ref} sent to Pharmacy`); onDone();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const setRow = (index, key, value) => setItems((current) => current.map((row, i) => i === index ? { ...row, [key]: value } : row));
  return <Modal open onClose={onClose} title="Create Pharmacy transfer" size="lg" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="store-transfer-form" icon={Send} loading={busy}>Send transfer</Button></>}>
    <form id="store-transfer-form" onSubmit={submit} className="space-y-4">
      <p className="text-sm leading-6 text-slate-600">Choose the item quantities to send. The General Store stock is reduced now; Pharmacy must receive the transfer before drugs are added to dispensing stock.</p>
      <div className="space-y-3">{items.map((row, index) => {
        const selected = stock.find((item) => item._id === row.storeItemId);
        return <div key={index} className="grid items-end gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
          <Field label="Store item"><select className="input" required value={row.storeItemId} onChange={(e) => setRow(index, 'storeItemId', e.target.value)}><option value="">Choose item…</option>{stock.filter((item) => item.onHand > 0).map((item) => <option key={item._id} value={item._id}>{item.name} · {item.onHand} {item.unit} available</option>)}</select></Field>
          <Field label={`Quantity${selected ? ` · ${selected.unit}` : ''}`}><input className="input money" type="number" min="1" max={selected?.onHand} step="1" required value={row.qty} onChange={(e) => setRow(index, 'qty', e.target.value)} /></Field>
          {items.length > 1 ? <Button variant="danger-soft" size="sm" type="button" onClick={() => setItems(items.filter((_, i) => i !== index))}>Remove</Button> : <span />}
        </div>;
      })}</div>
      <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={() => setItems([...items, { storeItemId: '', qty: '' }])}>Add another item</Button>
      <Field label="Transfer note"><textarea className="input" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional hand-off instructions" /></Field>
      <ErrorNote>{error}</ErrorNote>
    </form>
  </Modal>;
}
