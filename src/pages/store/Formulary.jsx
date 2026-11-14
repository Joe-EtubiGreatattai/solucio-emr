import { useEffect, useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import { naira } from '../../lib/format';
import { Badge, Button, Card, Empty, ErrorNote, Field, Modal, PageHeader, Spinner } from '../../components/ui';

export default function Formulary() {
  const [groups, setGroups] = useState(null);
  const [group, setGroup] = useState(null);
  const [generics, setGenerics] = useState([]);
  const [generic, setGeneric] = useState(null);
  const [products, setProducts] = useState([]);
  const [modal, setModal] = useState(null); // {type:'group'|'generic'|'product'}

  const loadGroups = () => api('/formulary/groups').then(setGroups);
  useEffect(() => { loadGroups(); }, []);
  useEffect(() => {
    if (!group) { setGenerics([]); setGeneric(null); return; }
    api(`/formulary/generics?group=${group._id}`).then(setGenerics);
    setGeneric(null);
  }, [group]);
  useEffect(() => {
    if (!generic) { setProducts([]); return; }
    api(`/formulary/products?generic=${generic._id}`).then(setProducts);
  }, [generic]);

  const afterSave = (type) => {
    loadGroups();
    if (type !== 'group' && group) api(`/formulary/generics?group=${group._id}`).then(setGenerics);
    if (type === 'product' && generic) api(`/formulary/products?generic=${generic._id}`).then(setProducts);
  };

  if (!groups) return <Spinner />;

  return (
    <div>
      <PageHeader title="Drug formulary" subtitle="The hospital’s drug catalog: groups, generics and branded products. Reference only — it doesn’t hold stock or set prices on bills." />
      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Column title="Drug groups" onAdd={() => setModal({ type: 'group' })} count={groups.length}>
          {groups.length ? groups.map((g) => (
            <Row key={g._id} active={group?._id === g._id} onClick={() => setGroup(g)} chevron>
              <span className="font-medium">{g.name}</span>{!g.active && <Badge className="ml-2">Hidden</Badge>}
            </Row>
          )) : <Empty title="No groups yet">Add one to start the catalog.</Empty>}
        </Column>

        <Column title={group ? `Generics in ${group.name}` : 'Generic drugs'} onAdd={group ? () => setModal({ type: 'generic' }) : null} count={group ? generics.length : null} hint={!group && 'Pick a group'}>
          {!group ? <Empty title="Pick a drug group" /> : generics.length ? generics.map((g) => (
            <Row key={g._id} active={generic?._id === g._id} onClick={() => setGeneric(g)} chevron>
              <span className="font-medium">{g.genericName}</span>
              {g.therapeuticClass && <span className="block text-xs text-slate-500">{g.therapeuticClass}</span>}
            </Row>
          )) : <Empty title="No generics yet">Add one to this group.</Empty>}
        </Column>

        <Column title={generic ? `${generic.genericName} products` : 'Products'} onAdd={generic ? () => setModal({ type: 'product' }) : null} count={generic ? products.length : null} hint={!generic && 'Pick a generic'}>
          {!generic ? <Empty title="Pick a generic drug" /> : products.length ? products.map((p) => (
            <Row key={p._id}>
              <span className="font-medium">{p.brandName}</span>
              <span className="block text-xs text-slate-500">{[p.strength, p.dosageForm, p.manufacturer].filter(Boolean).join(' · ')}</span>
              {p.sellingPriceKobo > 0 && <span className="money block text-xs text-slate-400">Sells at {naira(p.sellingPriceKobo, { decimals: 0 })}</span>}
            </Row>
          )) : <Empty title="No products yet">Add a branded product.</Empty>}
        </Column>
      </div>

      {modal?.type === 'group' && <GroupForm onClose={() => setModal(null)} onSaved={() => { setModal(null); afterSave('group'); }} />}
      {modal?.type === 'generic' && <GenericForm group={group} onClose={() => setModal(null)} onSaved={() => { setModal(null); afterSave('generic'); }} />}
      {modal?.type === 'product' && <ProductForm generic={generic} onClose={() => setModal(null)} onSaved={() => { setModal(null); afterSave('product'); }} />}
    </div>
  );
}

function Column({ title, onAdd, count, hint, children }) {
  return (
    <Card bodyClass="p-0">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}{count != null && <span className="ml-1.5 text-slate-400">{count}</span>}</h2>
        {onAdd ? <Button size="sm" variant="ghost" icon={Plus} onClick={onAdd}>Add</Button> : hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
      </div>
      <div className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">{children}</div>
    </Card>
  );
}

function Row({ active, onClick, chevron, children }) {
  const inner = <div className="min-w-0 flex-1">{children}</div>;
  if (!onClick) return <div className="px-4 py-2.5 text-sm">{inner}</div>;
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${active ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
      {inner}{chevron && <ChevronRight className={`h-4 w-4 shrink-0 ${active ? 'text-brand-600' : 'text-slate-300'}`} />}
    </button>
  );
}

function useForm(initial, path, body, onSaved) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async () => {
    setBusy(true); setError('');
    try { await api(path, { method: 'POST', body: body(form) }); toast.success('Saved'); onSaved(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return { form, set, busy, error, save };
}

function GroupForm({ onClose, onSaved }) {
  const { form, set, busy, error, save } = useForm({ name: '', description: '' }, '/formulary/groups', (f) => f, onSaved);
  return (
    <Modal open onClose={onClose} title="Add drug group" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={!form.name.trim()} onClick={save}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Name"><input className="input" autoFocus value={form.name} onChange={set('name')} placeholder="e.g. Antibiotics" /></Field>
        <Field label="Description"><input className="input" value={form.description} onChange={set('description')} /></Field>
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Modal>
  );
}

function GenericForm({ group, onClose, onSaved }) {
  const { form, set, busy, error, save } = useForm({ genericName: '', scientificName: '', therapeuticClass: '', description: '' }, '/formulary/generics', (f) => ({ ...f, drugGroup: group._id }), onSaved);
  return (
    <Modal open onClose={onClose} title={`Add generic to ${group.name}`} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={!form.genericName.trim()} onClick={save}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Generic name"><input className="input" autoFocus value={form.genericName} onChange={set('genericName')} placeholder="e.g. Amoxicillin" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Scientific name"><input className="input" value={form.scientificName} onChange={set('scientificName')} /></Field>
          <Field label="Therapeutic class"><input className="input" value={form.therapeuticClass} onChange={set('therapeuticClass')} placeholder="e.g. Penicillin" /></Field>
        </div>
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Modal>
  );
}

function ProductForm({ generic, onClose, onSaved }) {
  const { form, set, busy, error, save } = useForm({ brandName: '', strength: '', dosageForm: '', manufacturer: '', unit: '', packSize: '', costPrice: '', sellingPrice: '' }, '/formulary/products', (f) => ({ ...f, genericDrug: generic._id }), onSaved);
  return (
    <Modal open onClose={onClose} title={`Add ${generic.genericName} product`} size="lg" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={!form.brandName.trim()} onClick={save}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand name" className="sm:col-span-2"><input className="input" autoFocus value={form.brandName} onChange={set('brandName')} placeholder="e.g. Amoxil" /></Field>
        <Field label="Strength"><input className="input" value={form.strength} onChange={set('strength')} placeholder="500mg" /></Field>
        <Field label="Dosage form"><input className="input" value={form.dosageForm} onChange={set('dosageForm')} placeholder="capsule" /></Field>
        <Field label="Manufacturer"><input className="input" value={form.manufacturer} onChange={set('manufacturer')} /></Field>
        <Field label="Unit"><input className="input" value={form.unit} onChange={set('unit')} placeholder="capsule" /></Field>
        <Field label="Pack size"><input className="input" value={form.packSize} onChange={set('packSize')} placeholder="10 x 10" /></Field>
        <Field label="Cost price (₦)"><input className="input money" type="number" min="0" value={form.costPrice} onChange={set('costPrice')} /></Field>
        <Field label="Selling price (₦)"><input className="input money" type="number" min="0" value={form.sellingPrice} onChange={set('sellingPrice')} /></Field>
        <div className="sm:col-span-2"><ErrorNote>{error}</ErrorNote></div>
      </div>
    </Modal>
  );
}
