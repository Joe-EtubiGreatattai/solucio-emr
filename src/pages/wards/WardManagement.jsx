import { useCallback, useMemo, useState } from 'react';
import { Activity, BedDouble, Building2, Check, Clock3, Plus, ShieldAlert, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch.js';
import { useLive } from '../../lib/live.js';
import { age, dateTime, fullName } from '../../lib/format.js';
import { useAuth } from '../../auth.jsx';
import PatientPicker from '../../components/PatientPicker.jsx';
import { Badge, Button, Card, Confirm, ErrorNote, Field, Modal, PageHeader, Spinner } from '../../components/ui.jsx';

const BED_STYLE = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300',
  occupied: 'border-amber-200 bg-amber-50 text-amber-900',
  maintenance: 'border-slate-200 bg-slate-100 text-slate-500 hover:border-slate-300',
};
const BED_LABEL = { available: 'Available', occupied: 'Occupied', maintenance: 'Maintenance' };

export default function WardManagement() {
  const { can } = useAuth();
  const isAdmin = can('admin');
  const canAdmit = can('doctor', 'nurse');
  const { data: wards, loading: wardsLoading, error: wardsError, reload: reloadWards } = useFetch('/wards', { initial: [] });
  const { data: admissions, loading: admissionsLoading, error: admissionsError, reload: reloadAdmissions } = useFetch('/admissions', { initial: [] });
  const refresh = useCallback(() => { reloadWards(); reloadAdmissions(); }, [reloadWards, reloadAdmissions]);
  useLive(['ward'], refresh);

  const [wardModal, setWardModal] = useState(false);
  const [bedWard, setBedWard] = useState(null);
  const [admitModal, setAdmitModal] = useState(false);
  const [transferAdmission, setTransferAdmission] = useState(null);
  const [dischargeAdmission, setDischargeAdmission] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wardForm, setWardForm] = useState({ name: '', code: '', description: '' });
  const [bedForm, setBedForm] = useState({ bedNo: '', type: 'Standard' });
  const [patient, setPatient] = useState(null);
  const [admissionForm, setAdmissionForm] = useState({ bedId: '', reason: '', diagnosis: '' });
  const [transferBedId, setTransferBedId] = useState('');
  const [confirmBed, setConfirmBed] = useState(null);

  const allBeds = useMemo(() => wards.flatMap((ward) => (ward.beds || []).map((bed) => ({ ...bed, wardName: ward.name, wardCode: ward.code, wardActive: ward.active }))), [wards]);
  const availableBeds = allBeds.filter((bed) => bed.status === 'available' && bed.wardActive);
  const activeByBed = useMemo(() => new Map(admissions.map((admission) => [String(admission.bed?._id || admission.bed), admission])), [admissions]);
  const counts = allBeds.reduce((totals, bed) => { totals[bed.status] = (totals[bed.status] || 0) + 1; return totals; }, {});

  async function createWard(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      await api('/wards', { method: 'POST', body: wardForm });
      toast.success('Ward added'); setWardModal(false); setWardForm({ name: '', code: '', description: '' }); refresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function createBed(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      await api(`/wards/${bedWard._id}/beds`, { method: 'POST', body: bedForm });
      toast.success('Bed added'); setBedWard(null); setBedForm({ bedNo: '', type: 'Standard' }); refresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function changeBedStatus() {
    if (!confirmBed) return;
    try {
      await api(`/beds/${confirmBed._id}`, { method: 'PATCH', body: { status: confirmBed.status === 'available' ? 'maintenance' : 'available' } });
      toast.success(confirmBed.status === 'available' ? 'Bed marked for maintenance' : 'Bed available again');
      setConfirmBed(null); refresh();
    } catch (e) { toast.error(e.message); }
  }

  async function createAdmission(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      await api('/admissions', { method: 'POST', body: { patientId: patient._id, ...admissionForm } });
      toast.success('Patient admitted'); setAdmitModal(false); setPatient(null); setAdmissionForm({ bedId: '', reason: '', diagnosis: '' }); refresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function transfer() {
    if (!transferAdmission || !transferBedId) return;
    setBusy(true);
    try {
      await api(`/admissions/${transferAdmission._id}/transfer`, { method: 'POST', body: { bedId: transferBedId } });
      toast.success('Patient transferred'); setTransferAdmission(null); setTransferBedId(''); refresh();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function discharge() {
    if (!dischargeAdmission) return;
    setBusy(true);
    try {
      await api(`/admissions/${dischargeAdmission._id}/discharge`, { method: 'POST', body: {} });
      toast.success('Patient discharged; bed is available'); setDischargeAdmission(null); refresh();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function toggleWard(ward) {
    try {
      await api(`/wards/${ward._id}`, { method: 'PATCH', body: { active: !ward.active } });
      toast.success(ward.active ? 'Ward closed' : 'Ward reopened'); refresh();
    } catch (e) { toast.error(e.message); }
  }

  const busyLoading = wardsLoading || admissionsLoading;
  return (
    <div>
      <PageHeader title="Wards & beds" subtitle="Track bed availability and manage inpatient admissions."
        actions={<>{canAdmit && <Button icon={UserRound} onClick={() => { setError(''); setAdmitModal(true); }}>Admit patient</Button>}{isAdmin && <Button variant="secondary" icon={Plus} onClick={() => { setError(''); setWardModal(true); }}>Add ward</Button>}</>} />

      {busyLoading && !wards.length && <Spinner />}
      {(wardsError || admissionsError) && <div className="mb-4"><ErrorNote>{wardsError || admissionsError}</ErrorNote></div>}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat icon={BedDouble} label="Total beds" value={allBeds.length} tone="slate" />
        <Stat icon={Check} label="Available" value={counts.available || 0} tone="green" />
        <Stat icon={Activity} label="Occupied" value={counts.occupied || 0} tone="amber" />
      </div>

      <section className="mb-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><h2 className="text-lg font-bold tracking-tight text-slate-900">Bed board</h2><p className="text-sm text-slate-500">Current state across each ward.</p></div>
          <div className="hidden flex-wrap gap-2 sm:flex"><Badge color="green">Available</Badge><Badge color="amber">Occupied</Badge><Badge>Maintenance</Badge></div>
        </div>
        {!wards.length && !wardsLoading ? (
          <Card className="text-center" bodyClass="px-5 py-10"><Building2 className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-semibold text-slate-800">No wards configured</p><p className="mt-1 text-sm text-slate-500">{isAdmin ? 'Add a ward, then add its beds to start the inpatient bed board.' : 'Ask an administrator to configure wards and beds.'}</p>{isAdmin && <Button className="mt-4" icon={Plus} onClick={() => setWardModal(true)}>Add first ward</Button>}</Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {wards.map((ward) => (
              <Card key={ward._id} title={ward.name} subtitle={`${ward.code}${ward.description ? ` · ${ward.description}` : ''}`} bodyClass="p-4" action={<div className="flex items-center gap-2">{!ward.active && <Badge color="red">Closed</Badge>}{isAdmin && <>{ward.active && <Button size="sm" variant="secondary" icon={Plus} onClick={() => { setError(''); setBedWard(ward); }}>Add bed</Button>}<Button size="sm" variant="ghost" onClick={() => toggleWard(ward)}>{ward.active ? 'Close ward' : 'Reopen'}</Button></>}</div>}>
                <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500"><span>{ward.counts?.available || 0} available</span><span>{ward.counts?.occupied || 0} occupied</span><span>{ward.counts?.maintenance || 0} maintenance</span></div>
                {!ward.beds?.length ? <p className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-sm text-slate-500">No beds added to this ward.</p> : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {ward.beds.map((bed) => {
                      const admission = activeByBed.get(String(bed._id));
                      const occupant = admission?.patient ? fullName(admission.patient) : '';
                      const canToggle = isAdmin && ['available', 'maintenance'].includes(bed.status);
                      return canToggle ? (
                        <button key={bed._id} type="button" title={`${BED_LABEL[bed.status]} · ${bed.type}. Select to change status.`} onClick={() => setConfirmBed(bed)} className={`min-h-20 rounded-xl border p-3 text-left transition hover:shadow-sm ${BED_STYLE[bed.status]}`}>
                          <span className="flex items-center justify-between gap-2"><span className="font-bold">{bed.bedNo}</span><BedDouble size={16} /></span><span className="mt-1 block text-xs">{BED_LABEL[bed.status]} · {bed.type}</span>
                        </button>
                      ) : (
                        <div key={bed._id} className={`min-h-20 rounded-xl border p-3 ${BED_STYLE[bed.status]}`}>
                          <span className="flex items-center justify-between gap-2"><span className="font-bold">{bed.bedNo}</span><BedDouble size={16} /></span>
                          <span className="mt-1 block truncate text-xs">{occupant || `${BED_LABEL[bed.status]} · ${bed.type}`}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <Card title="Inpatient census" subtitle="Patients currently admitted. Transfers and discharges update the bed board." bodyClass="p-0">
        {admissionsLoading ? <Spinner className="!py-8" /> : !admissions.length ? <p className="px-5 py-8 text-center text-sm text-slate-500">No patients are currently admitted.</p> : (
          <ul className="divide-y divide-slate-100">
            {admissions.map((admission) => {
              const location = `${admission.ward?.name || 'Ward'} · Bed ${admission.bed?.bedNo || '—'}`;
              return (
                <li key={admission._id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><UserRound size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{fullName(admission.patient)}</p><Badge color="green">Admitted</Badge></div>
                      <p className="mt-0.5 text-xs text-slate-500">{admission.patient?.patientNo} · {admission.patient?.sex === 'male' ? 'Male' : 'Female'}{admission.patient?.dob ? ` · ${age(admission.patient.dob)}` : ''} · {location}</p>
                      <p className="mt-2 text-sm text-slate-700">{admission.reason}{admission.diagnosis ? ` · ${admission.diagnosis}` : ''}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 size={13} /> Admitted {dateTime(admission.admittedAt)}{admission.admittedBy?.name ? ` by ${admission.admittedBy.name}` : ''}</p>
                    </div>
                    {canAdmit && <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => { setTransferAdmission(admission); setTransferBedId(''); }}>Transfer</Button><Button size="sm" variant="danger-soft" onClick={() => setDischargeAdmission(admission)}>Discharge</Button></div>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal open={wardModal} onClose={() => setWardModal(false)} title="Add ward" footer={<><Button variant="secondary" onClick={() => setWardModal(false)}>Cancel</Button><Button type="submit" form="ward-form" loading={busy}>Save ward</Button></>}>
        <form id="ward-form" onSubmit={createWard} className="space-y-3"><Field label="Ward name"><input className="input" required maxLength={100} autoFocus value={wardForm.name} onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })} placeholder="e.g. Medical Ward" /></Field><Field label="Short code"><input className="input uppercase" required maxLength={16} value={wardForm.code} onChange={(e) => setWardForm({ ...wardForm, code: e.target.value.toUpperCase() })} placeholder="e.g. MED" /></Field><Field label="Description"><textarea className="input" maxLength={500} rows={2} value={wardForm.description} onChange={(e) => setWardForm({ ...wardForm, description: e.target.value })} placeholder="Optional notes about this ward" /></Field><ErrorNote>{error}</ErrorNote></form>
      </Modal>

      <Modal open={Boolean(bedWard)} onClose={() => setBedWard(null)} title={bedWard ? `Add a bed · ${bedWard.name}` : 'Add bed'} footer={<><Button variant="secondary" onClick={() => setBedWard(null)}>Cancel</Button><Button type="submit" form="bed-form" loading={busy}>Add bed</Button></>}>
        <form id="bed-form" onSubmit={createBed} className="space-y-3"><Field label="Bed number"><input className="input" required autoFocus maxLength={32} value={bedForm.bedNo} onChange={(e) => setBedForm({ ...bedForm, bedNo: e.target.value })} placeholder="e.g. MED-01" /></Field><Field label="Bed type"><select className="input" value={bedForm.type} onChange={(e) => setBedForm({ ...bedForm, type: e.target.value })}><option>Standard</option><option>Isolation</option><option>ICU</option><option>Maternity</option><option>Paediatric</option></select></Field><ErrorNote>{error}</ErrorNote></form>
      </Modal>

      <Modal open={admitModal} onClose={() => { setAdmitModal(false); setPatient(null); }} title="Admit patient" size="lg" footer={<><Button variant="secondary" onClick={() => { setAdmitModal(false); setPatient(null); }}>Cancel</Button><Button type="submit" form="admission-form" loading={busy} disabled={!patient}>Confirm admission</Button></>}>
        <form id="admission-form" onSubmit={createAdmission} className="space-y-4">
          {!patient ? <Field label="Find patient"><PatientPicker onPick={setPatient} autoFocus placeholder="Search name, phone, patient number, or folder number" /></Field> : <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-3"><span className="min-w-0 flex-1"><span className="block font-semibold text-slate-900">{fullName(patient)}</span><span className="text-xs text-slate-600">{patient.patientNo} · {patient.phone || 'No phone on file'}</span></span><Button size="sm" variant="secondary" icon={X} type="button" onClick={() => setPatient(null)}>Change</Button></div>}
          <Field label="Available bed"><select className="input" required value={admissionForm.bedId} onChange={(e) => setAdmissionForm({ ...admissionForm, bedId: e.target.value })}><option value="">Choose a bed…</option>{availableBeds.map((bed) => <option key={bed._id} value={bed._id}>{bed.wardName} · {bed.bedNo} · {bed.type}</option>)}</select></Field>
          {!availableBeds.length && <p className="-mt-2 text-xs text-amber-700">No beds are currently available in open wards.</p>}
          <Field label="Reason for admission"><textarea className="input" required maxLength={1000} rows={3} value={admissionForm.reason} onChange={(e) => setAdmissionForm({ ...admissionForm, reason: e.target.value })} placeholder="Brief clinical reason for admission" /></Field>
          <Field label="Provisional diagnosis"><input className="input" maxLength={500} value={admissionForm.diagnosis} onChange={(e) => setAdmissionForm({ ...admissionForm, diagnosis: e.target.value })} /></Field>
          <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-600">This records an inpatient admission and reserves the selected bed. It does not replace a clinician’s admission notes or local inpatient procedures.</p>
          <ErrorNote>{error}</ErrorNote>
        </form>
      </Modal>

      <Modal open={Boolean(transferAdmission)} onClose={() => setTransferAdmission(null)} title="Transfer patient" footer={<><Button variant="secondary" onClick={() => setTransferAdmission(null)}>Cancel</Button><Button loading={busy} disabled={!transferBedId} onClick={transfer}>Transfer bed</Button></>}>
        <div className="space-y-3"><p className="text-sm text-slate-600">{fullName(transferAdmission?.patient)} · Currently {transferAdmission?.ward?.name}, bed {transferAdmission?.bed?.bedNo}.</p><Field label="New bed"><select className="input" value={transferBedId} onChange={(e) => setTransferBedId(e.target.value)}><option value="">Choose a bed…</option>{availableBeds.map((bed) => <option key={bed._id} value={bed._id}>{bed.wardName} · {bed.bedNo} · {bed.type}</option>)}</select></Field>{!availableBeds.length && <p className="text-xs text-amber-700">No other beds are available.</p>}</div>
      </Modal>

      <Confirm open={Boolean(dischargeAdmission)} title="Discharge this patient?" confirmLabel="Confirm discharge" tone="danger" icon={ShieldAlert} busy={busy} onClose={() => setDischargeAdmission(null)} onConfirm={discharge}>
        {fullName(dischargeAdmission?.patient)} will be marked as discharged, and bed {dischargeAdmission?.bed?.bedNo} will be made available.
      </Confirm>

      <Confirm open={Boolean(confirmBed)} title={confirmBed?.status === 'available' ? 'Mark bed for maintenance?' : 'Return bed to service?'} confirmLabel={confirmBed?.status === 'available' ? 'Mark maintenance' : 'Make available'} tone={confirmBed?.status === 'available' ? 'danger' : 'primary'} busy={busy} onClose={() => setConfirmBed(null)} onConfirm={changeBedStatus}>
        {confirmBed?.status === 'available' ? `${confirmBed?.bedNo} will no longer be offered for admission.` : `${confirmBed?.bedNo} will be available for admission again.`}
      </Confirm>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  const colors = { slate: 'bg-slate-100 text-slate-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-800' };
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[tone]}`}><Icon size={18} /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="text-xl font-bold text-slate-900">{value}</p></div></div>;
}
