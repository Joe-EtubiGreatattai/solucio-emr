import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CalendarDays, Pencil, ShieldCheck, UserPlus } from 'lucide-react';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { age, date, dateTime, fullName, naira } from '../../lib/format';
import { Avatar, Badge, Button, Spinner } from '../../components/ui';
import PatientPicker from '../../components/PatientPicker';
import PatientForm from './PatientForm';
import CheckIn from './CheckIn';
import { VISIT_STATUS } from './Today';

const OPEN = ['waiting', 'in_progress', 'awaiting_payment'];

export default function Reception() {
  const [params, setParams] = useSearchParams();
  const id = params.get('p');
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ open: false, patient: null });
  const { data: today, reload: reloadToday } = useFetch('/visits/today', { initial: [] });
  useLive(['visit', 'queue'], useCallback(() => reloadToday(), [reloadToday]));

  const load = useCallback((pid) => {
    if (!pid) { setPatient(null); return; }
    setLoading(true);
    api(`/patients/${pid}`).then(setPatient).catch(() => setPatient(null)).finally(() => setLoading(false));
  }, []);
  useEffect(() => load(id), [id, load]);
  const pick = (p) => setParams({ p: p._id });
  const openVisit = patient && today.find((v) => v.patient?._id === patient._id && OPEN.includes(v.status));

  return (
    <div>
      {!id ? (
        <FrontDesk today={today} onPick={pick} onRegister={() => setForm({ open: true, patient: null })} />
      ) : loading && !patient ? <Spinner /> : patient ? (
        <PatientView patient={patient} openVisit={openVisit} onBack={() => setParams({})} onEdit={() => setForm({ open: true, patient })} onCheckedIn={() => { reloadToday(); setParams({}); }} />
      ) : (
        <div className="card p-8 text-center"><p className="font-semibold text-slate-900">Patient not found</p><Button className="mt-3" variant="secondary" onClick={() => setParams({})}>Back to search</Button></div>
      )}
      <PatientForm open={form.open} patient={form.patient} onClose={() => setForm({ open: false, patient: null })}
        onSaved={(p) => (form.patient ? load(p._id) : pick(p))} />
    </div>
  );
}

function FrontDesk({ today, onPick, onRegister }) {
  const { data: online } = useFetch('/online-bookings?status=new&q=', { initial: { counts: {} } });
  const count = (s) => today.filter((v) => s.includes(v.status)).length;
  const checkedInToday = today.filter((v) => new Date(v.createdAt).toDateString() === new Date().toDateString() && v.status !== 'cancelled').length;
  const recent = today.filter((v) => v.status !== 'cancelled').slice(0, 6);
  const newOnline = online?.counts?.new || 0;
  return (
    <div className="space-y-4">
      <section className="card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Find a patient</h1>
            <p className="mt-1 text-sm text-slate-500">Search before registering, so nobody gets two records.</p>
          </div>
          <Button variant="secondary" icon={UserPlus} onClick={onRegister}>Register new patient</Button>
        </div>
        <PatientPicker onPick={onPick} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="font-semibold text-slate-900">Latest check-ins</h2>
            <Link to="/reception/today" className="text-sm font-medium text-brand-700 hover:underline">All of today</Link>
          </div>
          {!recent.length ? <p className="px-5 py-8 text-center text-sm text-slate-500">Nobody checked in yet today.</p> : (
            <ul className="divide-y divide-slate-100">
              {recent.map((v) => (
                <li key={v._id}>
                  <button type="button" onClick={() => onPick(v.patient)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 sm:px-5">
                    <Avatar name={fullName(v.patient)} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">{fullName(v.patient)}</span>
                      <span className="block truncate text-xs text-slate-500">{v.clinic?.name} · {dateTime(v.createdAt)}</span>
                    </span>
                    <Badge color={VISIT_STATUS[v.status]?.color}>{VISIT_STATUS[v.status]?.label}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-3">
          <div className="card grid grid-cols-3 divide-x divide-slate-100 text-center">
            {[['Today', checkedInToday], ['In the hospital', count(['waiting', 'in_progress'])], ['At the cashier', count(['awaiting_payment'])]].map(([l, n]) => (
              <div key={l} className="px-2 py-4"><p className="money text-2xl font-semibold text-slate-900">{n}</p><p className="text-xs text-slate-500">{l}</p></div>
            ))}
          </div>
          <Link to="/reception/appointments" className={`card flex items-center gap-3 p-4 transition-colors hover:border-brand-300 ${newOnline ? 'border-amber-300 bg-amber-50/50' : ''}`}>
            <CalendarDays className={`h-5 w-5 ${newOnline ? 'text-amber-600' : 'text-slate-400'}`} />
            <span className="flex-1 text-sm"><span className="block font-semibold text-slate-900">Online appointments</span><span className="text-slate-500">{newOnline ? `${newOnline} new to call back` : 'No new requests'}</span></span>
          </Link>
        </aside>
      </div>
    </div>
  );
}

function PatientView({ patient: p, openVisit, onBack, onEdit, onCheckedIn }) {
  const hmos = p.hmoMemberships || [];
  return (
    <div>
      <header className="card mb-4 flex flex-wrap items-center gap-4 p-4 sm:p-5">
        <button type="button" onClick={onBack} aria-label="Back to search" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"><ArrowLeft className="h-5 w-5" /></button>
        <Avatar name={fullName(p)} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-slate-900 sm:text-2xl">{fullName(p)}</h1>
          <p className="text-sm text-slate-500">{p.sex === 'male' ? 'Male' : 'Female'}{p.dob ? `, ${age(p.dob)}` : ''} · {p.patientNo}{p.folderNo ? ` · Folder ${p.folderNo}` : ''}</p>
        </div>
        <Button variant="secondary" icon={Pencil} onClick={onEdit}>Edit details</Button>
      </header>

      {(p.outstandingKobo > 0 || p.allergies?.length > 0) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {p.outstandingKobo > 0 && <p className="flex flex-1 items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" /><span>Owes <b className="money">{naira(p.outstandingKobo)}</b> from earlier visits. Ask them to settle it at the cashier.</span></p>}
          {p.allergies?.length > 0 && <p className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800"><AlertTriangle className="h-4 w-4" /> Allergic to {p.allergies.join(', ')}</p>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <section className="card p-4 sm:p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Contact and cover</h2>
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <Item label="Phone">{p.phone && <a className="text-brand-700 hover:underline" href={`tel:${p.phone}`}>{p.phone}</a>}</Item>
            <Item label="Date of birth">{p.dob && date(p.dob)}</Item>
            <Item label="Address" wide>{p.address}</Item>
            <Item label="Next of kin" wide>{p.nextOfKin?.name && <>{p.nextOfKin.name}{p.nextOfKin.relationship ? ` (${p.nextOfKin.relationship})` : ''}{p.nextOfKin.phone ? <> · <a className="text-brand-700 hover:underline" href={`tel:${p.nextOfKin.phone}`}>{p.nextOfKin.phone}</a></> : ''}</>}</Item>
            <Item label="HMO" wide>
              {hmos.length ? (
                <ul className="space-y-1">{hmos.map((m) => (
                  <li key={m._id} className="flex flex-wrap items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-700" />{m.hmo?.name}{m.plan?.name ? ` · ${m.plan.name}` : ''} · {m.memberNo}
                    {m.validTo && (new Date(m.validTo) < new Date() ? <Badge color="amber">Expired {date(m.validTo)}</Badge> : <span className="text-xs text-slate-500">valid to {date(m.validTo)}</span>)}</li>
                ))}</ul>
              ) : 'None. Pays cash.'}
            </Item>
          </dl>
        </section>

        <section className="card p-4 sm:p-5 lg:sticky lg:top-4">
          {openVisit ? (
            <div>
              <h2 className="font-semibold text-slate-900">Already checked in</h2>
              <p className="mt-1 text-sm text-slate-600">{openVisit.visitNo} at {openVisit.clinic?.name}, since {dateTime(openVisit.createdAt)}.</p>
              <p className="mt-3"><Badge color={VISIT_STATUS[openVisit.status]?.color}>{VISIT_STATUS[openVisit.status]?.label}</Badge></p>
              <p className="mt-3 text-xs text-slate-500">A new visit can start once this one is finished or cancelled (Today’s visits).</p>
            </div>
          ) : (
            <>
              <h2 className="mb-4 font-semibold text-slate-900">Check in</h2>
              <CheckIn key={p._id} patient={p} onDone={onCheckedIn} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Item({ label, children, wide }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-900">{children || <span className="text-slate-400">Not recorded</span>}</dd>
    </div>
  );
}
