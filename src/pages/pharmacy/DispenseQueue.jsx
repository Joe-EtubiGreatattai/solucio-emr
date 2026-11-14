import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ClipboardList, Pill, Users } from 'lucide-react';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { dateTime, fullName } from '../../lib/format';
import { Avatar, Badge, Card, Empty, MetricGrid, PageHeader, Spinner } from '../../components/ui';

export default function DispenseQueue() {
  const { data, loading, reload } = useFetch('/pharmacy/queue', { initial: [] });
  useLive(['queue', 'stock'], useCallback(() => reload(), [reload]));
  const navigate = useNavigate();
  const queue = data || [];
  const metrics = [
    { label: 'Patients waiting', value: loading ? '—' : queue.length, icon: Users, tone: 'brand', hint: 'Prescriptions to dispense' },
    { label: 'Items to prepare', value: loading ? '—' : queue.reduce((sum, q) => sum + (q.orders || 0), 0), icon: ClipboardList, tone: 'blue', hint: 'Across the queue' },
    { label: 'Urgent', value: loading ? '—' : queue.filter((q) => q.visit?.priority === 1).length, icon: AlertTriangle, tone: 'red', hint: 'High priority', warn: !loading && queue.some((q) => q.visit?.priority === 1) },
    { label: 'Allergy alerts', value: loading ? '—' : queue.filter((q) => q.patient?.allergies?.length > 0).length, icon: AlertTriangle, tone: 'amber', hint: 'Review before dispensing' },
  ];
  return (
    <div>
      <PageHeader title="Prescriptions" subtitle="Patients with drugs to collect. Dispensing takes them out of stock and adds them to the bill." />
      <MetricGrid items={metrics} />
      <Card bodyClass="p-0">
        {loading ? <Spinner /> : !data.length ? <Empty title="No prescriptions waiting" icon={Pill} /> : (
          <ul className="stagger divide-y divide-slate-100">
            {data.map((q) => (
              <li key={q.visit._id}>
                <button type="button" onClick={() => navigate(`/pharmacy/visit/${q.visit._id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                  <Avatar name={fullName(q.patient)} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{fullName(q.patient)}</span>
                    <span className="block text-sm text-slate-500">{q.patient?.patientNo} · {q.orders} item{q.orders === 1 ? '' : 's'} · since {dateTime(q.since)}</span>
                  </span>
                  {q.visit.priority === 1 && <Badge color="red">Urgent</Badge>}
                  {q.patient?.allergies?.length > 0 && <Badge color="red">Allergies</Badge>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
