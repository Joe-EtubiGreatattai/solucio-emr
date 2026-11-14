import { useState } from 'react';
import { LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { date, naira } from '../../lib/format';
import { Button, Confirm, ErrorNote } from '../../components/ui';

const PRIORITY = [['1', 'Urgent', 'border-rose-500 bg-rose-600 text-white'], ['2', 'Normal', 'border-brand-700 bg-brand-700 text-white'], ['3', 'Routine', 'border-slate-500 bg-slate-600 text-white']];
const expired = (m) => m.validTo && new Date(m.validTo) < new Date();

/** Start a visit, right on the patient's page. */
export default function CheckIn({ patient, onDone }) {
  const { data: clinics } = useFetch('/clinics', { initial: [] });
  const memberships = patient?.hmoMemberships || [];
  const [clinicId, setClinicId] = useState('');
  const [payer, setPayer] = useState(() => memberships.find((m) => !expired(m))?._id || 'cash');
  const [priority, setPriority] = useState('2');
  const [complaint, setComplaint] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [askExpired, setAskExpired] = useState(false);
  const clinic = clinics.find((c) => c._id === clinicId);

  async function go(confirmExpiredHmo = false) {
    if (!clinicId) { setError('Choose a clinic'); return; }
    setBusy(true);
    setError('');
    try {
      const r = await api('/visits', {
        method: 'POST',
        body: { patientId: patient._id, clinicId, priority: Number(priority), complaint, confirmExpiredHmo, payer: payer === 'cash' ? { type: 'cash' } : { type: 'hmo', membershipId: payer } },
      });
      r.warnings?.forEach((w) => toast(w, { icon: '⚠️' }));
      toast.success(`${patient.firstName === '-' ? 'Patient' : patient.firstName} checked in to ${clinic?.name}. Next: the nurse for vitals.`);
      setAskExpired(false);
      onDone?.(r.visit);
    } catch (err) {
      if (err.data?.needsConfirm === 'hmo_expired') setAskExpired(true);
      else setError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); go(); }} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-800">Clinic</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {clinics.map((c) => (
            <button key={c._id} type="button" onClick={() => setClinicId(c._id)} aria-pressed={clinicId === c._id}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${clinicId === c._id ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
              <span className="block font-semibold leading-tight">{c.name}</span>
              {c.consultationItem && <span className={`money text-xs ${clinicId === c._id ? 'text-brand-100' : 'text-slate-500'}`}>{naira(c.consultationItem.cashPriceKobo, { decimals: 0 })}</span>}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-800">Who pays</legend>
        <div className="space-y-1.5">
          {[{ _id: 'cash', label: 'The patient (cash)' }, ...memberships.map((m) => ({ _id: m._id, label: `${m.hmo?.name || 'HMO'}${m.plan?.name ? ` · ${m.plan.name}` : ''}`, sub: `${m.memberNo || ''}${expired(m) ? ` · expired ${date(m.validTo)}` : ''}`, bad: expired(m) }))].map((o) => (
            <label key={o._id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${payer === o._id ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white'}`}>
              <input type="radio" name="payer" className="accent-brand-700" checked={payer === o._id} onChange={() => setPayer(o._id)} />
              <span className="min-w-0 flex-1"><span className="font-semibold text-slate-800">{o.label}</span>{o.sub && <span className={`block text-xs ${o.bad ? 'font-semibold text-amber-700' : 'text-slate-500'}`}>{o.sub}</span>}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-800">How urgent</legend>
        <div className="grid grid-cols-3 gap-1.5">
          {PRIORITY.map(([v, l, on]) => (
            <button key={v} type="button" onClick={() => setPriority(v)} aria-pressed={priority === v}
              className={`rounded-xl border px-2 py-2 text-sm font-semibold transition-colors ${priority === v ? on : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>{l}</button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-800">Reason for visit</span>
        <input className="input" value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="e.g. Fever for 3 days" />
      </label>

      <ErrorNote>{error}</ErrorNote>
      <Button type="submit" className="w-full" size="lg" icon={LogIn} loading={busy} disabled={!clinicId}>
        {clinic ? `Check in to ${clinic.name}` : 'Choose a clinic to check in'}
      </Button>

      <Confirm open={askExpired} title="HMO cover has expired" confirmLabel="Check in as cash" busy={busy} onClose={() => setAskExpired(false)} onConfirm={() => go(true)}>
        This patient’s HMO cover has expired, so the HMO won’t pay for this visit. Check them in as a cash patient?
      </Confirm>
    </form>
  );
}
