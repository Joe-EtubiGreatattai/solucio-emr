import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, HeartPulse } from 'lucide-react';
import { api } from '../../api.js';
import { Card, PageHeader, Spinner } from '../../components/ui.jsx';
import PatientBanner from '../../components/PatientBanner.jsx';
import ChartTimeline from './ChartTimeline.jsx';
import HomeMonitoringPanel from './HomeMonitoringPanel.jsx';

export default function DoctorPatientRecord() {
  const { patientId } = useParams();
  const [chart, setChart] = useState(null);
  const [error, setError] = useState('');
  const loadChart = useCallback(() => api(`/patients/${patientId}/chart`).then((data) => { setChart(data); setError(''); }).catch((e) => setError(e.message)), [patientId]);
  useEffect(() => { loadChart(); }, [loadChart]);

  if (error) return <div><PageHeader title="Patient record" back={<Link to="/patients" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={15} /> All patients</Link>} /><Card><p className="text-sm text-rose-700">{error}</p></Card></div>;
  if (!chart) return <Spinner />;

  const entries = chart.homeMonitoring?.entries || [];
  return (
    <div>
      <PageHeader title="Patient record" back={<Link to="/patients" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={15} /> All patients</Link>} />
      <PatientBanner patient={chart.patient} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><ClipboardList size={19} /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recorded visits</p><p className="text-xl font-bold text-slate-900">{chart.visits.length}</p></div></div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><HeartPulse size={19} /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">At-home check-ins</p><p className="text-xl font-bold text-slate-900">{entries.length}</p></div></div>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card title="Visit history" subtitle="Clinical notes, staff-recorded vitals, and results." bodyClass="max-h-[75vh] space-y-4 overflow-y-auto p-4">
          <ChartTimeline chart={chart} />
        </Card>
        <HomeMonitoringPanel patientId={patientId} homeMonitoring={chart.homeMonitoring} onRefresh={loadChart} />
      </div>
    </div>
  );
}
