import { Badge } from '../../components/ui';
import { date } from '../../lib/format';

const flagColor = { low: 'text-sky-700 font-semibold', high: 'text-rose-700 font-semibold' };

export function Vitals({ v }) {
  const parts = [
    v.bpSys && `BP ${v.bpSys}/${v.bpDia || '?'}`, v.pulse && `Pulse ${v.pulse}`, v.tempC && `Temp ${v.tempC}°C`, v.respRate && `RR ${v.respRate}`,
    v.spo2 && `SpO₂ ${v.spo2}%`, v.weightKg && `${v.weightKg}kg`, v.bmi && `BMI ${v.bmi}`,
  ].filter(Boolean);
  return <p className="text-sm text-slate-700">{parts.join(' · ') || 'No numbers recorded'}{v.notes ? ` — ${v.notes}` : ''}</p>;
}

export function Result({ r, name }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-sm">
      <p className="mb-1 font-semibold">{name}</p>
      <ul className="grid gap-x-4 sm:grid-cols-2">
        {r.values.map((x) => (
          <li key={x.name} className="flex justify-between gap-2"><span className="text-slate-500">{x.name}</span>
            <span className={`money ${flagColor[x.flag] || ''}`}>{x.value} {x.unit}{x.flag === 'low' ? ' ↓' : x.flag === 'high' ? ' ↑' : ''}</span></li>
        ))}
      </ul>
      {r.comment && <p className="mt-1 text-slate-600">{r.comment}</p>}
    </div>
  );
}

/** Past visits, newest first. */
export default function ChartTimeline({ chart, currentVisitId }) {
  const past = (chart?.visits || []).filter((v) => v._id !== currentVisitId);
  const p = chart?.patient;
  return (
    <div className="space-y-4">
      {(p?.paperHistory || p?.importedHistory) && (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <p className="mb-1 font-semibold">From the old records</p>
          {p.paperHistory && <p className="whitespace-pre-wrap">{p.paperHistory}</p>}
          {p.importedHistory && <p className="whitespace-pre-wrap">{p.importedHistory}</p>}
        </div>
      )}
      {!past.length && <p className="text-sm text-slate-500">No earlier visits in the EMR.</p>}
      {past.map((v) => (
        <div key={v._id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold">{date(v.createdAt)} · {v.clinic?.name}<Badge>{v.visitNo}</Badge></p>
          {v.vitals.map((x) => <Vitals key={x._id} v={x} />)}
          {v.notes.map((n) => (
            <div key={n._id} className="mt-2 text-sm">
              {n.complaint && <p><span className="text-slate-500">Complaint:</span> {n.complaint}</p>}
              {n.diagnoses?.length > 0 && <p><span className="text-slate-500">Diagnosis:</span> {n.diagnoses.map((d) => `${d.name}${d.code ? ` (${d.code})` : ''}`).join('; ')}</p>}
              {n.plan && <p><span className="text-slate-500">Plan:</span> {n.plan}</p>}
              <p className="text-xs text-slate-400">{n.by?.name}</p>
            </div>
          ))}
          {v.results.map((r) => <div key={r._id} className="mt-2"><Result r={r} name={v.orders.find((o) => o._id === r.order)?.name || 'Result'} /></div>)}
          {v.dispenses.length > 0 && <p className="mt-2 text-sm"><span className="text-slate-500">Drugs given:</span> {v.dispenses.map((d) => `${d.name} ×${d.qty - (d.returnedQty || 0)}`).join(', ')}</p>}
        </div>
      ))}
    </div>
  );
}
