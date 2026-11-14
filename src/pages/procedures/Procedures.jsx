import { useCallback, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Syringe } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { age, dateTime, fullName, minutes } from '../../lib/format';
import { Avatar, Badge, Button, ErrorNote, Skeleton } from '../../components/ui';

const waited = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

export default function Procedures() {
  const { data, loading, error, reload } = useFetch('/procedures/queue', { initial: [] });
  useLive(['queue'], useCallback(() => reload(), [reload]));
  const [selectedId, setSelectedId] = useState(null);
  const list = [...(data || [])].sort((a, b) => ((a.visit?.priority === 1 ? 0 : 1) - (b.visit?.priority === 1 ? 0 : 1)) || (new Date(a.createdAt) - new Date(b.createdAt)));
  const selected = list.find((o) => o._id === selectedId);
  const after = (id) => { const rest = list.filter((o) => o._id !== id); setSelectedId(rest[0]?._id || null); reload(); };

  return (
    <div className="grid gap-4 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start">
      <aside className={`${selected ? 'hidden lg:block' : ''} lg:sticky lg:top-4`}>
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-4">
            <h1 className="text-xl font-semibold text-slate-900">Procedures</h1>
            <p className="mt-0.5 text-sm text-slate-500">{list.length ? `${list.length} waiting` : 'Nothing waiting'}{list.some((o) => o.visit?.priority === 1) && <>, <span className="font-semibold text-rose-700">{list.filter((o) => o.visit?.priority === 1).length} urgent</span></>}</p>
          </div>
          {loading ? <div className="space-y-2 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            : error ? <p className="p-4 text-sm text-rose-700">{error}</p>
              : !list.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">Dressings, injections and other procedures appear here when a doctor orders them.</p>
                : (
                  <ul className="max-h-[calc(100vh-13rem)] divide-y divide-slate-100 overflow-y-auto">
                    {list.map((o) => {
                      const active = o._id === selectedId;
                      const w = waited(o.createdAt);
                      return (
                        <li key={o._id}>
                          <button type="button" onClick={() => setSelectedId(o._id)} aria-current={active ? 'true' : undefined}
                            className={`relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${active ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                            {(active || o.visit?.priority === 1) && <span className={`absolute inset-y-0 left-0 w-1 ${active ? 'bg-brand-600' : 'bg-rose-500'}`} />}
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2"><span className="truncate font-semibold text-slate-900">{o.name}</span>{o.visit?.priority === 1 && <Badge color="red">Urgent</Badge>}</span>
                              <span className="flex items-center gap-1.5 truncate text-sm text-slate-500">{fullName(o.patient)}{o.patient?.allergies?.length > 0 && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" aria-label="Has allergies" />}</span>
                            </span>
                            <span className={`flex shrink-0 items-center gap-1 text-xs ${w >= 60 ? 'font-semibold text-rose-700' : w >= 30 ? 'text-amber-700' : 'text-slate-500'}`}><Clock className="h-3.5 w-3.5" />{minutes(w)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
        </div>
      </aside>

      <section className={selected ? '' : 'hidden lg:block'}>
        {selected ? <ProcedurePanel key={selected._id} order={selected} onBack={() => setSelectedId(null)} onDone={() => after(selected._id)} /> : (
          <div className="card flex min-h-[22rem] flex-col items-center justify-center gap-2 p-8 text-center">
            <Syringe className="h-10 w-10 text-brand-600" />
            <p className="text-lg font-semibold text-slate-900">Pick a procedure</p>
            <p className="max-w-sm text-sm text-slate-500">Marking it done adds it to the patient’s bill.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function ProcedurePanel({ order, onBack, onDone }) {
  const p = order.patient;
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function done() {
    setBusy(true);
    setError('');
    try {
      await api(`/procedures/orders/${order._id}/done`, { method: 'POST', body: { notes } });
      toast.success(`${order.name} done for ${fullName(p)}`);
      onDone();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="card overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 sm:p-5">
        <button type="button" onClick={onBack} aria-label="Back to list" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 lg:hidden"><ArrowLeft className="h-4 w-4" /></button>
        <Avatar name={fullName(p)} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-semibold text-slate-900">{order.name}</h2>
          <p className="text-sm text-slate-500">{fullName(p)} · {p?.sex === 'male' ? 'Male' : 'Female'}{p?.dob ? `, ${age(p.dob)}` : ''} · {p?.patientNo}</p>
        </div>
        {order.visit?.priority === 1 && <Badge color="red">Urgent</Badge>}
      </header>
      <div className="space-y-4 p-4 sm:p-5">
        {p?.allergies?.length > 0 && <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800"><AlertTriangle className="h-4 w-4" /> Allergic to {p.allergies.join(', ')}</p>}
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Ordered by</dt><dd className="text-slate-900">{order.orderedBy?.name || '—'}</dd></div>
          <div><dt className="text-slate-500">Ordered</dt><dd className="text-slate-900">{dateTime(order.createdAt)}</dd></div>
        </dl>
        {order.instructions && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900"><span className="font-semibold">Doctor’s note: </span>{order.instructions}</p>}
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-800">Notes (optional)</span>
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Wound clean, dressing changed, no signs of infection" />
        </label>
        <ErrorNote>{error}</ErrorNote>
        <Button size="lg" className="w-full sm:w-auto" icon={CheckCircle2} loading={busy} onClick={done}>Mark done</Button>
      </div>
    </div>
  );
}
