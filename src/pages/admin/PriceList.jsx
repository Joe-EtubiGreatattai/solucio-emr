import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { naira, toKobo } from '../../lib/format';
import { Badge, Button, Card, ErrorNote, Field, Modal, MoneyInput, PageHeader, Spinner, Tabs } from '../../components/ui';

const CATS = [['', 'All'], ['registration', 'Registration'], ['consultation', 'Consultation'], ['lab', 'Lab'], ['drug', 'Drugs'], ['procedure', 'Procedures'], ['other', 'Other']];

export default function PriceList() {
  const { data, loading, reload } = useFetch('/price-items?all=1', { initial: [] });
  const { data: hmos } = useFetch('/hmos', { initial: [] });
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const list = useMemo(() => data.filter((i) => (!cat || i.category === cat) && (!q || `${i.name} ${i.code}`.toLowerCase().includes(q.toLowerCase()))), [data, cat, q]);
  return (
    <div>
      <PageHeader title="Price list" subtitle="Every charge comes from here. Changing a price affects new charges only; bills already started keep their price."
        actions={<Button icon={Plus} onClick={() => setEdit({})}>Add item</Button>} />
      <Card bodyClass="p-0">
        <div className="flex flex-wrap items-center gap-3 px-4 pt-2">
          <Tabs value={cat} onChange={setCat} tabs={CATS.map(([value, label]) => ({ value, label }))} />
          <input className="input ml-auto !w-60" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search price list" />
        </div>
        {loading ? <Spinner /> : (
          <table className="table">
            <thead><tr><th>Item</th><th>Code</th><th className="text-right">Cash price</th><th>HMO prices</th></tr></thead>
            <tbody>
              {list.map((i) => (
                <tr key={i._id} className="cursor-pointer" onClick={() => setEdit(i)}>
                  <td data-label=""><span className="font-medium">{i.name}</span>{!i.active && <Badge className="ml-2">Hidden</Badge>}</td>
                  <td data-label="Code" className="text-slate-500">{i.code}</td>
                  <td data-label="Cash price" className="money text-right font-semibold">{naira(i.cashPriceKobo)}</td>
                  <td data-label="HMO prices" className="text-sm text-slate-500">{i.hmoPrices?.map((p) => `${hmos.find((h) => h._id === p.hmo)?.name || 'HMO'} ${naira(p.priceKobo, { decimals: 0 })}`).join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <ItemForm item={edit} hmos={hmos} onClose={() => setEdit(null)} onSaved={reload} />
    </div>
  );
}

function ItemForm({ item, hmos, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState(null);
  if (item && key !== (item._id || 'new')) {
    setKey(item._id || 'new');
    setForm({
      code: item.code || '', name: item.name || '', category: item.category || 'procedure', department: item.department || '', active: item.active ?? true,
      price: item.cashPriceKobo != null ? String(item.cashPriceKobo / 100) : '',
      hmoPrices: (item.hmoPrices || []).map((p) => ({ hmo: p.hmo, price: String(p.priceKobo / 100) })),
      drug: item.drug || { generic: '', strength: '', form: '', unit: '', reorderLevel: 0 },
      labFields: item.labFields || [],
    });
    setError('');
  }
  if (!item) { if (key) setKey(null); return null; }
  if (!form) return null;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = {
      code: form.code, name: form.name, category: form.category, department: form.department, active: form.active, cashPriceKobo: toKobo(form.price),
      hmoPrices: form.hmoPrices.filter((p) => p.hmo && p.price !== '').map((p) => ({ hmo: p.hmo, priceKobo: toKobo(p.price) })),
      ...(form.category === 'drug' ? { drug: { ...form.drug, reorderLevel: Number(form.drug.reorderLevel) || 0 } } : {}),
      ...(form.category === 'lab' ? { labFields: form.labFields.map((f) => ({ ...f, refLow: f.refLow === '' ? undefined : f.refLow, refHigh: f.refHigh === '' ? undefined : f.refHigh, choices: typeof f.choices === 'string' ? f.choices.split(',').map((c) => c.trim()).filter(Boolean) : f.choices })) } : {}),
    };
    try {
      if (item._id) await api(`/price-items/${item._id}`, { method: 'PATCH', body }); else await api('/price-items', { method: 'POST', body });
      toast.success('Saved');
      onSaved();
      onClose();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  const setLf = (i, k, v) => setForm({ ...form, labFields: form.labFields.map((f, j) => (j === i ? { ...f, [k]: v } : f)) });
  return (
    <Modal open onClose={onClose} title={item._id ? item.name : 'Add to the price list'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="item-form" loading={busy}>Save</Button></>}>
      <form id="item-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2"><input className="input" required value={form.name} onChange={set('name')} /></Field>
        <Field label="Code" hint={item._id ? 'Codes can’t change' : 'Short and unique, e.g. XRAY-CHEST'}><input className="input" required disabled={Boolean(item._id)} value={form.code} onChange={set('code')} /></Field>
        <Field label="Type"><select className="input" disabled={Boolean(item._id)} value={form.category} onChange={set('category')}>{CATS.slice(1).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Cash price"><MoneyInput required value={form.price} onChange={set('price')} /></Field>
        <Field label="Department"><input className="input" value={form.department} onChange={set('department')} /></Field>
        <div className="rounded-2xl bg-slate-50 p-3 sm:col-span-2">
          <p className="mb-2 text-sm font-semibold">HMO prices <span className="font-normal text-slate-500">(leave empty to use the cash price)</span></p>
          <div className="grid gap-2 sm:grid-cols-2">
            {hmos.map((h) => {
              const p = form.hmoPrices.find((x) => x.hmo === h._id);
              return (
                <Field key={h._id} label={h.name}>
                  <MoneyInput value={p?.price ?? ''} onChange={(e) => setForm({ ...form, hmoPrices: [...form.hmoPrices.filter((x) => x.hmo !== h._id), { hmo: h._id, price: e.target.value }] })} />
                </Field>
              );
            })}
            {!hmos.length && <p className="text-sm text-slate-500">No HMOs set up yet.</p>}
          </div>
        </div>
        {form.category === 'drug' && (
          <div className="grid gap-2 rounded-2xl bg-slate-50 p-3 sm:col-span-2 sm:grid-cols-5">
            {[['generic', 'Generic name'], ['strength', 'Strength'], ['form', 'Form'], ['unit', 'Unit'], ['reorderLevel', 'Reorder at']].map(([k, l]) => (
              <Field key={k} label={l}><input className="input" value={form.drug[k] ?? ''} onChange={(e) => setForm({ ...form, drug: { ...form.drug, [k]: e.target.value } })} /></Field>
            ))}
          </div>
        )}
        {form.category === 'lab' && (
          <div className="rounded-2xl bg-slate-50 p-3 sm:col-span-2">
            <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold">Result fields</p>
              <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => setForm({ ...form, labFields: [...form.labFields, { name: '', unit: '', type: 'number', refLow: '', refHigh: '' }] })}>Add field</Button></div>
            {form.labFields.map((f, i) => (
              <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
                <input className="input" placeholder="Name" value={f.name} onChange={(e) => setLf(i, 'name', e.target.value)} />
                <select className="input" value={f.type} onChange={(e) => setLf(i, 'type', e.target.value)}><option value="number">Number</option><option value="text">Text</option><option value="choice">Choice</option></select>
                {f.type === 'choice'
                  ? <input className="input sm:col-span-3" placeholder="Choices, comma separated" value={Array.isArray(f.choices) ? f.choices.join(', ') : f.choices || ''} onChange={(e) => setLf(i, 'choices', e.target.value)} />
                  : <><input className="input" placeholder="Unit" value={f.unit || ''} onChange={(e) => setLf(i, 'unit', e.target.value)} />
                    <input className="input" type="number" step="any" placeholder="Low" value={f.refLow ?? ''} onChange={(e) => setLf(i, 'refLow', e.target.value)} />
                    <input className="input" type="number" step="any" placeholder="High" value={f.refHigh ?? ''} onChange={(e) => setLf(i, 'refHigh', e.target.value)} /></>}
              </div>
            ))}
          </div>
        )}
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-brand-700" checked={!form.active} onChange={(e) => setForm({ ...form, active: !e.target.checked })} /> Hide (can’t be ordered any more)</label>
        <div className="sm:col-span-2"><ErrorNote>{error}</ErrorNote></div>
      </form>
    </Modal>
  );
}
