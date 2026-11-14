import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, LogIn, Pencil, Search, UserPlus, X } from 'lucide-react';
import { api } from '../../api.js';
import { Button, Card, PageHeader, Spinner } from '../../components/ui';
import PatientPicker from '../../components/PatientPicker';
import PatientBanner from '../../components/PatientBanner';
import PatientForm from './PatientForm';
import CheckIn from './CheckIn';
import { date } from '../../lib/format';

export default function Reception() {
  const [params, setParams] = useSearchParams();
  const id = params.get('p');
  const [patient, setPatient] = useState(null);
  const [form, setForm] = useState({ open: false, patient: null });
  const [checkIn, setCheckIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = (pid) => {
    if (!pid) { setPatient(null); return; }
    setLoading(true);
    api(`/patients/${pid}`).then(setPatient).catch(() => setPatient(null)).finally(() => setLoading(false));
  };
  useEffect(() => load(id), [id]);
  const pick = (p) => setParams({ p: p._id });

  return (
    <div>
      <PageHeader title="Patients" subtitle="Find the patient first. New here? Register them."
        actions={<Button icon={UserPlus} onClick={() => setForm({ open: true, patient: null })}>Register new patient</Button>} />
      {!id && (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,.8fr)]">
          <Card title="Find a patient" subtitle="Search by name, phone number, patient number or folder number." bodyClass="p-4 sm:p-5"><PatientPicker onPick={pick} /></Card>
          <aside className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_28px_-20px_rgba(15,23,42,0.35)]">
            <div className="bg-gradient-to-br from-brand-900 to-slate-800 px-5 py-5 text-white sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-100">Reception workflow</p>
              <h2 className="mt-2 text-xl font-bold tracking-tight">A clear first step for every visit</h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-300">Verify the patient before opening a new visit to keep their record complete.</p>
            </div>
            <ol className="space-y-1 p-4 sm:p-5">
              {[
                { icon: Search, title: 'Find the patient', detail: 'Check for an existing record first.' },
                { icon: ClipboardCheck, title: 'Confirm their details', detail: 'Verify identity and coverage.' },
                { icon: ArrowRight, title: 'Check in to a clinic', detail: 'The care team receives the visit.' },
              ].map(({ icon: Icon, title, detail }, index) => (
                <li key={title} className="flex items-center gap-3 rounded-xl px-2 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon size={17} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{detail}</span></span>
                  <span className="text-xs font-semibold tabular-nums text-slate-400">0{index + 1}</span>
                </li>
              ))}
            </ol>
            <div className="mx-5 mb-5 rounded-xl border border-amber-100 bg-amber-50/70 px-3.5 py-3 text-xs leading-5 text-amber-900 sm:mx-6 sm:mb-6">
              Protect patient privacy: confirm two identifiers before making changes to a record.
            </div>
          </aside>
        </div>
      )}
      {id && loading && <Spinner />}
      {id && patient && (
        <>
          <PatientBanner patient={patient} outstandingKobo={patient.outstandingKobo}
            action={<Button variant="ghost" icon={X} onClick={() => setParams({})}>Find another</Button>} />
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Card title="Details" action={<Button size="sm" variant="secondary" icon={Pencil} onClick={() => setForm({ open: true, patient })}>Edit</Button>}>
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <Item label="Phone">{patient.phone}</Item>
                <Item label="Date of birth">{patient.dob && date(patient.dob)}</Item>
                <Item label="Address">{patient.address}</Item>
                <Item label="Next of kin">{patient.nextOfKin?.name && `${patient.nextOfKin.name}${patient.nextOfKin.relationship ? ` (${patient.nextOfKin.relationship})` : ''} ${patient.nextOfKin.phone || ''}`}</Item>
                <Item label="HMO">{patient.hmoMemberships?.map((m) => `${m.hmo?.name} ${m.plan?.name || ''} · ${m.memberNo}`).join('; ')}</Item>
                <Item label="Old folder no.">{patient.folderNo}</Item>
              </dl>
            </Card>
            <Card title="Next step">
              <p className="mb-4 text-sm text-slate-500">Check {patient.firstName === '-' ? 'the patient' : patient.firstName} in. They go to the nurse for vitals, then to the doctor.</p>
              <Button className="w-full" size="lg" icon={LogIn} onClick={() => setCheckIn(true)}>Check in</Button>
            </Card>
          </div>
        </>
      )}
      <PatientForm open={form.open} patient={form.patient} onClose={() => setForm({ open: false, patient: null })}
        onSaved={(p) => (form.patient ? load(p._id) : pick(p))} />
      <CheckIn open={checkIn} onClose={() => setCheckIn(false)} patient={patient} onDone={() => setParams({})} />
    </div>
  );
}

function Item({ label, children }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-0.5 text-slate-800">{children || '—'}</dd></div>;
}
