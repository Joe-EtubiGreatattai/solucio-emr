import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReceiptText } from 'lucide-react';
import useFetch from '../../lib/useFetch';
import { dateTime, fullName, naira } from '../../lib/format';
import { Badge, Card, Empty, MetricGrid, PageHeader, Spinner } from '../../components/ui';
import { VISIT_STATUS } from '../reception/Today';

export default function Bills() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const { data, loading } = useFetch(`/billing/bills${status ? `?status=${status}` : ''}`, { initial: [] });
  const navigate = useNavigate();
  const term = q.trim().toLowerCase();
  const bills = (data || []).filter((v) => (!needsCode || v.needsAuthCount > 0) && (!term || `${fullName(v.patient)} ${v.patient?.patientNo} ${v.visitNo}`.toLowerCase().includes(term)));
  const metrics = [
    { label: 'Recent bills', value: loading ? '—' : bills.length, hint: status ? 'Filtered by status' : 'Latest visits', tone: 'brand' },
    { label: 'Open balances', value: loading ? '—' : naira(bills.reduce((sum, v) => sum + (v.balanceKobo || 0), 0)), hint: 'Across the visible bills', tone: 'amber' },
    { label: 'HMO visits', value: loading ? '—' : bills.filter((v) => v.payer?.type === 'hmo').length, hint: 'Review claims and codes', tone: 'blue' },
  ];
  return (
    <div>
      <PageHeader title="Bills" subtitle="Remove a wrong charge, add an HMO approval code, or give a discount."
 />
      <MetricGrid items={metrics} />
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {[['', 'All recent'], ...Object.entries(VISIT_STATUS).map(([v, st]) => [v, st.label])].map(([v, label]) => (
          <button key={v || 'all'} type="button" onClick={() => setStatus(v)} aria-pressed={status === v}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${status === v ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>{label}</button>
        ))}
        <button type="button" onClick={() => setNeedsCode((x) => !x)} aria-pressed={needsCode}
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${needsCode ? 'border-amber-500 bg-amber-500 text-white' : 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300'}`}>Needs HMO code</button>
        <input className="input ml-auto !w-full !rounded-full sm:!w-64" placeholder="Find a name, patient or visit number" aria-label="Find a bill" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Card bodyClass="p-0">
        {loading ? <Spinner /> : !bills.length ? <Empty title="No bills" icon={ReceiptText} /> : (
          <table className="table">
            <thead><tr><th>Patient</th><th>Visit</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Balance</th></tr></thead>
            <tbody>
              {bills.map((v) => (
                <tr key={v._id} className="cursor-pointer" onClick={() => navigate(`/billing/bill/${v._id}`)}>
                  <td data-label=""><span className="font-semibold">{fullName(v.patient)}</span><span className="block text-xs text-slate-500">{v.patient?.patientNo}</span></td>
                  <td data-label="Visit">{v.visitNo}<span className="block text-xs text-slate-500">{v.clinic?.name} · {dateTime(v.createdAt)}</span></td>
                  <td data-label="Status"><Badge color={VISIT_STATUS[v.status]?.color}>{VISIT_STATUS[v.status]?.label}</Badge>{v.payer?.type === 'hmo' && <Badge color="blue" className="ml-1">{v.payer.hmo?.name}</Badge>}{v.needsAuthCount > 0 && <Badge color="amber" className="ml-1">{v.needsAuthCount} need code</Badge>}</td>
                  <td data-label="Total" className="money text-right">{naira(v.totalKobo)}</td>
                  <td data-label="Balance" className="money text-right font-semibold">{naira(v.balanceKobo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
