import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Banknote, Users, Wallet } from 'lucide-react';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { dateTime, fullName, naira } from '../../lib/format';
import { Avatar, Badge, Card, Empty, MetricGrid, PageHeader, Spinner } from '../../components/ui';

export default function Awaiting() {
  const { data, loading, reload } = useFetch('/cashier/awaiting', { initial: [] });
  useLive(['queue', 'bill', 'visit'], useCallback(() => reload(), [reload]));
  const navigate = useNavigate();
  const visits = data || [];
  const metrics = [
    { label: 'Patients to bill', value: loading ? '—' : visits.length, icon: Users, tone: 'brand', hint: 'Ready for cashier' },
    { label: 'Balance to collect', value: loading ? '—' : naira(visits.reduce((sum, v) => sum + (v.balanceKobo || 0), 0)), icon: Banknote, tone: 'blue', hint: 'Outstanding across queue' },
    { label: 'HMO patients', value: loading ? '—' : visits.filter((v) => v.payer?.type === 'hmo').length, icon: AlertCircle, tone: 'amber', hint: 'Check plan details' },
  ];
  return (
    <div>
      <PageHeader title="Awaiting payment" subtitle="Patients the doctor has finished with. Open a bill to take payment." />
      <MetricGrid items={metrics} />
      <Card bodyClass="p-0">
        {loading ? <Spinner /> : !data.length ? <Empty title="No bills waiting" icon={Wallet} /> : (
          <ul className="stagger divide-y divide-slate-100">
            {data.map((v) => (
              <li key={v._id}>
                <button type="button" onClick={() => navigate(`/cashier/bill/${v._id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                  <Avatar name={fullName(v.patient)} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{fullName(v.patient)}</span>
                    <span className="block text-sm text-slate-500">{v.patient?.patientNo} · {v.clinic?.name} · finished {dateTime(v.completedAt)}</span>
                  </span>
                  {v.payer?.type === 'hmo' && <Badge color="blue">{v.payer.hmo?.name}</Badge>}
                  <span className="money text-right text-lg font-bold">{naira(v.balanceKobo)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
