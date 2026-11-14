import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { Button, ErrorNote, Field, IconButton, Modal } from '../../components/ui';

const blank = {
  firstName: '', lastName: '', otherNames: '', sex: '', dob: '', phone: '', email: '', address: '', folderNo: '',
  nextOfKin: { name: '', phone: '', relationship: '' }, allergies: '', bloodGroup: '', genotype: '',
  hmoMemberships: [], returningFromPaper: false, paperHistory: '',
};
const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const toForm = (p) => ({
  ...blank, ...p, dob: ymd(p.dob), allergies: (p.allergies || []).join(', '), nextOfKin: { ...blank.nextOfKin, ...(p.nextOfKin || {}) },
  hmoMemberships: (p.hmoMemberships || []).map((m) => ({ ...m, hmo: m.hmo?._id || m.hmo, plan: m.plan?._id || m.plan, validTo: ymd(m.validTo) })),
});

/** Register a new patient, or edit one. onSaved(patient). */
export default function PatientForm({ open, onClose, patient, onSaved }) {
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { data: hmos } = useFetch('/hmos', { initial: [] });
  useEffect(() => { if (open) { setForm(patient ? toForm(patient) : blank); setError(''); } }, [open, patient]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setKin = (k) => (e) => setForm({ ...form, nextOfKin: { ...form.nextOfKin, [k]: e.target.value } });
  const setM = (i, k, v) => setForm({ ...form, hmoMemberships: form.hmoMemberships.map((m, j) => (j === i ? { ...m, [k]: v, ...(k === 'hmo' ? { plan: '' } : {}) } : m)) });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = {
      ...form,
      dob: form.dob || undefined,
      allergies: form.allergies.split(',').map((a) => a.trim()).filter(Boolean),
      hmoMemberships: form.hmoMemberships.filter((m) => m.hmo).map((m) => ({ ...m, plan: m.plan || undefined, validTo: m.validTo || undefined })),
    };
    if (patient) delete body.paperHistory; // reception can add it when registering, not read or rewrite it later
    try {
      const saved = patient ? await api(`/patients/${patient._id}`, { method: 'PATCH', body }) : await api('/patients', { method: 'POST', body });
      toast.success(patient ? 'Patient updated' : `Registered ${saved.patientNo}`);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={patient ? 'Edit patient' : 'Register a new patient'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="patient-form" loading={busy}>{patient ? 'Save changes' : 'Register patient'}</Button></>}>
      <form id="patient-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="First name"><input className="input" required autoFocus value={form.firstName} onChange={set('firstName')} /></Field>
        <Field label="Last name"><input className="input" required value={form.lastName} onChange={set('lastName')} /></Field>
        <Field label="Other names"><input className="input" value={form.otherNames} onChange={set('otherNames')} /></Field>
        <Field label="Sex">
          <select className="input" required value={form.sex} onChange={set('sex')}>
            <option value="">Choose…</option><option value="female">Female</option><option value="male">Male</option>
          </select>
        </Field>
        <Field label="Date of birth"><input className="input" type="date" max={ymd(new Date())} value={form.dob} onChange={set('dob')} /></Field>
        <Field label="Phone"><input className="input" type="tel" value={form.phone} onChange={set('phone')} placeholder="0803 123 4567" /></Field>
        <Field label="Address" className="sm:col-span-2"><input className="input" value={form.address} onChange={set('address')} /></Field>
        <Field label="Next of kin"><input className="input" value={form.nextOfKin.name} onChange={setKin('name')} placeholder="Name" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Their phone"><input className="input" value={form.nextOfKin.phone} onChange={setKin('phone')} /></Field>
          <Field label="Relationship"><input className="input" value={form.nextOfKin.relationship} onChange={setKin('relationship')} /></Field>
        </div>
        <Field label="Allergies" hint="Separate with commas. Shown in red on every screen."><input className="input" value={form.allergies} onChange={set('allergies')} /></Field>
        <Field label="Old folder number" hint="From the paper folder or the old system"><input className="input" value={form.folderNo} onChange={set('folderNo')} /></Field>

        <div className="rounded-2xl bg-slate-50 p-3 sm:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">HMO cover</p>
            <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => setForm({ ...form, hmoMemberships: [...form.hmoMemberships, { hmo: '', plan: '', memberNo: '', validTo: '' }] })}>Add HMO</Button>
          </div>
          {!form.hmoMemberships.length && <p className="text-sm text-slate-500">No HMO. This patient pays cash.</p>}
          {form.hmoMemberships.map((m, i) => {
            const h = hmos.find((x) => x._id === m.hmo);
            return (
              <div key={m._id || i} className="mb-2 grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_9rem_auto]">
                <Field label="HMO"><select className="input" required value={m.hmo} onChange={(e) => setM(i, 'hmo', e.target.value)}><option value="">Choose…</option>{hmos.filter((x) => x.active).map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}</select></Field>
                <Field label="Plan"><select className="input" required value={m.plan || ''} onChange={(e) => setM(i, 'plan', e.target.value)}><option value="">Choose…</option>{(h?.plans || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></Field>
                <Field label="Member no."><input className="input" required value={m.memberNo || ''} onChange={(e) => setM(i, 'memberNo', e.target.value)} /></Field>
                <Field label="Valid to"><input className="input" type="date" value={m.validTo || ''} onChange={(e) => setM(i, 'validTo', e.target.value)} /></Field>
                <IconButton icon={Trash2} label="Remove HMO" tone="danger" onClick={() => setForm({ ...form, hmoMemberships: form.hmoMemberships.filter((_, j) => j !== i) })} />
              </div>
            );
          })}
        </div>

        {!patient && (
          <div className="rounded-2xl bg-slate-50 p-3 sm:col-span-2">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-brand-700" checked={form.returningFromPaper} onChange={(e) => setForm({ ...form, returningFromPaper: e.target.checked })} />
              <span className="text-sm"><span className="font-semibold text-slate-800">Returning patient with a paper folder</span><br />
                <span className="text-slate-500">They’ve been here before, so no registration fee. Note anything important from their folder for the doctor.</span></span>
            </label>
            {form.returningFromPaper && (
              <textarea className="input mt-3" rows={3} value={form.paperHistory} onChange={set('paperHistory')} placeholder="e.g. Hypertensive since 2019, appendicectomy 2015" />
            )}
          </div>
        )}
        <div className="sm:col-span-2"><ErrorNote>{error}</ErrorNote></div>
      </form>
    </Modal>
  );
}
