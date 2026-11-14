import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRightLeft, BedDouble, Building2, LogOut, Plus, Search, UserPlus, Wrench, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch.js';
import { useLive } from '../../lib/live.js';
import { age, dateTime, fullName } from '../../lib/format.js';
import { bedNumbers, daysIn } from '../../lib/wards.js';
import { useAuth } from '../../auth.jsx';
import PatientPicker from '../../components/PatientPicker.jsx';
import { Badge, Button, ErrorNote, Field, Modal, Skeleton } from '../../components/ui.jsx';

const LONG_STAY = 8; // days; flagged so long stays get reviewed

export default function WardManagement() {
  const { can } = useAuth();
  const isAdmin = can('admin');
  const canCare = can('doctor', 'nurse');
  const { data: wards, loading, error: wardsError, reload: reloadWards } = useFetch('/wards', { initial: [] });
  const { data: admissions, error: admError, reload: reloadAdmissions } = useFetch('/admissions', { initial: [] });
  const refresh = useCallback(() => { reloadWards(); reloadAdmissions(); }, [reloadWards, reloadAdmissions]);
  useLive(['ward'], refresh);

  const [wardId, setWardId] = useState('all');
  const [selected, setSelected] = useState(null); // { kind: 'bed', id } | { kind: 'admit' }
  const [q, setQ] = useState('');
  const [wardModal, setWardModal] = useState(false);
  const [bedsFor, setBedsFor] = useState(null);

  const byBed = useMemo(() => new Map(admissions.map((a) => [String(a.bed?._id || a.bed), a])), [admissions]);
  const beds = useMemo(() => wards.flatMap((w) => (w.beds || []).map((b) => ({ ...b, ward: w, admission: byBed.get(String(b._id)) }))), [wards, byBed]);
  const freeBeds = beds.filter((b) => b.status === 'available' && b.ward.active);
  const totals = { all: beds.length, used: beds.filter((b) => b.status === 'occupied').length, out: beds.filter((b) => b.status === 'maintenance').length };
  const shownWards = wardId === 'all' ? wards : wards.filter((w) => w._id === wardId);
  const term = q.trim().toLowerCase();
  const matches = (b) => !term || (b.admission && `${fullName(b.admission.patient)} ${b.admission.patient?.patientNo}`.toLowerCase().includes(term)) || b.bedNo.toLowerCase().includes(term);
  const selectedBed = selected?.kind === 'bed' ? beds.find((b) => b._id === selected.id) : null;

  // A searched patient's ward opens by itself
  useEffect(() => {
    if (!term) return;
    const hit = beds.find((b) => b.admission && matches(b));
    if (hit && wardId !== 'all' && hit.ward._id !== wardId) setWardId('all');
  }, [term]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => setSelected(null);
  const done = () => { close(); refresh(); };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Wards & beds</h1>
          <p className="mt-1 text-sm text-slate-500">
            {totals.all ? <>{totals.used} of {totals.all} beds in use · {freeBeds.length} free{totals.out > 0 && ` · ${totals.out} out of service`}</> : 'No beds set up yet'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCare && <Button icon={UserPlus} disabled={!freeBeds.length} onClick={() => setSelected({ kind: 'admit' })}>Admit a patient</Button>}
          {isAdmin && <Button variant="secondary" icon={Plus} onClick={() => setWardModal(true)}>Add ward</Button>}
        </div>
      </div>

      {(wardsError || admError) && <div className="mb-4"><ErrorNote>{wardsError || admError}</ErrorNote></div>}

      {loading && !wards.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : !wards.length ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
          <Building2 className="h-9 w-9 text-brand-600" />
          <p className="text-lg font-semibold text-slate-900">No wards yet</p>
          <p className="max-w-sm text-sm text-slate-500">{isAdmin ? 'Add a ward, then add its beds. Staff can then admit patients straight onto a bed.' : 'An administrator needs to set up wards and beds first.'}</p>
          {isAdmin && <Button className="mt-3" icon={Plus} onClick={() => setWardModal(true)}>Add the first ward</Button>}
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <WardTab active={wardId === 'all'} onClick={() => setWardId('all')} label="All wards" used={totals.used} total={totals.all} />
            {wards.map((w) => <WardTab key={w._id} active={wardId === w._id} onClick={() => setWardId(w._id)} label={w.name} used={w.counts?.occupied || 0} total={w.counts?.total || 0} closed={!w.active} />)}
            <label className="relative ml-auto w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="input !rounded-full pl-9" placeholder="Find a patient or bed" aria-label="Find a patient or bed" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
            <div className="space-y-5">
              {shownWards.map((w) => (
                <section key={w._id} className="card p-4 sm:p-5">
                  <header className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">{w.name}{!w.active && <Badge color="red">Closed</Badge>}</h2>
                      <p className="text-sm text-slate-500">{w.counts?.available || 0} free of {w.counts?.total || 0}{w.description ? ` · ${w.description}` : ''}</p>
                    </div>
                    <Occupancy used={w.counts?.occupied || 0} out={w.counts?.maintenance || 0} total={w.counts?.total || 0} />
                    {isAdmin && (
                      <div className="flex gap-1.5">
                        {w.active && <Button size="sm" variant="secondary" icon={Plus} onClick={() => setBedsFor(w)}>Add beds</Button>}
                        <WardToggle ward={w} onDone={refresh} />
                      </div>
                    )}
                  </header>
                  {!w.beds?.length ? (
                    <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">{isAdmin ? 'No beds yet. Use “Add beds” to create them.' : 'No beds in this ward yet.'}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                      {beds.filter((b) => b.ward._id === w._id).map((b) => (
                        <BedTile key={b._id} bed={b} selected={selected?.id === b._id} dim={Boolean(term) && !matches(b)} onClick={() => setSelected({ kind: 'bed', id: b._id })} />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>

            <aside className={`${selected ? 'fixed inset-0 z-40 overflow-y-auto bg-slate-100 p-3 lg:inset-auto lg:z-auto lg:overflow-visible lg:bg-transparent lg:p-0' : 'hidden lg:block'} lg:sticky lg:top-4`}>
              {selected?.kind === 'admit' && <AdmitPanel freeBeds={freeBeds} onClose={close} onDone={done} />}
              {selectedBed && <BedPanel bed={selectedBed} freeBeds={freeBeds} isAdmin={isAdmin} canCare={canCare} onClose={close} onDone={done} />}
              {!selected && (
                <div className="card px-6 py-10 text-center">
                  <BedDouble className="mx-auto h-9 w-9 text-brand-600" />
                  <p className="mt-2 font-semibold text-slate-900">Select a bed</p>
                  <p className="mt-1 text-sm text-slate-500">{canCare ? 'Pick a free bed to admit someone, or an occupied bed to transfer or discharge.' : 'Pick a bed to see who is in it.'}</p>
                  <Legend />
                </div>
              )}
            </aside>
          </div>
        </>
      )}

      <AddWardModal open={wardModal} onClose={() => setWardModal(false)} onDone={() => { setWardModal(false); refresh(); }} />
      <AddBedsModal ward={bedsFor} onClose={() => setBedsFor(null)} onDone={() => { setBedsFor(null); refresh(); }} />
    </div>
  );
}

function WardTab({ active, onClick, label, used, total, closed }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${active ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
      <span className={closed ? 'line-through opacity-70' : ''}>{label}</span>
      <span className={`money text-xs ${active ? 'text-brand-100' : 'text-slate-500'}`}>{used}/{total}</span>
    </button>
  );
}

function Occupancy({ used, out, total }) {
  if (!total) return null;
  const pct = (n) => `${(n / total) * 100}%`;
  return (
    <div className="hidden w-36 sm:block" aria-label={`${used} of ${total} beds in use`}>
      <div className="flex h-2 overflow-hidden rounded-full bg-emerald-100">
        <span className="bg-brand-600" style={{ width: pct(used) }} />
        <span className="bg-slate-300" style={{ width: pct(out) }} />
      </div>
      <p className="mt-1 text-right text-xs text-slate-500">{Math.round((used / total) * 100)}% full</p>
    </div>
  );
}

function Legend() {
  return (
    <ul className="mt-5 space-y-1.5 text-left text-xs text-slate-600">
      <li className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-dashed border-emerald-400 bg-white" /> Free</li>
      <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-brand-600" /> Patient in bed</li>
      <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-amber-400" /> In longer than a week</li>
      <li className="flex items-center gap-2"><span className="hatched h-3 w-3 rounded border border-slate-300" /> Out of service</li>
    </ul>
  );
}

function BedTile({ bed, selected, dim, onClick }) {
  const a = bed.admission;
  const days = a ? daysIn(a.admittedAt) : 0;
  const ring = selected ? 'ring-2 ring-brand-600 ring-offset-2' : '';
  const base = `relative flex min-h-28 flex-col rounded-xl border p-3 text-left transition ${ring} ${dim ? 'opacity-35' : ''}`;
  if (bed.status === 'occupied') {
    return (
      <button type="button" onClick={onClick} className={`${base} border-slate-200 bg-white hover:border-slate-300`}>
        <span className={`absolute inset-y-2 left-0 w-1 rounded-r ${days >= LONG_STAY ? 'bg-amber-400' : 'bg-brand-600'}`} />
        <span className="flex items-center justify-between text-xs font-semibold text-slate-500">{bed.bedNo}
          {a?.patient?.allergies?.length > 0 && <AlertTriangle className="h-3.5 w-3.5 text-rose-600" aria-label="Has allergies" />}
        </span>
        <span className="mt-1.5 line-clamp-2 font-semibold leading-snug text-slate-900">{a ? fullName(a.patient) : 'Occupied'}</span>
        {a && (
          <span className="mt-auto pt-1 text-xs text-slate-500">
            {a.patient?.sex === 'male' ? 'M' : 'F'}{a.patient?.dob ? `, ${age(a.patient.dob)}` : ''} · <span className={days >= LONG_STAY ? 'font-semibold text-amber-700' : ''}>Day {days}</span>
          </span>
        )}
      </button>
    );
  }
  if (bed.status === 'maintenance') {
    return (
      <button type="button" onClick={onClick} className={`${base} hatched border-slate-200 text-slate-500`}>
        <span className="text-xs font-semibold">{bed.bedNo}</span>
        <span className="mt-auto flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium"><Wrench className="h-3 w-3" /> Out of service</span>
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={!bed.ward.active}
      className={`${base} border-dashed border-emerald-300 bg-white hover:border-emerald-500 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-50`}>
      <span className="text-xs font-semibold text-slate-500">{bed.bedNo}</span>
      <span className="mt-auto text-sm font-semibold text-emerald-700">Free</span>
      <span className="text-xs text-slate-400">{bed.type}</span>
    </button>
  );
}

function PanelShell({ title, sub, onClose, children }) {
  return (
    <div className="card overflow-hidden">
      <header className="flex items-start gap-3 border-b border-slate-100 p-4">
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
          <ArrowLeft className="h-4 w-4 lg:hidden" /><X className="hidden h-4 w-4 lg:block" />
        </button>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {sub && <p className="text-sm text-slate-500">{sub}</p>}
        </div>
      </header>
      <div className="space-y-4 p-4">{children}</div>
    </div>
  );
}

function FreeBedChooser({ beds, value, onChange, exclude }) {
  const options = beds.filter((b) => b._id !== exclude);
  const groups = options.reduce((m, b) => { (m[b.ward.name] ||= []).push(b); return m; }, {});
  if (!options.length) return <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">There are no free beds in open wards.</p>;
  return (
    <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
      {Object.entries(groups).map(([ward, list]) => (
        <div key={ward}>
          <p className="mb-1.5 text-xs font-semibold text-slate-500">{ward}</p>
          <div className="flex flex-wrap gap-1.5">
            {list.map((b) => (
              <button key={b._id} type="button" onClick={() => onChange(b._id)} aria-pressed={value === b._id}
                className={`rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition-colors ${value === b._id ? 'border-brand-700 bg-brand-700 text-white' : 'border-emerald-300 bg-white text-slate-700 hover:bg-emerald-50'}`}>
                {b.bedNo}{b.type !== 'Standard' && <span className={`ml-1 text-xs font-normal ${value === b._id ? 'text-brand-100' : 'text-slate-400'}`}>{b.type}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AdmitForm({ bedId, freeBeds, onDone }) {
  const [patient, setPatient] = useState(null);
  const [chosen, setChosen] = useState(bedId || '');
  const [reason, setReason] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function admit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/admissions', { method: 'POST', body: { patientId: patient._id, bedId: chosen, reason, diagnosis } });
      const bed = freeBeds.find((b) => b._id === chosen);
      toast.success(`${fullName(patient)} admitted to ${bed ? `${bed.ward.name}, bed ${bed.bedNo}` : 'the ward'}`);
      onDone();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={admit} className="space-y-4">
      <div>
        <span className="mb-1.5 block text-sm font-semibold text-slate-800">Patient</span>
        {patient ? (
          <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-3">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-slate-900">{fullName(patient)}</span>
              <span className="text-xs text-slate-600">{patient.patientNo}{patient.dob ? ` · ${age(patient.dob)}` : ''}</span>
              {patient.allergies?.length > 0 && <span className="mt-1 block text-xs font-semibold text-rose-700">Allergic to {patient.allergies.join(', ')}</span>}
            </span>
            <Button size="sm" variant="ghost" type="button" onClick={() => setPatient(null)}>Change</Button>
          </div>
        ) : <PatientPicker onPick={setPatient} autoFocus placeholder="Name, phone or patient number" />}
      </div>
      {!bedId && (
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-slate-800">Bed</span>
          <FreeBedChooser beds={freeBeds} value={chosen} onChange={setChosen} />
        </div>
      )}
      <Field label="Reason for admission"><textarea className="input" required maxLength={1000} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Observation after appendicectomy" /></Field>
      <Field label="Working diagnosis (optional)"><input className="input" maxLength={500} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} /></Field>
      <ErrorNote>{error}</ErrorNote>
      <Button type="submit" className="w-full" size="lg" icon={UserPlus} loading={busy} disabled={!patient || !chosen || !reason.trim()}>Admit</Button>
    </form>
  );
}

function AdmitPanel({ freeBeds, onClose, onDone }) {
  return (
    <PanelShell title="Admit a patient" sub={`${freeBeds.length} free bed${freeBeds.length === 1 ? '' : 's'}`} onClose={onClose}>
      <AdmitForm freeBeds={freeBeds} onDone={onDone} />
    </PanelShell>
  );
}

function BedPanel({ bed, freeBeds, isAdmin, canCare, onClose, onDone }) {
  const where = `${bed.ward.name} · ${bed.type}`;
  if (bed.status === 'occupied') return <OccupiedPanel bed={bed} freeBeds={freeBeds} canCare={canCare} onClose={onClose} onDone={onDone} />;
  if (bed.status === 'maintenance') {
    return (
      <PanelShell title={`Bed ${bed.bedNo}`} sub={where} onClose={onClose}>
        <p className="flex items-center gap-2 text-sm text-slate-600"><Wrench className="h-4 w-4" /> Out of service. It isn’t offered for admissions.</p>
        {isAdmin ? <BedStatusButton bed={bed} to="available" onDone={onDone} /> : <p className="text-sm text-slate-500">An administrator can return it to service.</p>}
      </PanelShell>
    );
  }
  return (
    <PanelShell title={`Bed ${bed.bedNo} is free`} sub={where} onClose={onClose}>
      {canCare ? <AdmitForm key={bed._id} bedId={bed._id} freeBeds={freeBeds} onDone={onDone} /> : <p className="text-sm text-slate-500">Doctors and nurses can admit a patient here.</p>}
      {isAdmin && <div className="border-t border-slate-100 pt-4"><BedStatusButton bed={bed} to="maintenance" onDone={onDone} /></div>}
    </PanelShell>
  );
}

function OccupiedPanel({ bed, freeBeds, canCare, onClose, onDone }) {
  const a = bed.admission;
  const [mode, setMode] = useState('');
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setMode(''); setTarget(''); setNote(''); setError(''); }, [bed._id]);
  if (!a) return <PanelShell title={`Bed ${bed.bedNo}`} sub={bed.ward.name} onClose={onClose}><p className="text-sm text-slate-500">Loading the admission…</p></PanelShell>;
  const p = a.patient;
  const days = daysIn(a.admittedAt);

  async function act(path, body, message) {
    setBusy(true);
    setError('');
    try { await api(path, { method: 'POST', body }); toast.success(message); onDone(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const targetBed = freeBeds.find((b) => b._id === target);

  return (
    <PanelShell title={fullName(p)} sub={`${p?.sex === 'male' ? 'Male' : 'Female'}${p?.dob ? `, ${age(p.dob)}` : ''} · ${p?.patientNo}`} onClose={onClose}>
      {p?.allergies?.length > 0 && <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800"><AlertTriangle className="h-4 w-4" /> Allergic to {p.allergies.join(', ')}</p>}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-slate-500">Bed</dt><dd className="font-semibold text-slate-900">{bed.bedNo}, {bed.ward.name}</dd></div>
        <div><dt className="text-slate-500">Stay</dt><dd className={`font-semibold ${days >= LONG_STAY ? 'text-amber-700' : 'text-slate-900'}`}>Day {days}</dd></div>
        <div className="col-span-2"><dt className="text-slate-500">Reason</dt><dd className="text-slate-900">{a.reason}</dd></div>
        {a.diagnosis && <div className="col-span-2"><dt className="text-slate-500">Working diagnosis</dt><dd className="text-slate-900">{a.diagnosis}</dd></div>}
        <div className="col-span-2"><dt className="text-slate-500">Admitted</dt><dd className="text-slate-900">{dateTime(a.admittedAt)}{a.admittedBy?.name ? ` by ${a.admittedBy.name}` : ''}</dd></div>
      </dl>

      {canCare && mode === '' && (
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" icon={ArrowRightLeft} onClick={() => setMode('transfer')} disabled={!freeBeds.length}>Move bed</Button>
          <Button variant="danger-soft" icon={LogOut} onClick={() => setMode('discharge')}>Discharge</Button>
        </div>
      )}
      {mode === 'transfer' && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold text-slate-800">Move {p?.firstName} to</p>
          <FreeBedChooser beds={freeBeds} value={target} onChange={setTarget} exclude={bed._id} />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setMode('')}>Back</Button>
            <Button className="flex-1" loading={busy} disabled={!target} onClick={() => act(`/admissions/${a._id}/transfer`, { bedId: target }, `Moved to ${targetBed?.ward.name}, bed ${targetBed?.bedNo}`)}>
              {targetBed ? `Move to ${targetBed.bedNo}` : 'Choose a bed'}
            </Button>
          </div>
        </div>
      )}
      {mode === 'discharge' && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <Field label="Discharge note (optional)"><textarea className="input" rows={3} maxLength={2000} autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="Condition on discharge, follow-up, medicines to continue" /></Field>
          <p className="text-xs text-slate-500">Bed {bed.bedNo} becomes free straight away.</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setMode('')}>Back</Button>
            <Button className="flex-1" variant="danger" loading={busy} onClick={() => act(`/admissions/${a._id}/discharge`, { dischargeNote: note }, `${fullName(p)} discharged`)}>Discharge</Button>
          </div>
        </div>
      )}
      <ErrorNote>{error}</ErrorNote>
    </PanelShell>
  );
}

function BedStatusButton({ bed, to, onDone }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await api(`/beds/${bed._id}`, { method: 'PATCH', body: { status: to } });
      toast.success(to === 'maintenance' ? `Bed ${bed.bedNo} taken out of service` : `Bed ${bed.bedNo} back in service`);
      onDone();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  return to === 'maintenance'
    ? <Button variant="ghost" size="sm" icon={Wrench} loading={busy} onClick={go}>Take out of service</Button>
    : <Button className="w-full" icon={BedDouble} loading={busy} onClick={go}>Return to service</Button>;
}

function WardToggle({ ward, onDone }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await api(`/wards/${ward._id}`, { method: 'PATCH', body: { active: !ward.active } }); toast.success(ward.active ? `${ward.name} closed` : `${ward.name} reopened`); onDone(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  return <Button size="sm" variant="ghost" loading={busy} onClick={go} title={ward.active ? 'Stops new admissions here. Patients already in beds stay.' : 'Allows admissions again'}>{ward.active ? 'Close ward' : 'Reopen'}</Button>;
}

function AddWardModal({ open, onClose, onDone }) {
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setForm({ name: '', code: '', description: '' }); setError(''); } }, [open]);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try { await api('/wards', { method: 'POST', body: form }); toast.success(`${form.name} added`); onDone(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Add a ward" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="ward-form" loading={busy}>Add ward</Button></>}>
      <form id="ward-form" onSubmit={save} className="space-y-3">
        <Field label="Name"><input className="input" required maxLength={100} autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Female Surgical Ward" /></Field>
        <Field label="Short code" hint="Used at the start of bed numbers, e.g. FSW-01"><input className="input uppercase" required maxLength={16} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="FSW" /></Field>
        <Field label="Notes (optional)"><input className="input" maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Second floor, east wing" /></Field>
        <ErrorNote>{error}</ErrorNote>
      </form>
    </Modal>
  );
}

function AddBedsModal({ ward, onClose, onDone }) {
  const [form, setForm] = useState({ prefix: '', from: '1', to: '10', type: 'Standard' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!ward) return;
    const next = (ward.beds?.length || 0) + 1;
    setForm({ prefix: `${ward.code}-`, from: String(next), to: String(next + 9), type: 'Standard' });
    setError('');
  }, [ward]);
  const names = ward ? bedNumbers(form.prefix, form.from, form.to, (ward.beds || []).map((b) => b.bedNo)) : [];

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    let made = 0;
    try {
      for (const bedNo of names) { await api(`/wards/${ward._id}/beds`, { method: 'POST', body: { bedNo, type: form.type } }); made += 1; }
      toast.success(`${made} bed${made === 1 ? '' : 's'} added to ${ward.name}`);
      onDone();
    } catch (err) { setError(`${made} added, then: ${err.message}`); } finally { setBusy(false); }
  }

  return (
    <Modal open={Boolean(ward)} onClose={onClose} title={ward ? `Add beds to ${ward.name}` : 'Add beds'} guardChanges={false}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="beds-form" loading={busy} disabled={!names.length}>Add {names.length} bed{names.length === 1 ? '' : 's'}</Button></>}>
      <form id="beds-form" onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Field label="Starts with"><input className="input" maxLength={20} value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })} /></Field>
          <Field label="From"><input className="input money" type="number" min="0" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></Field>
          <Field label="To"><input className="input money" type="number" min="0" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></Field>
        </div>
        <Field label="Bed type">
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{['Standard', 'Isolation', 'ICU', 'Maternity', 'Paediatric', 'Private room'].map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {names.length ? <>Will add: <b className="text-slate-900">{names.length > 6 ? `${names.slice(0, 3).join(', ')} … ${names.at(-1)}` : names.join(', ')}</b></> : 'Nothing to add: check the numbers, or those beds already exist.'}
        </p>
        <ErrorNote>{error}</ErrorNote>
      </form>
    </Modal>
  );
}
