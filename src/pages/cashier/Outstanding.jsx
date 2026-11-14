import { Link } from 'react-router-dom';
import { ReceiptText } from 'lucide-react';
import useFetch from '../../lib/useFetch';
import { date, fullName, naira } from '../../lib/format';
import { Card, Empty, PageHeader, Spinner } from '../../components/ui';

export default function Outstanding() {
  const { data, loading } = useFetch('/reports/outstanding', { initial: { patients: [], totalKobo: 0 } });
  return (
    <div>
      <PageHeader title="Owing patients" subtitle={`Patients who left with a balance. ${naira(data.totalKobo)} in total.`} />
      <Card bodyClass="p-0">
        {loading ? <Spinner /> : !data.patients.length ? <Empty title="Nobody owes anything" icon={ReceiptText} /> : (
          <table className="table">
            <thead><tr><th>Patient</th><th>Visits</th><th className="text-right">Owes</th></tr></thead>
            <tbody>
              {data.patients.map((p) => (
                <tr key={p.patient?._id}>
                  <td data-label=""><span className="font-semibold">{fullName(p.patient)}</span><span className="block text-xs text-slate-500">{p.patient?.patientNo} · {p.patient?.phone}</span></td>
                  <td data-label="Visits">{p.visits.map((v) => (
                    <Link key={v._id} to={`/cashier/bill/${v._id}`} className="block text-sm text-brand-700 hover:underline">{v.visitNo} · {date(v.closedAt)} · {naira(v.balanceKobo)}{v.closeReason ? ` — ${v.closeReason}` : ''}</Link>
                  ))}</td>
                  <td data-label="Owes" className="money text-right font-bold">{naira(p.balanceKobo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
