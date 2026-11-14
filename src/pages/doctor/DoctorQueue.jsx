import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Stethoscope } from 'lucide-react';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { age, fullName, minutes } from '../../lib/format';
import { ageInYears, assess } from '../../lib/vitals';
import { Avatar, Badge, Skeleton } from '../../components/ui';

const KEY = 'emr_clinic';
const read = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };

/** The nurse's readings worth a doctor's attention, worst first. */
function flags(v, years) {
  if (!v) return [];
  const out = [];
  const bp = worse(assess('bpSys', v.bpSys, years), assess('bpDia', v.bpDia, years));
  if (bp) out.push({ level: bp, text: `BP ${v.bpSys}/${v.bpDia}` });
  for (const [k, label, unit] of [['spo2', 'SpO₂', '%'], ['tempC', 'Temp', '°C'], ['pulse', 'Pulse', ''], ['respRate', 'RR', '']]) {
    const a = assess(k, v[k], years);
    if (a.level === 'critical' || a.level === 'borderline') out.push({ level: a.level, text: `${label} ${v[k]}${unit}` });
  }
  return out.sort((a, b) => (a.level === 'critical' ? -1 : 1) - (b.level === 'critical' ? -1 : 1));
}
const worse = (a, b) => (a.level === 'critical' || b.level === 'critical' ? 'critical' : a.level === 'borderline' || b.level === 'borderline' ? 'borderline' : null);

export default function DoctorQueue() {
  const { data: clinics } = useFetch('/clinics', { initial: [] });
  const [clinic, setClinic] = useState(read);
  const { data: queue, loading, error, reload } = useFetch(`/queues/doctor${clinic ? `?clinic=${clinic}` : ''}`, { initial: [] });
  useLive(['queue'], useCallback(() => reload(), [reload]));
  const navigate = useNavigate();
  const choose = (v) => { setClinic(v); try { localStorage.setItem(KEY, v); } catch { /* private mode */ } };
  const open = (e) => {
    if (e.status === 'waiting') api(`/queues/${e._id}/start`, { method: 'POST' }).catch(() => {});
    navigate(`/doctor/visit/${e.visit._id}`);
  };
  const waiting = queue.filter((e) => e.status === 'waiting');
  const withYou = queue.filter((e) => e.status === 'in_progress');
  const unwell = queue.filter((e) => flags(e.vitals, ageInYears(e.patient?.dob)).some((f) => f.level === 'critical')).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">My queue</h1>
          <p className="mt-1 text-sm text-slate-500">
            {waiting.length ? `${waiting.length} waiting` : 'Nobody waiting'}
            {withYou.length > 0 && ` · ${withYou.length} with a doctor`}
            {unwell > 0 && <> · <span className="font-semibold text-rose-700">{unwell} with dangerous readings</span></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Clinic">
          <ClinicChip active={!clinic} onClick={() => choose('')}>All clinics</ClinicChip>
          {clinics.map((c) => <ClinicChip key={c._id} active={clinic === c._id} onClick={() => choose(c._id)}>{c.name}</ClinicChip>)}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : error ? (
          <p className="p-5 text-sm text-rose-700">{error}</p>
        ) : !queue.length ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <Stethoscope className="h-9 w-9 text-brand-600" />
            <p className="font-semibold text-slate-900">Nobody waiting{clinic ? ' for this clinic' : ''}</p>
            <p className="text-sm text-slate-500">Patients appear here once the nurse has taken their vitals.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {queue.map((e) => {
              const years = ageInYears(e.patient?.dob);
              const f = flags(e.vitals, years);
              const critical = f.some((x) => x.level === 'critical');
              const wait = e.waitingMinutes || 0;
              return (
                <li key={e._id}>
                  <button type="button" onClick={() => open(e)} className="relative grid w-full gap-x-4 gap-y-2 px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-center sm:px-5">
                    {(e.priority === 1 || critical) && <span className="absolute inset-y-0 left-0 w-1 bg-rose-500" />}
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={fullName(e.patient)} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold text-slate-900">{fullName(e.patient)}</span>
                          {e.priority === 1 && <Badge color="red">Urgent</Badge>}
                          {e.patient?.allergies?.length > 0 && <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" aria-label={`Allergic to ${e.patient.allergies.join(', ')}`} />}
                        </span>
                        <span className="block truncate text-sm text-slate-500">
                          {e.patient?.sex === 'male' ? 'M' : 'F'}{e.patient?.dob ? `, ${age(e.patient.dob)}` : ''}{e.visit?.complaint ? ` · ${e.visit.complaint}` : ''}{!clinic && e.clinic?.name ? ` · ${e.clinic.name}` : ''}
                        </span>
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-1.5 pl-[3.25rem] sm:pl-0">
                      {!e.vitals ? <span className="text-xs text-slate-400">No vitals taken</span>
                        : !f.length ? <span className="text-xs text-emerald-700">Vitals normal</span>
                          : f.map((x) => (
                            <span key={x.text} className={`rounded-md px-2 py-0.5 text-xs font-semibold ${x.level === 'critical' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{x.text}</span>
                          ))}
                    </span>
                    <span className={`flex items-center gap-1 pl-[3.25rem] text-sm font-medium sm:pl-0 ${e.status === 'in_progress' ? 'text-brand-700' : wait >= 60 ? 'text-rose-700' : wait >= 30 ? 'text-amber-700' : 'text-slate-500'}`}>
                      {e.status === 'in_progress' ? 'With a doctor' : <><Clock className="h-4 w-4" /> {minutes(wait)}</>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ClinicChip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${active ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
      {children}
    </button>
  );
}
