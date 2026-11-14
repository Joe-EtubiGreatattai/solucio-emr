import { useCallback, useState } from 'react';
import { Syringe } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { dateTime, fullName } from '../../lib/format';
import { Badge, Button, Card, Empty, ErrorNote, Field, MetricGrid, Modal, PageHeader, Spinner } from '../../components/ui';

export default function Procedures() {
  const { data, loading, reload } = useFetch('/procedures/queue', { initial: [] });
  useLive(['queue'], useCallback(() => reload(), [reload]));
  const [open, setOpen] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const orders = data || [];
  const metrics = [
    { label: 'Waiting procedures', value: loading ? '—' : orders.length, hint: 'Ready to be carried out', tone: 'brand' },
    { label: 'Urgent', value: loading ? '—' : orders.filter((o) => o.visit?.priority === 1).length, hint: 'Check priority first', tone: 'red' },
    { label: 'Patients', value: loading ? '—' : new Set(orders.map((o) => o.visit?._id).filter(Boolean)).size, hint: 'Unique visits in queue', tone: 'blue' },
  ];

  async function done() {
    setBusy(true);
    setError('');
    try {
      await api(`/procedures/orders/${open._id}/done`, { method: 'POST', body: { notes } });
      toast.success('Done and added to the bill');
      setOpen(null);
      reload();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Procedures" subtitle="Dressings, injections, suturing and the like. Marking one done adds it to the bill." />
      <MetricGrid items={metrics} />
      <Card bodyClass="p-0">
        {loading ? <Spinner /> : !data.length ? <Empty title="No procedures waiting" icon={Syringe} /> : (
          <table className="table">
            <thead><tr><th>Patient</th><th>Procedure</th><th>Ordered</th><th /></tr></thead>
            <tbody>
              {data.map((o) => (
                <tr key={o._id}>
                  <td data-label=""><span className="font-semibold">{fullName(o.patient)}</span><span className="block text-xs text-slate-500">{o.patient?.patientNo}</span>{o.patient?.allergies?.length > 0 && <Badge color="red">Allergies: {o.patient.allergies.join(', ')}</Badge>}</td>
                  <td data-label="Procedure">{o.name}{o.instructions && <span className="block text-xs text-slate-500">{o.instructions}</span>}</td>
                  <td data-label="Ordered">{dateTime(o.createdAt)}<span className="block text-xs text-slate-500">{o.orderedBy?.name}</span></td>
                  <td data-label=""><Button size="sm" onClick={() => { setOpen(o); setNotes(''); setError(''); }}>Mark done</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={Boolean(open)} onClose={() => setOpen(null)} title={open?.name} size="sm" guardChanges={false}
        footer={<><Button variant="secondary" onClick={() => setOpen(null)}>Cancel</Button><Button loading={busy} onClick={done}>Done</Button></>}>
        <p className="mb-3 text-sm text-slate-600">For {fullName(open?.patient)}.</p>
        <Field label="Notes (optional)"><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>
      </Modal>
    </div>
  );
}
