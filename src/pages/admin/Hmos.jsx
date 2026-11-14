import { useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { naira, toKobo } from '../../lib/format';
import { Badge, Button, Card, Empty, ErrorNote, Field, Modal, MoneyInput, PageHeader, Spinner } from '../../components/ui';

const CATS = [['registration', 'Registration'], ['consultation', 'Consultation'], ['lab', 'Lab'], ['drug', 'Drugs'], ['procedure', 'Procedures'], ['other', 'Other']];
const MODE = { covered: 'Covered', copay: 'Copay', not_covered: 'Not covered' };

export default function Hmos() {
  const { data, loading, reload } = useFetch('/hmos', { initial: [] });
  const [hmo, setHmo] = useState(null);
  const [plan, setPlan] = useState(null);
  return (
    <div>
      <PageHeader title="HMOs" subtitle="Each HMO has plans. A plan says what it covers, any copay, and a yearly limit." actions={<Button icon={Plus} onClick={() => setHmo({})}>Add HMO</Button>} />
      {loading ? <Spinner /> : !data.length ? <Card><Empty title="No HMOs yet" /></Card> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((h) => (
            <Card key={h._id} title={<>{h.name} {!h.active && <Badge>Inactive</Badge>}</>} subtitle={h.authRequiredCategories?.length ? `Needs approval code for: ${h.authRequiredCategories.join(', ')}` : 'No approval codes needed'}
              action={<div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setHmo(h)}>Edit</Button><Button size="sm" icon={Plus} onClick={() => setPlan({ hmo: h, plan: {} })}>Plan</Button></div>}>
              {!h.plans.length ? <p className="text-sm text-slate-500">No plans yet.</p> : (
                <ul className="space-y-3">
                  {h.plans.map((p) => (
                    <li key={p._id}>
                      <button type="button" className="w-full rounded-xl border border-slate-200 p-3 text-left hover:border-brand-300" onClick={() => setPlan({ hmo: h, plan: p })}>
                        <p className="font-semibold">{p.name}{p.annualLimitKobo > 0 && <span className="font-normal text-slate-500"> · limit {naira(p.annualLimitKobo, { decimals: 0 })}/year</span>}</p>
                        <p className="mt-1 flex flex-wrap gap-1">{CATS.map(([c, l]) => { const r = p.coverage?.[c]; return <Badge key={c} color={!r || r.mode === 'not_covered' ? 'slate' : r.mode === 'copay' ? 'amber' : 'green'}>{l}: {r ? (r.mode === 'copay' ? `${r.copayPct}% copay` : MODE[r.mode]) : 'Not covered'}</Badge>; })}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
      <HmoForm hmo={hmo} onClose={() => setHmo(null)} onSaved={reload} />
      <PlanForm target={plan} onClose={() => setPlan(null)} onSaved={reload} />
    </div>
  );
}

function HmoForm({ hmo, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(null);
  if (hmo && key !== (hmo._id || 'new')) { setKey(hmo._id || 'new'); setForm({ name: hmo.name || '', code: hmo.code || '', active: hmo.active ?? true, authRequiredCategories: hmo.authRequiredCategories || [] }); setError(''); }
  if (!hmo) { if (key) setKey(null); return null; }
  if (!form) return null;
  const save = async () => {
    setBusy(true);
    try { if (hmo._id) await api(`/hmos/${hmo._id}`, { method: 'PATCH', body: form }); else await api('/hmos', { method: 'POST', body: form }); toast.success('Saved'); onSaved(); onClose(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={hmo._id ? hmo.name : 'Add HMO'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Short code"><input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
        <div><span className="label">Needs an approval code for</span>
          <div className="flex flex-wrap gap-2">{CATS.map(([c, l]) => (
            <label key={c} className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-700" checked={form.authRequiredCategories.includes(c)}
              onChange={(e) => setForm({ ...form, authRequiredCategories: e.target.checked ? [...form.authRequiredCategories, c] : form.authRequiredCategories.filter((x) => x !== c) })} />{l}</label>
          ))}</div></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-700" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Modal>
  );
}

function PlanForm({ target, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(null);
  const p = target?.plan;
  if (target && key !== (p._id || `new-${target.hmo._id}`)) {
    setKey(p._id || `new-${target.hmo._id}`);
    setForm({ name: p.name || '', limit: p.annualLimitKobo ? String(p.annualLimitKobo / 100) : '', coverage: Object.fromEntries(CATS.map(([c]) => [c, { mode: p.coverage?.[c]?.mode || 'not_covered', copayPct: p.coverage?.[c]?.copayPct || 0 }])) });
    setError('');
  }
  if (!target) { if (key) setKey(null); return null; }
  if (!form) return null;
  const save = async () => {
    setBusy(true);
    const body = { name: form.name, annualLimitKobo: toKobo(form.limit), coverage: Object.fromEntries(Object.entries(form.coverage).map(([c, r]) => [c, { mode: r.mode, copayPct: Number(r.copayPct) || 0 }])) };
    try {
      if (p._id) await api(`/hmos/${target.hmo._id}/plans/${p._id}`, { method: 'PATCH', body }); else await api(`/hmos/${target.hmo._id}/plans`, { method: 'POST', body });
      toast.success('Saved'); onSaved(); onClose();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const setC = (c, k, v) => setForm({ ...form, coverage: { ...form.coverage, [c]: { ...form.coverage[c], [k]: v } } });
  return (
    <Modal open onClose={onClose} title={`${target.hmo.name}: ${p._id ? p.name : 'new plan'}`} size="lg" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Plan name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Yearly limit" hint="Empty = no limit. Going over shows a warning."><MoneyInput value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} /></Field>
        </div>
        <table className="table">
          <thead><tr><th>Type</th><th>Cover</th><th>Patient pays (%)</th></tr></thead>
          <tbody>{CATS.map(([c, l]) => (
            <tr key={c}><td data-label="">{l}</td>
              <td data-label="Cover"><select className="input" value={form.coverage[c].mode} onChange={(e) => setC(c, 'mode', e.target.value)}>{Object.entries(MODE).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></td>
              <td data-label="Patient pays (%)">{form.coverage[c].mode === 'copay' ? <input className="input money !w-24" type="number" min="0" max="100" value={form.coverage[c].copayPct} onChange={(e) => setC(c, 'copayPct', e.target.value)} /> : '—'}</td></tr>
          ))}</tbody>
        </table>
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Modal>
  );
}
