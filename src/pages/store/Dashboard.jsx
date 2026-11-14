import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeftRight, Boxes, Layers, PackageCheck, Wallet } from 'lucide-react';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { naira } from '../../lib/format';
import { Card, MetricGrid, PageHeader, Spinner } from '../../components/ui';

const TYPE = { received: 'Received', transferred: 'Transferred out', adjusted: 'Adjusted' };

export default function StoreDashboard() {
  const { data, loading, reload } = useFetch('/store/dashboard');
  useLive(['store', 'transfer', 'stock'], useCallback(() => reload(), [reload]));
  if (loading || !data) return <Spinner />;
  const a = data.openAlerts || {};
  const alertTotal = (a.out || 0) + (a.low || 0) + (a.expiring || 0) + (a.expired || 0);
  const topCat = Math.max(1, ...data.byCategory.map((c) => c.n));

  const metrics = [
    { label: 'Items in stock', value: data.items, icon: Boxes, tone: 'brand', hint: `${data.byKind.drug || 0} drugs · ${data.byKind.supply || 0} supplies` },
    { label: 'Units on hand', value: data.units.toLocaleString(), icon: Layers, tone: 'blue' },
    { label: 'Stock value', value: naira(data.stockValueKobo, { decimals: 0 }), icon: Wallet, tone: 'teal', hint: 'At cost price' },
    { label: 'Open alerts', value: alertTotal, icon: AlertTriangle, tone: 'amber', warn: alertTotal > 0, hint: alertTotal ? 'Needs attention' : 'All clear' },
  ];

  return (
    <div>
      <PageHeader title="General Store" subtitle="Central stock for medicines and medical supplies." />
      <MetricGrid items={metrics} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="space-y-4">
          <Card title="Needs reordering" subtitle="Items at or below their reorder level.">
            {data.topLow.length ? (
              <ul className="space-y-2">
                {data.topLow.map((i) => (
                  <li key={i.name} className="flex items-center gap-3">
                    <span className="flex-1 truncate text-sm font-medium text-slate-800">{i.name}</span>
                    <span className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100"><span className="block h-full bg-amber-500" style={{ width: `${Math.min(100, (i.onHand / (i.reorderLevel * 2 || 1)) * 100)}%` }} /></span>
                    <span className="money w-24 text-right text-sm"><b className={i.onHand <= 0 ? 'text-rose-700' : 'text-amber-700'}>{i.onHand}</b> <span className="text-slate-400">/ {i.reorderLevel}</span></span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500">Nothing needs reordering.</p>}
          </Card>
          <Card title="Recent movements" action={<Link to="/store" className="text-sm font-medium text-brand-700 hover:underline">Open store</Link>}>
            {data.recentMovements.length ? (
              <ul className="divide-y divide-slate-100">
                {data.recentMovements.map((m, i) => (
                  <li key={i} className="flex items-center gap-3 py-2 text-sm">
                    <span className={`inline-flex w-24 shrink-0 justify-center rounded-md px-2 py-0.5 text-xs font-semibold ${m.qty < 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{TYPE[m.type] || m.type}</span>
                    <span className="flex-1 truncate">{m.name}</span>
                    <span className={`money font-semibold ${m.qty < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{m.qty > 0 ? `+${m.qty}` : m.qty}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500">No movements yet.</p>}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Alerts" action={<Link to="/store?tab=alerts" className="text-sm font-medium text-brand-700 hover:underline">View</Link>}>
            <ul className="space-y-2 text-sm">
              {[['Out of stock', a.out, 'text-rose-700'], ['Running low', a.low, 'text-amber-700'], ['Expiring soon', a.expiring, 'text-amber-700'], ['Expired', a.expired, 'text-rose-700']].map(([label, n, c]) => (
                <li key={label} className="flex items-center justify-between"><span className="text-slate-600">{label}</span><span className={`money font-semibold ${n ? c : 'text-slate-400'}`}>{n || 0}</span></li>
              ))}
            </ul>
          </Card>
          <Card title="By category">
            {data.byCategory.length ? (
              <ul className="space-y-2">
                {data.byCategory.map((c) => (
                  <li key={c.name} className="text-sm">
                    <div className="mb-1 flex justify-between"><span className="truncate text-slate-700">{c.name}</span><span className="money text-slate-500">{c.n}</span></div>
                    <span className="block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full bg-brand-500" style={{ width: `${(c.n / topCat) * 100}%` }} /></span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500">No stock yet.</p>}
          </Card>
          <Card title="Quick links" bodyClass="p-2">
            <Link to="/store/transfers" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><ArrowLeftRight className="h-4 w-4 text-brand-700" /> Transfers to pharmacy</Link>
            <Link to="/store/formulary" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><PackageCheck className="h-4 w-4 text-brand-700" /> Drug formulary</Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
