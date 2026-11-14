import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReceiptText } from 'lucide-react';
import useFetch from '../../lib/useFetch';
import { dateTime, fullName, naira } from '../../lib/format';
import { Badge, Card, Empty, MetricGrid, PageHeader, Spinner } from '../../components/ui';
import { VISIT_STATUS } from '../reception/Today';

export default function Bills() {
  const [status, setStatus] = useState('');
  const { data, loading } = useFetch(`/billing/bills${status ? `?status=${status}` : ''}`, { initial: [] });
  const navigate = useNavigate();
  const bills = data || [];
  const metrics = [
    { label: 'Recent bills', value: loading ? '—' : bills.length, hint: status ? 'Filtered by status' : 'Latest visits', tone: 'brand' },
    { label: 'Open balances', value: loading ? '—' : naira(bills.reduce((sum, v) => sum + (v.balanceKobo || 0), 0)), hint: 'Across the visible bills', tone: 'amber' },
    { label: 'HMO visits', value: loading ? '—' : bills.filter((v) => v.payer?.type === 'hmo').length, hint: 'Review claims and codes', tone: 'blue' },
  ];
  return (
    <div>
      <PageHeader title="Bills" subtitle="Remove a wrong charge, add an HMO approval code, or give a discount."
        actions={<select className="input !w-auto" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All recent</option>{Object.entries(VISIT_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
        </select>} />
      <MetricGrid items={metrics} />
      <Card bodyClass="p-0">
        {loading ? <Spinner /> : !data.length ? <Empty title="No bills" icon={ReceiptText} /> : (
          <table className="table">
            <thead><tr><th>Patient</th><th>Visit</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Balance</th></tr></thead>
            <tbody>
              {data.map((v) => (
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
