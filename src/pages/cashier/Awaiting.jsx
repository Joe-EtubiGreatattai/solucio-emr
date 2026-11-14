import { useCallback, useState } from 'react';
import { Clock, Search, ShieldCheck, Wallet } from 'lucide-react';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { fullName, minutes, naira } from '../../lib/format';
import { Avatar, Skeleton } from '../../components/ui';
import { PaymentPanel } from './TakePayment';

const waited = (iso) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000)) : 0);

export default function Awaiting() {
  const { data, loading, error, reload } = useFetch('/cashier/awaiting', { initial: [] });
  useLive(['queue', 'bill', 'visit'], useCallback(() => reload(), [reload]));
  const [visitId, setVisitId] = useState(null);
  const [query, setQuery] = useState('');
  const visits = data || [];
  const toCollect = visits.reduce((n, v) => n + Math.max(0, v.balanceKobo || 0), 0);
  const term = query.trim().toLowerCase();
  const shown = visits.filter((v) => !term || `${fullName(v.patient)} ${v.patient?.patientNo || ''}`.toLowerCase().includes(term));

  return (
    <div className="grid gap-4 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start">
      <aside className={`${visitId ? 'hidden lg:block' : ''} lg:sticky lg:top-4`}>
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-4">
            <h1 className="text-xl font-semibold text-slate-900">Awaiting payment</h1>
            <p className="mt-0.5 text-sm text-slate-500">{visits.length ? <>{visits.length} bill{visits.length === 1 ? '' : 's'} · <span className="money">{naira(toCollect, { decimals: 0 })}</span> to collect</> : 'No bills waiting'}</p>
            {visits.length > 0 && (
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="input !py-2 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient or number" aria-label="Search bills awaiting payment" />
              </div>
            )}
          </div>
          {loading ? <div className="space-y-2 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            : error ? <p className="p-4 text-sm text-rose-700">{error}</p>
              : !visits.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">Patients appear here when the doctor finishes their visit.</p>
                : !shown.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">No patients match your search.</p>
                : (
                  <ul className="max-h-[calc(100vh-13rem)] divide-y divide-slate-100 overflow-y-auto">
                    {shown.map((v) => {
                      const active = v._id === visitId;
                      const w = waited(v.completedAt);
                      return (
                        <li key={v._id}>
                          <button type="button" onClick={() => setVisitId(v._id)} aria-current={active ? 'true' : undefined}
                            className={`relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${active ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                            {active && <span className="absolute inset-y-0 left-0 w-1 bg-brand-600" />}
                            <Avatar name={fullName(v.patient)} size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold text-slate-900">{fullName(v.patient)}</span>
                              <span className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                                {v.payer?.type === 'hmo' ? <><ShieldCheck className="h-3.5 w-3.5" />{v.payer.hmo?.name}</> : 'Cash'} · <Clock className="h-3 w-3" />{minutes(w)}
                              </span>
                            </span>
                            <span className="money shrink-0 font-semibold text-slate-900">{naira(v.balanceKobo, { decimals: 0 })}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
        </div>
      </aside>
      <section className={visitId ? '' : 'hidden lg:block'}>
        {visitId ? <PaymentPanel key={visitId} visitId={visitId} onBack={() => setVisitId(null)} /> : (
          <div className="card flex min-h-[22rem] flex-col items-center justify-center gap-2 p-8 text-center">
            <Wallet className="h-10 w-10 text-brand-600" />
            <p className="text-lg font-semibold text-slate-900">Pick a bill</p>
            <p className="max-w-sm text-sm text-slate-500">Take cash, POS or transfer, split between them if needed, and print the receipt.</p>
          </div>
        )}
      </section>
    </div>
  );
}
