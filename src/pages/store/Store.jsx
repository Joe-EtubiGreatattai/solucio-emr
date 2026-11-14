import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, Boxes, History, Pencil, Plus, Search, SlidersHorizontal, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch.js';
import { useLive } from '../../lib/live.js';
import { date, dateTime, toKobo } from '../../lib/format.js';
import { Badge, Button, Card, ErrorNote, Field, IconButton, Modal, MoneyInput, PageHeader, Spinner, Tabs } from '../../components/ui.jsx';
import { Link } from 'react-router-dom';

export default function Store() {
  const { data, loading, error, reload } = useFetch('/store', { initial: [] });
  const { data: alerts, reload: reloadAlerts } = useFetch('/store/alerts?status=open', { initial: [] });
  const { data: drugs } = useFetch('/store/drugs', { initial: [] });
  const refresh = useCallback(() => { reload(); reloadAlerts(); }, [reload, reloadAlerts]);
  useLive(['store', 'transfer'], refresh);
  const [tab, setTab] = useState(() => (new URLSearchParams(window.location.search).get('tab') === 'alerts' ? 'alerts' : 'all'));
  const [query, setQuery] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [adjustBatch, setAdjustBatch] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);
  const alertCount = alerts.length;
  const list = useMemo(() => data.filter((item) => !query || `${item.name} ${item.code} ${item.category || ''}`.toLowerCase().includes(query.toLowerCase())), [data, query]);
  const totals = data.reduce((sum, item) => sum + item.onHand, 0);

  return (
    <div>
      <PageHeader title="General Store" subtitle="Central stock for medicines and medical supplies. Transfers to Pharmacy top up dispensing stock."
        actions={<><Link to="/store/transfers" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"><ArrowLeftRight className="h-4 w-4" /> Transfers</Link><Button variant="secondary" icon={Truck} onClick={() => setReceiveOpen(true)}>Receive purchase</Button><Button icon={Plus} onClick={() => setEditItem({ kind: 'drug', code: '', name: '', category: '', unit: 'tablet', priceItem: '', reorderLevel: 0, active: true })}>Add item</Button></>} />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat icon={Boxes} label="Items" value={data.length} />
        <Stat icon={SlidersHorizontal} label="Units on hand" value={totals.toLocaleString()} />
        <Stat icon={AlertTriangle} label="Open alerts" value={alertCount} warning={alertCount > 0} />
      </div>

      <Card bodyClass="p-0">
        <div className="flex flex-wrap items-center gap-3 px-4 pt-2">
          <Tabs value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All items', count: data.length }, { value: 'alerts', label: 'Alerts', count: alertCount }]} />
          {tab === 'all' && <div className="relative ml-auto w-full sm:w-72"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input !rounded-xl !py-2 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items" aria-label="Search store items" /></div>}
        </div>
        {error && <div className="p-4"><ErrorNote>{error}</ErrorNote></div>}
        {loading ? <Spinner /> : tab === 'all' ? (
          <table className="table">
            <thead><tr><th>Item</th><th>Type</th><th className="text-right">On hand</th><th>Batch / expiry</th><th /></tr></thead>
            <tbody>
              {list.map((item) => (
                <tr key={item._id}>
                  <td data-label=""><span className="font-semibold">{item.name}</span><span className="block text-xs text-slate-500">{item.code}{item.priceItem?.code ? ` · ${item.priceItem.code}` : ''} · reorder at {item.reorderLevel || 0} {item.unit}</span></td>
                  <td data-label="Type"><Badge color={item.kind === 'drug' ? 'blue' : 'teal'}>{item.kind === 'drug' ? 'Drug' : 'Supply'}</Badge>{item.category && <span className="ml-1 text-xs text-slate-500">{item.category}</span>}</td>
                  <td data-label="On hand" className="text-right"><StockLevel onHand={item.onHand} reorder={item.reorderLevel} unit={item.unit} /></td>
                  <td data-label="Batch / expiry">{item.batches.map((batch) => <button key={batch._id} type="button" onClick={() => setAdjustBatch({ ...batch, itemName: item.name, unit: item.unit })} className={`mb-1 mr-1 inline-flex rounded-lg px-2 py-1 text-xs transition ${new Date(batch.expiry) <= new Date() ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700 hover:bg-brand-50'}`} title="Select batch to adjust">{batch.batchNo} · {batch.qtyOnHand} · exp {date(batch.expiry)}</button>)}</td>
                  <td data-label="Actions" className="whitespace-nowrap"><IconButton icon={Pencil} label={`Edit ${item.name}`} onClick={() => setEditItem(item)} /><IconButton icon={History} label={`History for ${item.name}`} onClick={() => setHistoryItem(item)} /></td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan="5" className="py-10 text-center text-sm text-slate-500">No store items match that search.</td></tr>}
            </tbody>
          </table>
        ) : (
          <AlertsPanel onResolved={refresh} />
        )}
      </Card>

      {editItem && <ItemModal item={editItem} drugs={drugs} onClose={() => setEditItem(null)} onDone={refresh} />}
      {receiveOpen && <ReceiveModal items={data} onClose={() => setReceiveOpen(false)} onDone={refresh} />}
      {adjustBatch && <AdjustModal batch={adjustBatch} onClose={() => setAdjustBatch(null)} onDone={refresh} />}
      {historyItem && <HistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />}
    </div>
  );
}

function Stat({ icon: Icon, label, value, warning = false }) {
  return <div className={`flex items-center gap-3 rounded-2xl border p-4 ${warning ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-white'}`}><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${warning ? 'bg-amber-100 text-amber-800' : 'bg-brand-50 text-brand-700'}`}><Icon size={18} /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="text-xl font-bold text-slate-900">{value}</p></div></div>;
}

function StockLevel({ onHand, reorder, unit }) {
  const low = reorder > 0 && onHand <= reorder;
  const color = onHand <= 0 ? 'text-rose-700' : low ? 'text-amber-700' : 'text-emerald-700';
  return <span className={`whitespace-nowrap font-semibold ${color}`}>{onHand.toLocaleString()} <span className="text-xs font-normal text-slate-500">{unit}</span>{onHand <= 0 ? <Badge color="red" className="ml-2">Out</Badge> : low ? <Badge color="amber" className="ml-2">Low</Badge> : null}</span>;
}

const ALERT_META = {
  out: ['Out of stock', 'red'], low: ['Running low', 'amber'],
  expiring: ['Expiring soon', 'amber'], expired: ['Expired', 'red'],
};

function AlertsPanel({ onResolved }) {
  const [view, setView] = useState('open');
  const { data: alerts, loading, reload } = useFetch(`/store/alerts?status=${view}`, { initial: [] });
  const [resolve, setResolve] = useState(null);
  return (
    <div className="p-4 sm:p-5">
      <div className="mb-3"><Tabs value={view} onChange={setView} tabs={[{ value: 'open', label: 'Open' }, { value: 'resolved', label: 'Resolved' }]} /></div>
      {loading ? <Spinner /> : !alerts.length ? (
        <p className="py-8 text-center text-sm text-slate-500">{view === 'open' ? 'No open alerts. Everything is in order.' : 'Nothing resolved yet.'}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {alerts.map((a) => {
            const [label, color] = ALERT_META[a.kind] || [a.kind, 'slate'];
            return (
              <li key={a._id} className="flex flex-wrap items-center gap-3 py-3">
                <Badge color={color}>{label}</Badge>
                <span className="min-w-0 flex-1 text-sm text-slate-800">{a.detail || a.name}
                  {a.status === 'resolved' && <span className="block text-xs text-slate-500">Resolved{a.resolvedBy?.name ? ` by ${a.resolvedBy.name}` : ''}{a.note ? ` · ${a.note}` : ''}</span>}
                </span>
                {a.status === 'open' && <Button size="sm" variant="secondary" onClick={() => setResolve(a)}>Resolve</Button>}
              </li>
            );
          })}
        </ul>
      )}
      {resolve && <ResolveModal alert={resolve} onClose={() => setResolve(null)} onDone={() => { reload(); onResolved?.(); }} />}
    </div>
  );
}

function ResolveModal({ alert, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function go() {
    setBusy(true); setError('');
    try { await api(`/store/alerts/${alert._id}/resolve`, { method: 'POST', body: { note } }); toast.success('Alert resolved'); onDone(); onClose(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title="Resolve alert" size="sm" guardChanges={false}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={!note.trim()} onClick={go}>Resolve</Button></>}>
      <p className="mb-3 text-sm text-slate-600">{alert.detail || alert.name}</p>
      <Field label="What was done?"><input className="input" autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Reordered from supplier, removed expired stock" /></Field>
      <div className="mt-2"><ErrorNote>{error}</ErrorNote></div>
    </Modal>
  );
}

function ItemModal({ item, drugs, onClose, onDone }) {
  const [form, setForm] = useState({ code: item.code || '', name: item.name || '', kind: item.kind || 'drug', category: item.category || '', unit: item.unit || 'unit', priceItem: item.priceItem?._id || item.priceItem || '', reorderLevel: String(item.reorderLevel ?? 0), active: item.active ?? true });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const body = { ...form, reorderLevel: Number(form.reorderLevel), priceItem: form.kind === 'drug' ? form.priceItem : undefined };
      if (item._id) await api(`/store/items/${item._id}`, { method: 'PATCH', body });
      else await api('/store/items', { method: 'POST', body });
      toast.success(item._id ? 'Item updated' : 'Store item added'); onDone(); onClose();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Modal open onClose={onClose} title={item._id ? `Edit ${item.name}` : 'Add store item'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="store-item-form" loading={busy}>Save item</Button></>}>
    <form id="store-item-form" onSubmit={save} className="grid gap-3 sm:grid-cols-2">
      <Field label="Item type"><select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, priceItem: '' })}><option value="drug">Drug (links to EMR formulary)</option><option value="supply">Medical supply</option></select></Field>
      <Field label="Item code"><input className="input uppercase" required maxLength={40} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. GS-PARA500" /></Field>
      <Field label="Name"><input className="input" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      {form.kind === 'drug' ? <Field label="Linked EMR drug"><select className="input" required value={form.priceItem} onChange={(e) => setForm({ ...form, priceItem: e.target.value })}><option value="">Choose existing drug…</option>{drugs.map((drug) => <option key={drug._id} value={drug._id}>{drug.code} · {drug.name}</option>)}</select></Field> : <Field label="Supply category"><input className="input" maxLength={120} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. PPE" /></Field>}
      <Field label="Unit"><input className="input" required maxLength={120} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="tablet, box, pack…" /></Field>
      <Field label="Reorder level"><input className="input money" required type="number" min="0" step="1" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} /></Field>
      {item._id && <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4 accent-brand-700" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Active item</label>}
      <div className="sm:col-span-2"><ErrorNote>{error}</ErrorNote></div>
    </form>
  </Modal>;
}

function ReceiveModal({ items, onClose, onDone }) {
  const [form, setForm] = useState({ storeItemId: '', batchNo: '', expiry: '', qty: '', cost: '', supplier: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const item = items.find((entry) => entry._id === form.storeItemId);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api('/store/receive', { method: 'POST', body: { ...form, qty: Number(form.qty), costKobo: toKobo(form.cost) } });
      toast.success(`Received ${form.qty} ${item?.unit || 'units'} of ${item?.name}`); onDone(); onClose();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Modal open onClose={onClose} title="Receive a supplier purchase" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="store-receive-form" loading={busy}>Receive stock</Button></>}>
    <form id="store-receive-form" onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <Field label="Store item" className="sm:col-span-2"><select className="input" required value={form.storeItemId} onChange={(e) => setForm({ ...form, storeItemId: e.target.value })}><option value="">Choose item…</option>{items.map((entry) => <option key={entry._id} value={entry._id}>{entry.name} · {entry.code}</option>)}</select></Field>
      <Field label="Supplier batch number"><input className="input" required maxLength={100} value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} /></Field>
      <Field label="Expiry"><input className="input" type="date" required value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} /></Field>
      <Field label={`Quantity${item ? ` (${item.unit})` : ''}`}><input className="input money" type="number" min="1" step="1" required value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></Field>
      <Field label="Cost price per unit"><MoneyInput value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></Field>
      <Field label="Supplier" className="sm:col-span-2"><input className="input" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></Field>
      <div className="sm:col-span-2"><ErrorNote>{error}</ErrorNote></div>
    </form>
  </Modal>;
}

function AdjustModal({ batch, onClose, onDone }) {
  const [qty, setQty] = useState(''); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('/store/adjust', { method: 'POST', body: { batch: batch._id, qty: Number(qty), reason } }); toast.success('Batch adjusted'); onDone(); onClose(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Modal open onClose={onClose} title={`Adjust ${batch.itemName}`} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="store-adjust-form" loading={busy} disabled={!Number(qty) || !reason.trim()}>Adjust batch</Button></>}>
    <form id="store-adjust-form" onSubmit={submit} className="space-y-3"><p className="text-sm text-slate-600">Batch {batch.batchNo} · {batch.qtyOnHand} {batch.unit} · expires {date(batch.expiry)}.</p><Field label="Add (+) or remove (−)" hint="Enter a whole number; negative values remove stock."><input className="input money" type="number" step="1" required value={qty} onChange={(e) => setQty(e.target.value)} /></Field><Field label="Reason"><select className="input" required value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Choose…</option>{['Damaged', 'Expired', 'Count correction', 'Returned to supplier', 'Found', 'Other'].map((option) => <option key={option}>{option}</option>)}</select></Field><ErrorNote>{error}</ErrorNote></form>
  </Modal>;
}

function HistoryModal({ item, onClose }) {
  const { data, loading } = useFetch(`/store/${item._id}/movements`, { initial: [] });
  const types = { received: 'Purchase received', transferred: 'Transferred to Pharmacy', adjusted: 'Adjusted' };
  return <Modal open onClose={onClose} title={`${item.name}: movement history`} size="lg" guardChanges={false}>
    {loading ? <Spinner /> : !data.length ? <p className="py-6 text-center text-sm text-slate-500">No movement history yet.</p> : <table className="table"><thead><tr><th>When</th><th>Movement</th><th className="text-right">Qty</th><th>Batch</th><th>By</th></tr></thead><tbody>{data.map((movement) => <tr key={movement._id}><td data-label="When">{dateTime(movement.createdAt)}</td><td data-label="Movement">{types[movement.type] || movement.type}{movement.reason ? ` · ${movement.reason}` : ''}{movement.transfer?.ref ? <span className="block text-xs text-slate-500">{movement.transfer.ref}</span> : null}</td><td data-label="Qty" className={`money text-right font-semibold ${movement.qty < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{movement.qty > 0 ? `+${movement.qty}` : movement.qty}</td><td data-label="Batch">{movement.batch?.batchNo || '—'}</td><td data-label="By">{movement.by?.name || '—'}</td></tr>)}</tbody></table>}
  </Modal>;
}
