import { useCallback } from 'react';
import { Activity, AlertTriangle, Clock, Users } from 'lucide-react';
import useFetch from '../lib/useFetch';
import { useLive } from '../lib/live';
import { age, fullName, minutes } from '../lib/format';
import { Avatar, Badge, Empty, Skeleton } from './ui';

export const PRIORITY = { 1: { label: 'Urgent', color: 'red' }, 2: { label: 'Normal', color: 'slate' }, 3: { label: 'Routine', color: 'slate' } };

/** A station's live queue. onOpen(entry) when someone is picked. */
export default function QueueList({ station, clinic, onOpen, emptyText = 'Nobody waiting.' }) {
  const path = `/queues/${station}${clinic ? `?clinic=${clinic}` : ''}`;
  const { data, loading, reload, error } = useFetch(path, { initial: [] });
  useLive(['queue'], useCallback(() => reload(), [reload]));
  if (loading) return <div className="space-y-2 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  if (error) return <p className="p-4 text-sm text-rose-700">{error}</p>;
  const urgent = data.filter((e) => e.priority === 1).length;
  const inProgress = data.filter((e) => e.status === 'in_progress').length;
  return (
    <div>
      <div className="grid grid-cols-3 divide-x divide-white/10 bg-gradient-to-r from-slate-900 to-slate-800 px-2 py-4 text-white sm:px-5">
        <div className="px-2 sm:px-3"><span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300 sm:text-xs"><Users size={14} /> In queue</span><strong className="mt-1 block text-2xl font-bold tracking-tight sm:text-3xl">{data.length}</strong></div>
        <div className="px-2 sm:px-3"><span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300 sm:text-xs"><AlertTriangle size={14} /> Urgent</span><strong className="mt-1 block text-2xl font-bold tracking-tight sm:text-3xl">{urgent}</strong></div>
        <div className="px-2 sm:px-3"><span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300 sm:text-xs"><Activity size={14} /> In progress</span><strong className="mt-1 block text-2xl font-bold tracking-tight sm:text-3xl">{inProgress}</strong></div>
      </div>
      {!data.length ? <Empty title={emptyText} icon={Clock}>New patients appear here automatically. This queue refreshes as the team checks in and completes visits.</Empty> : (
        <ul className="stagger divide-y divide-slate-100 px-2 py-1 sm:px-3">
          {data.map((e) => (
            <li key={e._id}>
              <button type="button" onClick={() => onOpen(e)} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left transition hover:bg-brand-50/60 focus-visible:bg-brand-50/60 sm:gap-4 sm:px-4">
                <Avatar name={fullName(e.patient)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900 group-hover:text-brand-800">{fullName(e.patient)}</span>
                  <span className="mt-0.5 block truncate text-sm text-slate-500">
                    {e.patient?.patientNo} · {e.patient?.sex === 'male' ? 'M' : 'F'}{e.patient?.dob ? ` · ${age(e.patient.dob)}` : ''}{e.visit?.complaint ? ` · ${e.visit.complaint}` : ''}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {e.priority === 1 && <Badge color="red">Urgent</Badge>}
                  {e.status === 'in_progress' ? <Badge color="teal">With {e.station === 'doctor' ? 'doctor' : 'staff'}</Badge> : <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500"><Clock size={13} />{minutes(e.waitingMinutes)}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
