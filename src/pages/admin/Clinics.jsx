import { useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { naira } from '../../lib/format';
import { Badge, Button, Card, Empty, ErrorNote, Field, Modal, PageHeader, Spinner } from '../../components/ui';

export default function Clinics() {
  const { data, loading, reload } = useFetch('/clinics?all=1', { initial: [] });
  const { data: consults } = useFetch('/price-items?category=consultation', { initial: [] });
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const open = (c) => { setEdit(c); setForm({ name: c.name || '', department: c.department || '', consultationItem: c.consultationItem?._id || '', active: c.active ?? true }); setError(''); };
  const save = async () => {
    setBusy(true);
    try { if (edit._id) await api(`/clinics/${edit._id}`, { method: 'PATCH', body: form }); else await api('/clinics', { method: 'POST', body: form }); toast.success('Saved'); setEdit(null); reload(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <div>
      <PageHeader title="Clinics" subtitle="Where reception can send patients. Each clinic charges its own consultation fee." actions={<Button icon={Plus} onClick={() => open({})}>Add clinic</Button>} />
      <Card bodyClass="p-0">
        {loading ? <Spinner /> : !data.length ? <Empty title="No clinics yet" action={<Button icon={Plus} onClick={() => open({})}>Add clinic</Button>}>Reception can only check patients in to a clinic.</Empty> : (
          <table className="table">
            <thead><tr><th>Clinic</th><th>Department</th><th className="text-right">Consultation</th></tr></thead>
            <tbody>{data.map((c) => (
              <tr key={c._id} className="cursor-pointer" onClick={() => open(c)}>
                <td data-label="" className="font-medium">{c.name}{!c.active && <Badge className="ml-2">Closed</Badge>}</td>
                <td data-label="Department">{c.department || <span className="text-slate-400">—</span>}</td>
                <td data-label="Consultation" className="money text-right">{c.consultationItem ? naira(c.consultationItem.cashPriceKobo) : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?._id ? edit.name : 'Add clinic'} footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        <div className="space-y-4">
          <Field label="Name"><input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Department"><input className="input" value={form.department || ''} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
          <Field label="Consultation fee" hint="Add new fees in the price list first"><select className="input" value={form.consultationItem || ''} onChange={(e) => setForm({ ...form, consultationItem: e.target.value })}><option value="">None</option>{consults.map((i) => <option key={i._id} value={i._id}>{i.name} · {naira(i.cashPriceKobo, { decimals: 0 })}</option>)}</select></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-700" checked={form.active ?? true} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Open</label>
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Modal>
    </div>
  );
}
