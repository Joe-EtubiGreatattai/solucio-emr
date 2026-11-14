import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, History, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { date, dateTime } from '../../lib/format';
import { Badge, Button, Card, ErrorNote, Field, IconButton, Modal, PageHeader, Spinner, Tabs } from '../../components/ui';

export default function Stock() {
  const { data, loading, reload } = useFetch('/stock', { initial: [] });
  const { data: alerts, reload: reloadAlerts } = useFetch('/stock/alerts', { initial: { low: [], expiringSoon: [], expired: [] } });
  useLive(['stock'], useCallback(() => { reload(); reloadAlerts(); }, [reload, reloadAlerts]));
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [adjust, setAdjust] = useState(null);
  const [history, setHistory] = useState(null);
  const [count, setCount] = useState(false);
  const list = useMemo(() => data.filter((d) => !q || `${d.name} ${d.code}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const alertCount = alerts.low.length + alerts.expiringSoon.length + alerts.expired.length;

  return (
    <div>
      <PageHeader title="Stock" subtitle="What’s on the shelf, batch by batch. Expired stock can’t be dispensed."
        actions={<Button variant="secondary" icon={SlidersHorizontal} onClick={() => setCount(true)}>Stock count</Button>} />
      <Card bodyClass="p-0">
        <div className="flex flex-wrap items-center gap-3 px-4 pt-2">
          <Tabs value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All drugs', count: data.length }, { value: 'alerts', label: 'Alerts', count: alertCount }]} />
          {tab === 'all' && <input className="input ml-auto !w-64" placeholder="Search drugs" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search drugs" />}
        </div>
        {loading ? <Spinner /> : tab === 'all' ? (
          <table className="table">
            <thead><tr><th>Drug</th><th className="text-right">In stock</th><th>Batches</th><th /></tr></thead>
            <tbody>
              {list.map((d) => (
                <tr key={d._id}>
                  <td data-label=""><span className="font-semibold">{d.name}</span><span className="block text-xs text-slate-500">{d.code} · reorder at {d.drug?.reorderLevel || 0}</span></td>
                  <td data-label="In stock" className="money text-right"><span className={d.onHand <= (d.drug?.reorderLevel || 0) ? 'font-bold text-rose-700' : 'font-semibold'}>{d.onHand}</span></td>
                  <td data-label="Batches">
                    {d.batches.map((b) => (
                      <button key={b._id} type="button" onClick={() => setAdjust({ ...b, drug: d.name })} className="mb-1 mr-1 inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-xs hover:bg-brand-50" title="Adjust this batch">
                        {b.batchNo} · {b.qtyOnHand} · exp {date(b.expiry)}
                      </button>
                    ))}
                  </td>
                  <td data-label=""><IconButton icon={History} label="Stock history" onClick={() => setHistory(d)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="space-y-4 p-4">
            <AlertList title="Running low" color="amber" rows={alerts.low.map((a) => `${a.name}: ${a.onHand} left (reorder at ${a.reorderLevel})`)} />
            <AlertList title="Expiring within 90 days" color="amber" rows={alerts.expiringSoon.map((a) => `${a.name}, batch ${a.batchNo}: ${a.qtyOnHand} expire ${date(a.expiry)}`)} />
            <AlertList title="Expired (can’t be dispensed; adjust them out)" color="red" rows={alerts.expired.map((a) => `${a.name}, batch ${a.batchNo}: ${a.qtyOnHand} expired ${date(a.expiry)}`)} />
          </div>
        )}
      </Card>
      <AdjustModal batch={adjust} onClose={() => setAdjust(null)} onDone={reload} />
      <HistoryModal item={history} onClose={() => setHistory(null)} />
      <CountModal open={count} drugs={data} onClose={() => setCount(false)} onDone={reload} />
    </div>
  );
}

function AlertList({ title, rows, color }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold"><AlertTriangle className={`h-4 w-4 ${color === 'red' ? 'text-rose-600' : 'text-amber-600'}`} />{title} <Badge color={color}>{rows.length}</Badge></p>
      {rows.length ? <ul className="ml-6 list-disc text-sm text-slate-700">{rows.map((r) => <li key={r}>{r}</li>)}</ul> : <p className="ml-6 text-sm text-slate-500">None.</p>}
    </div>
  );
}

function AdjustModal({ batch, onClose, onDone }) {
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!batch) return null;
  async function go() {
    setBusy(true);
    setError('');
    try { await api('/stock/adjust', { method: 'POST', body: { batch: batch._id, qty: Number(qty), reason } }); toast.success('Adjusted'); onDone(); onClose(); setQty(''); setReason(''); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={`Adjust ${batch.drug}`} size="sm" guardChanges={false}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={!Number(qty) || !reason.trim()} onClick={go}>Adjust</Button></>}>
      <p className="mb-3 text-sm text-slate-600">Batch {batch.batchNo}: {batch.qtyOnHand} on the shelf.</p>
      <div className="space-y-3">
        <Field label="Add (+) or remove (−)" hint="e.g. −5 for 5 damaged tablets"><input className="input money" type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
        <Field label="Reason"><select className="input" value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Choose…</option>{['Damaged', 'Expired', 'Count correction', 'Returned to supplier', 'Found'].map((r) => <option key={r}>{r}</option>)}</select></Field>
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Modal>
  );
}

function HistoryModal({ item, onClose }) {
  const { data, loading } = useFetch(item ? `/stock/${item._id}/movements` : '/stock/alerts', { initial: [] });
  if (!item) return null;
  const TYPE = { received: 'Received', dispensed: 'Dispensed', returned: 'Returned', adjusted: 'Adjusted' };
  return (
    <Modal open onClose={onClose} title={`${item.name}: history`} size="lg" guardChanges={false}>
      {loading || !Array.isArray(data) ? <Spinner /> : (
        <table className="table">
          <thead><tr><th>When</th><th>What</th><th className="text-right">Qty</th><th>Batch</th><th>By</th></tr></thead>
          <tbody>{data.map((m) => (
            <tr key={m._id}><td data-label="When">{dateTime(m.createdAt)}</td><td data-label="What">{TYPE[m.type]}{m.reason ? ` · ${m.reason}` : ''}</td>
              <td data-label="Qty" className={`money text-right font-semibold ${m.qty < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{m.qty > 0 ? `+${m.qty}` : m.qty}</td>
              <td data-label="Batch">{m.batch?.batchNo}</td><td data-label="By">{m.by?.name}</td></tr>
          ))}</tbody>
        </table>
      )}
    </Modal>
  );
}

function CountModal({ open, drugs, onClose, onDone }) {
  const [counts, setCounts] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const batches = drugs.flatMap((d) => d.batches.map((b) => ({ ...b, drug: d.name })));
  async function go() {
    setBusy(true);
    setError('');
    try {
      const body = { counts: Object.entries(counts).filter(([, v]) => v !== '').map(([batch, counted]) => ({ batch, counted: Number(counted) })) };
      const r = await api('/stock/take', { method: 'POST', body });
      toast.success(`${r.adjusted} batch${r.adjusted === 1 ? '' : 'es'} corrected`);
      setCounts({});
      onDone();
      onClose();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal open={open} onClose={onClose} title="Stock count" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={go}>Save counts</Button></>}>
      <p className="mb-3 text-sm text-slate-600">Count what’s on the shelf. Leave a box empty to skip that batch. Differences are recorded as adjustments with the reason “Stock count”.</p>
      <table className="table">
        <thead><tr><th>Drug</th><th>Batch</th><th className="text-right">System says</th><th className="text-right">Counted</th></tr></thead>
        <tbody>{batches.map((b) => (
          <tr key={b._id}><td data-label="">{b.drug}</td><td data-label="Batch">{b.batchNo}</td><td data-label="System says" className="money text-right">{b.qtyOnHand}</td>
            <td data-label="Counted"><input className="input money !w-24 text-right" type="number" min="0" value={counts[b._id] ?? ''} onChange={(e) => setCounts({ ...counts, [b._id]: e.target.value })} /></td></tr>
        ))}</tbody>
      </table>
      <ErrorNote>{error}</ErrorNote>
    </Modal>
  );
}
