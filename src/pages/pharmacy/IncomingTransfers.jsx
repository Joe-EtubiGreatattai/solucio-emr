import { useCallback, useState } from 'react';
import { ArrowDownToLine, ArrowLeftRight, PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch.js';
import { useLive } from '../../lib/live.js';
import { date, dateTime } from '../../lib/format.js';
import { Badge, Button, Card, ErrorNote, Field, Modal, PageHeader, Spinner } from '../../components/ui.jsx';

export default function IncomingTransfers() {
  const { data, loading, error, reload } = useFetch('/store/transfers/incoming', { initial: [] });
  const refresh = useCallback(() => reload(), [reload]);
  useLive(['transfer', 'stock'], refresh);
  const [receiving, setReceiving] = useState(null);
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [formError, setFormError] = useState('');

  async function receive(event) {
    event.preventDefault(); if (!receiving) return;
    setBusy(true); setFormError('');
    try {
      const transfer = await api(`/store/transfers/${receiving._id}/receive`, { method: 'POST', body: { receiveNote: note } });
      toast.success(`${transfer.ref} received. Drug stock is available for dispensing.`);
      setReceiving(null); setNote(''); reload();
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Incoming transfers" subtitle="Confirm General Store deliveries. Drug items are added to pharmacy dispensing stock after receipt." />
      <Card title="Awaiting receipt" subtitle="Confirm the items and quantities before receiving." bodyClass="p-0">
        {error && <div className="p-4"><ErrorNote>{error}</ErrorNote></div>}
        {loading ? <Spinner /> : !data.length ? <div className="px-5 py-10 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><PackageCheck size={20} /></span><p className="mt-3 font-semibold text-slate-800">No incoming transfers</p><p className="mt-1 text-sm text-slate-500">New General Store hand-offs will appear here.</p></div> : (
          <ul className="divide-y divide-slate-100">
            {data.map((transfer) => (
              <li key={transfer._id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><ArrowLeftRight size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{transfer.ref}</p><Badge color="amber">In transit</Badge></div>
                    <p className="mt-0.5 text-xs text-slate-500">Sent {dateTime(transfer.createdAt)}{transfer.createdBy?.name ? ` by ${transfer.createdBy.name}` : ''}</p>
                    <ul className="mt-3 space-y-2 text-sm">{transfer.items.map((item, index) => <li key={`${item.storeItem}-${index}`}><span className="font-medium text-slate-800">{item.name}</span><span className="text-slate-600"> · {item.qty} {item.unit} · <Badge color={item.kind === 'drug' ? 'blue' : 'teal'}>{item.kind === 'drug' ? 'Drug' : 'Supply'}</Badge></span>{item.batches?.length > 0 && <span className="block text-xs text-slate-500">{item.batches.map((batch) => `${batch.batchNo}: ${batch.qty} · exp ${date(batch.expiry)}`).join(' | ')}</span>}</li>)}</ul>
                    {transfer.note && <p className="mt-2 text-xs text-slate-500">Store note: {transfer.note}</p>}
                  </div>
                  <Button icon={ArrowDownToLine} onClick={() => { setReceiving(transfer); setNote(''); setFormError(''); }}>Receive transfer</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {receiving && <Modal open onClose={() => setReceiving(null)} title={`Receive ${receiving.ref}`} footer={<><Button variant="secondary" onClick={() => setReceiving(null)} disabled={busy}>Cancel</Button><Button type="submit" form="receive-transfer-form" icon={PackageCheck} loading={busy}>Confirm received</Button></>}>
        <form id="receive-transfer-form" onSubmit={receive} className="space-y-4">
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">{receiving.items.map((item, index) => <li key={`${item.storeItem}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"><span><span className="font-semibold text-slate-800">{item.name}</span><span className="ml-2 text-slate-500">{item.qty} {item.unit}</span></span><Badge color={item.kind === 'drug' ? 'blue' : 'teal'}>{item.kind}</Badge></li>)}</ul>
          <p className="rounded-xl bg-brand-50 px-3.5 py-3 text-xs leading-5 text-brand-900">Confirm that the transfer arrived. Drug lots will be added to the pharmacy dispensing inventory, preserving their batch and expiry details.</p>
          <Field label="Receipt note"><textarea className="input" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional count or hand-off note" /></Field>
          <ErrorNote>{formError}</ErrorNote>
        </form>
      </Modal>}
    </div>
  );
}
