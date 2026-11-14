import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import { Button, Card, ErrorNote, Field, Modal, PageHeader } from '../../components/ui';
import QueueList from '../../components/QueueList';
import PatientBanner from '../../components/PatientBanner';

const blank = { bpSys: '', bpDia: '', pulse: '', tempC: '', respRate: '', spo2: '', weightKg: '', heightCm: '', notes: '', priority: '2' };

export default function Triage() {
  const [entry, setEntry] = useState(null);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const bmi = form.weightKg > 0 && form.heightCm > 0 ? (form.weightKg / (form.heightCm / 100) ** 2).toFixed(1) : null;

  async function open(e) {
    setEntry(e);
    setForm({ ...blank, priority: String(e.visit?.priority || 2) });
    setError('');
    if (e.status === 'waiting') api(`/queues/${e._id}/start`, { method: 'POST' }).catch(() => {});
  }

  async function save(ev) {
    ev.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/visits/${entry.visit._id}/vitals`, { method: 'POST', body: { ...form, priority: Number(form.priority) } });
      toast.success('Sent to the doctor');
      setEntry(null);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const num = (k, label, unit, step = '1') => (
    <Field label={`${label}${unit ? ` (${unit})` : ''}`}><input className="input money" type="number" inputMode="decimal" step={step} min="0" value={form[k]} onChange={set(k)} /></Field>
  );

  return (
    <div>
      <PageHeader title="Triage" subtitle="Take vitals, then send the patient to the doctor. Urgent patients are at the top." />
      <Card bodyClass="p-0"><QueueList station="triage" onOpen={open} emptyText="Nobody waiting for triage." /></Card>
      <Modal open={Boolean(entry)} onClose={() => setEntry(null)} title="Vitals" size="lg"
        footer={<><Button variant="secondary" onClick={() => setEntry(null)}>Cancel</Button><Button type="submit" form="vitals-form" loading={busy}>Save and send to doctor</Button></>}>
        {entry && <PatientBanner patient={entry.patient} visit={entry.visit} />}
        <form id="vitals-form" onSubmit={save} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {num('bpSys', 'BP systolic', 'mmHg')}
          {num('bpDia', 'BP diastolic', 'mmHg')}
          {num('pulse', 'Pulse', '/min')}
          {num('tempC', 'Temp', '°C', '0.1')}
          {num('respRate', 'Resp. rate', '/min')}
          {num('spo2', 'SpO₂', '%')}
          {num('weightKg', 'Weight', 'kg', '0.1')}
          {num('heightCm', 'Height', 'cm', '0.1')}
          <div className="col-span-2 rounded-xl bg-slate-50 px-3 py-2 text-sm sm:col-span-4">BMI: <b className="money">{bmi || '—'}</b></div>
          <Field label="How urgent" className="col-span-2">
            <select className="input" value={form.priority} onChange={set('priority')}><option value="1">Urgent</option><option value="2">Normal</option><option value="3">Routine</option></select>
          </Field>
          <Field label="Notes" className="col-span-2 sm:col-span-4"><textarea className="input" rows={2} value={form.notes} onChange={set('notes')} placeholder="Complaint in the patient’s words, anything the doctor should know" /></Field>
          <div className="col-span-2 sm:col-span-4"><ErrorNote>{error}</ErrorNote></div>
        </form>
      </Modal>
    </div>
  );
}
