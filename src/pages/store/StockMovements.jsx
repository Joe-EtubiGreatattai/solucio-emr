import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import useFetch from '../../lib/useFetch';
import { dateTime } from '../../lib/format';
import { Button, Card, Empty, PageHeader, Spinner } from '../../components/ui';

const TYPES = [['all', 'All movements'], ['received', 'Received'], ['transferred', 'Transferred'], ['dispensed', 'Dispensed'], ['returned', 'Returned'], ['adjusted', 'Adjusted']];
const STORES = [['', 'Everywhere'], ['general', 'General Store'], ['pharmacy', 'Pharmacy store'], ['dispensing', 'Dispensing']];
const today = () => new Date(Date.now() + 3600000).toISOString().slice(0, 10);
const weekAgo = () => new Date(Date.now() + 3600000 - 7 * 86400000).toISOString().slice(0, 10);

/** The filters + table, embeddable in the admin Reports page. */
export function StockMovementsReport() {
  const [store, setStore] = useState('');
  const [type, setType] = useState('all');
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [q, setQ] = useState('');
  const qs = `store=${store}&type=${type}&from=${from}&to=${to}&q=${encodeURIComponent(q)}`;
  const { data, loading } = useFetch(`/reports/stock-movements?${qs}`, { initial: [] });

  const csv = useMemo(() => () => {
    const rows = [['When', 'Where', 'Movement', 'Item', 'Code', 'Qty', 'By', 'Reason', 'Ref'],
      ...data.map((r) => [dateTime(r.when), r.source, r.type, r.name, r.code, r.qty, r.by || '', r.reason || '', r.ref || ''])];
    const text = rows.map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `stock-movements-${from}-to-${to}.csv`; a.click(); URL.revokeObjectURL(url);
  }, [data, from, to]);

  return (
    <Card bodyClass="p-0">
      <div className="flex flex-wrap items-end gap-2 px-4 pt-4">
        <label className="text-sm">Where<select className="input mt-1 !w-40" value={store} onChange={(e) => setStore(e.target.value)}>{STORES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="text-sm">Movement<select className="input mt-1 !w-40" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="text-sm">From<input type="date" className="input mt-1 !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-sm">To<input type="date" className="input mt-1 !w-auto" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <input className="input !w-48" placeholder="Search item" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search item" />
        <Button variant="secondary" size="sm" icon={Download} className="ml-auto" disabled={!data.length} onClick={csv()}>Export CSV</Button>
      </div>
      {loading ? <Spinner /> : !data.length ? <Empty title="No movements in this range">Widen the dates or change the filters.</Empty> : (
        <table className="table mt-2">
          <thead><tr><th>When</th><th>Where</th><th>Movement</th><th>Item</th><th className="text-right">Qty</th><th>By</th></tr></thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i}>
                <td data-label="When" className="whitespace-nowrap">{dateTime(r.when)}</td>
                <td data-label="Where">{r.source}</td>
                <td data-label="Movement" className="capitalize">{r.type}{r.reason ? <span className="block text-xs text-slate-500">{r.reason}</span> : null}{r.ref ? <span className="block text-xs text-slate-400">{r.ref}</span> : null}</td>
                <td data-label="Item">{r.name}{r.code ? <span className="block text-xs text-slate-400">{r.code}</span> : null}</td>
                <td data-label="Qty" className={`money text-right font-semibold ${r.qty < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{r.qty > 0 ? `+${r.qty}` : r.qty}</td>
                <td data-label="By">{r.by || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

export default function StockMovementsPage() {
  return (
    <div>
      <PageHeader title="Stock movements" subtitle="Every receipt, transfer, dispense and adjustment across the stores and dispensing." />
      <StockMovementsReport />
    </div>
  );
}
