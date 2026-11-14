import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { naira } from '../../lib/format';
import { Button, ErrorNote, Field, Modal } from '../../components/ui';

const FREQ = { od: 1, bd: 2, tds: 3, qds: 4, nocte: 1, stat: 1, prn: 1 };
const TITLE = { lab: 'Order a lab test', drug: 'Prescribe', procedure: 'Order a procedure', referral: 'Refer to another clinic' };

/** One order form for all four kinds. */
export default function OrderForm({ kind, visitId, onClose, onDone }) {
  const open = Boolean(kind);
  const category = kind === 'drug' ? 'drug' : kind;
  const { data: items } = useFetch(kind && kind !== 'referral' ? `/price-items?category=${category}` : '/clinics', { initial: [] });
  const [form, setForm] = useState({});
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setForm({ priceItem: '', qty: '', dose: '', frequency: 'tds', durationDays: '5', instructions: '', toClinic: '' }); setQ(''); setError(''); } }, [open, kind]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const suggested = kind === 'drug' && form.frequency !== 'prn' ? (FREQ[form.frequency] || 1) * (form.frequency === 'stat' ? 1 : Number(form.durationDays) || 1) : null;
  const list = kind === 'referral' ? items : items.filter((i) => !q || `${i.name} ${i.code} ${i.drug?.generic || ''}`.toLowerCase().includes(q.toLowerCase()));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { kind, ...form, qty: kind === 'drug' ? Number(form.qty || suggested) : undefined, durationDays: form.durationDays ? Number(form.durationDays) : undefined };
      await api(`/visits/${visitId}/orders`, { method: 'POST', body });
      toast.success(kind === 'referral' ? 'Referred' : 'Ordered');
      onDone?.();
      onClose();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={TITLE[kind]} guardChanges={false}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="order-form" loading={busy} disabled={kind === 'referral' ? !form.toClinic : !form.priceItem}>{kind === 'referral' ? 'Refer' : 'Order'}</Button></>}>
      <form id="order-form" onSubmit={submit} className="space-y-4">
        {kind === 'referral' ? (
          <>
            <Field label="Clinic"><select className="input" autoFocus required value={form.toClinic} onChange={set('toClinic')}><option value="">Choose…</option>{list.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></Field>
            <Field label="Note for the other doctor"><textarea className="input" rows={3} value={form.instructions} onChange={set('instructions')} /></Field>
          </>
        ) : (
          <>
            <input className="input" autoFocus placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200">
              {list.map((i) => (
                <label key={i._id} className={`flex cursor-pointer items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-0 ${form.priceItem === i._id ? 'bg-brand-50 font-semibold text-brand-800' : 'hover:bg-slate-50'}`}>
                  <span><input type="radio" className="sr-only" name="item" value={i._id} checked={form.priceItem === i._id} onChange={set('priceItem')} />{i.name}</span>
                  <span className="money shrink-0 text-slate-500">{naira(i.cashPriceKobo, { decimals: 0 })}{kind === 'drug' ? ` / ${i.drug?.unit || 'unit'}` : ''}</span>
                </label>
              ))}
              {!list.length && <p className="p-3 text-sm text-slate-500">Nothing matches.</p>}
            </div>
            {kind === 'drug' && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Dose"><input className="input" value={form.dose} onChange={set('dose')} placeholder="1 tab" /></Field>
                <Field label="How often"><select className="input" value={form.frequency} onChange={set('frequency')}>{Object.keys(FREQ).map((f) => <option key={f}>{f}</option>)}</select></Field>
                <Field label="Days"><input className="input" type="number" min="1" value={form.durationDays} onChange={set('durationDays')} /></Field>
                <Field label="Quantity" hint={suggested ? `Suggested ${suggested}` : ''}><input className="input money" type="number" min="1" value={form.qty} onChange={set('qty')} placeholder={suggested ? String(suggested) : ''} required={!suggested} /></Field>
              </div>
            )}
            <Field label="Instructions"><input className="input" value={form.instructions} onChange={set('instructions')} placeholder={kind === 'drug' ? 'e.g. after meals' : ''} /></Field>
          </>
        )}
        <ErrorNote>{error}</ErrorNote>
      </form>
    </Modal>
  );
}
