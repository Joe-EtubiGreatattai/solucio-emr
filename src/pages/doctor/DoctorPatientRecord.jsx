import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, HeartPulse } from 'lucide-react';
import { api } from '../../api.js';
import { Badge, Card, PageHeader, Spinner } from '../../components/ui.jsx';
import PatientBanner from '../../components/PatientBanner.jsx';
import ChartTimeline from './ChartTimeline.jsx';
import HomeMonitoringPanel from './HomeMonitoringPanel.jsx';
import { dateTime } from '../../lib/format.js';
import { useLive } from '../../lib/live.js';

export default function DoctorPatientRecord() {
  const { patientId } = useParams();
  const [chart, setChart] = useState(null);
  const [error, setError] = useState('');
  const loadChart = useCallback(() => api(`/patients/${patientId}/chart`).then((data) => { setChart(data); setError(''); }).catch((e) => setError(e.message)), [patientId]);
  useEffect(() => { loadChart(); }, [loadChart]);
  useLive(['ward'], loadChart);

  if (error) return <div><PageHeader title="Patient record" back={<Link to="/patients" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={15} /> All patients</Link>} /><Card><p className="text-sm text-rose-700">{error}</p></Card></div>;
  if (!chart) return <Spinner />;

  const entries = chart.homeMonitoring?.entries || [];
  const admissions = chart.admissions || [];
  return (
    <div>
      <PageHeader title="Patient record" back={<Link to="/patients" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={15} /> All patients</Link>} />
      <PatientBanner patient={chart.patient} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><ClipboardList size={19} /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recorded visits</p><p className="text-xl font-bold text-slate-900">{chart.visits.length}</p></div></div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><HeartPulse size={19} /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">At-home check-ins</p><p className="text-xl font-bold text-slate-900">{entries.length}</p></div></div>
      </div>
      {!!admissions.length && <Card className="mb-4" title="Inpatient admissions" bodyClass="p-0"><ul className="divide-y divide-slate-100">{admissions.map((admission) => <li key={admission._id} className="flex flex-wrap items-center gap-2 px-4 py-3.5 text-sm sm:px-5"><span className="min-w-0 flex-1"><span className="font-semibold text-slate-800">{admission.ward?.name || 'Ward'} · Bed {admission.bed?.bedNo || '—'}</span><span className="ml-2 text-slate-500">Admitted {dateTime(admission.admittedAt)}{admission.dischargedAt ? ` · Discharged ${dateTime(admission.dischargedAt)}` : ''}</span><span className="mt-1 block text-slate-600">{admission.reason}{admission.diagnosis ? ` · ${admission.diagnosis}` : ''}</span></span><Badge color={admission.status === 'admitted' ? 'green' : 'slate'}>{admission.status === 'admitted' ? 'Inpatient' : 'Discharged'}</Badge></li>)}</ul></Card>}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card title="Visit history" subtitle="Clinical notes, staff-recorded vitals, and results." bodyClass="max-h-[75vh] space-y-4 overflow-y-auto p-4">
          <ChartTimeline chart={chart} />
        </Card>
        <HomeMonitoringPanel patientId={patientId} homeMonitoring={chart.homeMonitoring} onRefresh={loadChart} />
      </div>
    </div>
  );
}
