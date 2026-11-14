import { useCallback, useState } from 'react';
import { AlertTriangle, Clock, Pill } from 'lucide-react';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { fullName, minutes } from '../../lib/format';
import { Avatar, Badge, Skeleton } from '../../components/ui';
import { DispensePanel } from './Dispense';

const waited = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

export default function DispenseQueue() {
  const { data, loading, error, reload } = useFetch('/pharmacy/queue', { initial: [] });
  useLive(['queue', 'stock'], useCallback(() => reload(), [reload]));
  const [visitId, setVisitId] = useState(null);
  const queue = data || [];
  const items = queue.reduce((n, q) => n + (q.orders || 0), 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start">
      <aside className={`${visitId ? 'hidden lg:block' : ''} lg:sticky lg:top-4`}>
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-4">
            <h1 className="text-xl font-semibold text-slate-900">Prescriptions</h1>
            <p className="mt-0.5 text-sm text-slate-500">{queue.length ? `${queue.length} patient${queue.length === 1 ? '' : 's'}, ${items} item${items === 1 ? '' : 's'} to give` : 'Nobody waiting'}</p>
          </div>
          {loading ? <div className="space-y-2 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            : error ? <p className="p-4 text-sm text-rose-700">{error}</p>
              : !queue.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">Patients appear here when a doctor prescribes.</p>
                : (
                  <ul className="max-h-[calc(100vh-13rem)] divide-y divide-slate-100 overflow-y-auto">
                    {queue.map((q) => {
                      const active = q.visit._id === visitId;
                      const w = waited(q.since);
                      return (
                        <li key={q.visit._id}>
                          <button type="button" onClick={() => setVisitId(q.visit._id)} aria-current={active ? 'true' : undefined}
                            className={`relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${active ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                            {(active || q.visit.priority === 1) && <span className={`absolute inset-y-0 left-0 w-1 ${active ? 'bg-brand-600' : 'bg-rose-500'}`} />}
                            <Avatar name={fullName(q.patient)} size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5"><span className="truncate font-semibold text-slate-900">{fullName(q.patient)}</span>{q.visit.priority === 1 && <Badge color="red">Urgent</Badge>}</span>
                              <span className="flex items-center gap-1.5 text-sm text-slate-500">{q.orders} item{q.orders === 1 ? '' : 's'}{q.patient?.allergies?.length > 0 && <span className="flex items-center gap-1 text-rose-700"><AlertTriangle className="h-3.5 w-3.5" />Allergies</span>}</span>
                            </span>
                            <span className={`flex shrink-0 items-center gap-1 text-xs ${w >= 30 ? 'font-semibold text-amber-700' : 'text-slate-500'}`}><Clock className="h-3.5 w-3.5" />{minutes(w)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
        </div>
      </aside>
      <section className={visitId ? '' : 'hidden lg:block'}>
        {visitId ? <DispensePanel key={visitId} visitId={visitId} onBack={() => setVisitId(null)} /> : (
          <div className="card flex min-h-[22rem] flex-col items-center justify-center gap-2 p-8 text-center">
            <Pill className="h-10 w-10 text-brand-600" />
            <p className="text-lg font-semibold text-slate-900">Pick a patient</p>
            <p className="max-w-sm text-sm text-slate-500">Dispensing takes the drugs out of stock (earliest expiry first) and adds them to the bill.</p>
          </div>
        )}
      </section>
    </div>
  );
}
