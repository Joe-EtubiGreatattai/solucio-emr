import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, BedDouble, ShieldCheck } from 'lucide-react';
import { api } from '../../api.js';
import { Avatar, Badge, Card, Spinner } from '../../components/ui.jsx';
import ChartTimeline, { Vitals } from './ChartTimeline.jsx';
import HomeMonitoringPanel from './HomeMonitoringPanel.jsx';
import { age, date, dateTime, fullName } from '../../lib/format.js';
import { useLive } from '../../lib/live.js';

export default function DoctorPatientRecord() {
  const { patientId } = useParams();
  const [chart, setChart] = useState(null);
  const [error, setError] = useState('');
  const loadChart = useCallback(() => api(`/patients/${patientId}/chart`).then((data) => { setChart(data); setError(''); }).catch((e) => setError(e.message)), [patientId]);
  useEffect(() => { loadChart(); }, [loadChart]);
  useLive(['ward'], loadChart);

  const back = <Link to="/patients" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> All patients</Link>;
  if (error) return <div>{back}<Card><p className="text-sm text-rose-700">{error}</p></Card></div>;
  if (!chart) return <Spinner />;

  const p = chart.patient;
  const admissions = chart.admissions || [];
  const current = admissions.find((a) => a.status === 'admitted');
  const visits = chart.visits || [];
  const lastVitals = visits.flatMap((v) => v.vitals || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  // Every diagnosis ever recorded, most recent first, without repeats
  const diagnoses = [];
  for (const v of visits) for (const n of v.notes || []) for (const d of n.diagnoses || []) {
    if (!diagnoses.some((x) => x.name === d.name)) diagnoses.push({ ...d, on: v.createdAt });
  }
  const hmos = p.hmoMemberships || [];

  return (
    <div>
      {back}
      <header className="card mb-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={fullName(p)} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold text-slate-900 sm:text-2xl">{fullName(p)}</h1>
            <p className="text-sm text-slate-500">
              {p.sex === 'male' ? 'Male' : 'Female'}{p.dob ? `, ${age(p.dob)} (${date(p.dob)})` : ''} · {p.patientNo}{p.folderNo ? ` · Folder ${p.folderNo}` : ''}{p.phone ? ` · ${p.phone}` : ''}
            </p>
          </div>
          {current && <Badge color="blue" icon={BedDouble}>Admitted: {current.ward?.name}, bed {current.bed?.bedNo}</Badge>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {p.allergies?.length > 0
            ? <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800"><AlertTriangle className="h-4 w-4" /> Allergic to {p.allergies.join(', ')}</p>
            : <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">No known allergies</p>}
          {hmos.map((m) => <p key={m._id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"><ShieldCheck className="h-4 w-4 text-brand-700" />{m.hmo?.name}{m.memberNo ? ` · ${m.memberNo}` : ''}</p>)}
          {p.bloodGroup && <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">Blood group {p.bloodGroup}</p>}
          {p.genotype && <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">Genotype {p.genotype}</p>}
        </div>
      </header>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Known diagnoses</h2>
          {diagnoses.length ? (
            <ul className="space-y-1.5">{diagnoses.slice(0, 8).map((d) => (
              <li key={d.name} className="flex items-baseline justify-between gap-2 text-sm"><span className="text-slate-800">{d.name}{d.code && <span className="money ml-1.5 text-xs text-slate-400">{d.code}</span>}</span><span className="shrink-0 text-xs text-slate-400">{date(d.on)}</span></li>
            ))}</ul>
          ) : <p className="text-sm text-slate-500">None recorded yet.</p>}
          {(p.paperHistory || p.importedHistory) && <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-900">Old records: {p.paperHistory || p.importedHistory}</p>}
        </section>
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Latest vitals</h2>
          {lastVitals ? <><Vitals v={lastVitals} /><p className="mt-1 text-xs text-slate-400">{dateTime(lastVitals.createdAt)}</p></> : <p className="text-sm text-slate-500">No vitals recorded.</p>}
        </section>
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Visits and stays</h2>
          <p className="text-sm text-slate-700">{visits.length} visit{visits.length === 1 ? '' : 's'}{visits[0] ? `, last on ${date(visits[0].createdAt)}` : ''}</p>
          {admissions.length > 0 && (
            <ul className="mt-2 space-y-1.5">{admissions.slice(0, 3).map((a) => (
              <li key={a._id} className="text-sm"><span className="font-medium text-slate-800">{a.ward?.name}, bed {a.bed?.bedNo}</span><span className="block text-xs text-slate-500">{date(a.admittedAt)}{a.dischargedAt ? ` – ${date(a.dischargedAt)}` : ' – now'} · {a.reason}</span></li>
            ))}</ul>
          )}
        </section>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card title="Visit history" subtitle="Notes, vitals, results and drugs from each visit." bodyClass="max-h-[75vh] space-y-4 overflow-y-auto p-4">
          <ChartTimeline chart={chart} />
        </Card>
        <HomeMonitoringPanel patientId={patientId} homeMonitoring={chart.homeMonitoring} onRefresh={loadChart} />
      </div>
    </div>
  );
}
