import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { naira, toKobo } from '../../lib/format';
import { Button, Card, ErrorNote, Field, MoneyInput, PageHeader } from '../../components/ui';

const blank = { priceItem: '', batchNo: '', expiry: '', qty: '', cost: '', supplier: '' };

export default function ReceiveStock() {
  const { data: drugs } = useFetch('/price-items?category=drug', { initial: [] });
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [last, setLast] = useState([]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const drug = drugs.find((d) => d._id === form.priceItem);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const b = await api('/stock/receive', { method: 'POST', body: { priceItem: form.priceItem, batchNo: form.batchNo, expiry: form.expiry, qty: Number(form.qty), costKobo: toKobo(form.cost), supplier: form.supplier } });
      toast.success(`Added ${b.qtyOnHand} × ${drug?.name}`);
      setLast([{ ...b, name: drug?.name }, ...last].slice(0, 8));
      setForm({ ...blank, supplier: form.supplier });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Receive stock" subtitle="Record a delivery, one batch at a time." />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Drug" className="sm:col-span-2">
              <select className="input" required value={form.priceItem} onChange={set('priceItem')}><option value="">Choose…</option>{drugs.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select>
            </Field>
            <Field label="Batch number"><input className="input" required value={form.batchNo} onChange={set('batchNo')} /></Field>
            <Field label="Expiry date"><input className="input" type="date" required value={form.expiry} onChange={set('expiry')} /></Field>
            <Field label={`Quantity${drug?.drug?.unit ? ` (${drug.drug.unit}s)` : ''}`}><input className="input money" type="number" min="1" required value={form.qty} onChange={set('qty')} /></Field>
            <Field label="Cost price per unit"><MoneyInput value={form.cost} onChange={set('cost')} /></Field>
            <Field label="Supplier" className="sm:col-span-2"><input className="input" value={form.supplier} onChange={set('supplier')} /></Field>
            <div className="sm:col-span-2"><ErrorNote>{error}</ErrorNote></div>
            <div className="sm:col-span-2"><Button type="submit" loading={busy}>Add to stock</Button></div>
          </form>
        </Card>
        <Card title="Just added">
          {last.length ? <ul className="space-y-2 text-sm">{last.map((b) => <li key={b._id}><b>{b.name}</b> · batch {b.batchNo} · {b.qtyOnHand} · cost {naira(b.costKobo)}</li>)}</ul> : <p className="text-sm text-slate-500">Nothing yet.</p>}
        </Card>
      </div>
    </div>
  );
}
