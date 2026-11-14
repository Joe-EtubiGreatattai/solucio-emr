import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { date, naira } from '../../lib/format';
import { Button, Confirm, ErrorNote, Field, Modal } from '../../components/ui';

/** Start a visit: clinic, who pays, how urgent. */
export default function CheckIn({ open, onClose, patient, onDone }) {
  const { data: clinics } = useFetch('/clinics', { initial: [] });
  const memberships = patient?.hmoMemberships || [];
  const [form, setForm] = useState({ clinicId: '', payer: 'cash', priority: '2', complaint: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [askExpired, setAskExpired] = useState(false);
  useEffect(() => {
    if (open) {
      const valid = memberships.find((m) => !m.validTo || new Date(m.validTo) >= new Date());
      setForm({ clinicId: '', payer: valid ? valid._id : 'cash', priority: '2', complaint: '' });
      setError('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function go(confirmExpiredHmo = false) {
    setBusy(true);
    setError('');
    try {
      const r = await api('/visits', {
        method: 'POST',
        body: { patientId: patient._id, clinicId: form.clinicId, priority: Number(form.priority), complaint: form.complaint, confirmExpiredHmo, payer: form.payer === 'cash' ? { type: 'cash' } : { type: 'hmo', membershipId: form.payer } },
      });
      r.warnings?.forEach((w) => toast(w, { icon: '⚠️' }));
      toast.success(`Checked in. ${patient.firstName} is waiting for triage.`);
      setAskExpired(false);
      onDone?.(r.visit);
      onClose();
    } catch (err) {
      if (err.data?.needsConfirm === 'hmo_expired') setAskExpired(true);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Check in" guardChanges={false}
        footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="checkin-form" loading={busy}>Check in</Button></>}>
        <form id="checkin-form" onSubmit={(e) => { e.preventDefault(); go(); }} className="space-y-4">
          {patient?.outstandingKobo > 0 && (
            <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">This patient still owes <b>{naira(patient.outstandingKobo)}</b> from earlier visits. Ask them to settle it at the cashier.</p>
          )}
          <Field label="Clinic">
            <select className="input" required autoFocus value={form.clinicId} onChange={set('clinicId')}>
              <option value="">Choose…</option>
              {clinics.map((c) => <option key={c._id} value={c._id}>{c.name}{c.consultationItem ? ` · ${naira(c.consultationItem.cashPriceKobo, { decimals: 0 })}` : ''}</option>)}
            </select>
          </Field>
          <Field label="Who pays">
            <select className="input" value={form.payer} onChange={set('payer')}>
              <option value="cash">Patient pays (cash)</option>
              {memberships.map((m) => (
                <option key={m._id} value={m._id}>{m.hmo?.name || 'HMO'} · {m.plan?.name || ''} · {m.memberNo}{m.validTo && new Date(m.validTo) < new Date() ? ` (expired ${date(m.validTo)})` : ''}</option>
              ))}
            </select>
          </Field>
          <Field label="How urgent">
            <div className="flex gap-2">
              {[['1', 'Urgent'], ['2', 'Normal'], ['3', 'Routine']].map(([v, l]) => (
                <label key={v} className={`flex-1 cursor-pointer rounded-xl border px-3 py-2 text-center text-sm font-semibold transition ${form.priority === v ? (v === '1' ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-brand-300 bg-brand-50 text-brand-800') : 'border-slate-200 text-slate-600'}`}>
                  <input type="radio" className="sr-only" name="priority" value={v} checked={form.priority === v} onChange={set('priority')} />{l}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Reason for visit"><input className="input" value={form.complaint} onChange={set('complaint')} placeholder="e.g. Fever for 3 days" /></Field>
          <ErrorNote>{error}</ErrorNote>
        </form>
      </Modal>
      <Confirm open={askExpired} title="HMO cover has expired" confirmLabel="Check in as cash" busy={busy} onClose={() => setAskExpired(false)} onConfirm={() => go(true)}>
        This patient’s HMO cover has expired, so the HMO won’t pay for this visit. Check them in as a cash patient?
      </Confirm>
    </>
  );
}
