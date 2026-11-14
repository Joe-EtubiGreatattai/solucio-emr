import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { useLive } from '../../lib/live';
import { dateTime, fullName } from '../../lib/format';
import { Badge, Button, Card, Empty, Field, MetricGrid, Modal, PageHeader, Spinner, ErrorNote } from '../../components/ui';

export const VISIT_STATUS = {
  waiting: { label: 'Waiting', color: 'amber' },
  in_progress: { label: 'Being seen', color: 'blue' },
  awaiting_payment: { label: 'At the cashier', color: 'teal' },
  closed: { label: 'Finished', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'slate' },
};

export default function Today() {
  const { data, loading, reload } = useFetch('/visits/today', { initial: [] });
  useLive(['visit', 'queue'], useCallback(() => reload(), [reload]));
  const [cancel, setCancel] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const visits = data || [];
  const metrics = [
    { label: 'Checked in', value: loading ? '—' : visits.length, hint: 'Visits today', tone: 'brand' },
    { label: 'Waiting', value: loading ? '—' : visits.filter((v) => v.status === 'waiting').length, hint: 'Not yet seen', tone: 'amber' },
    { label: 'Being seen', value: loading ? '—' : visits.filter((v) => v.status === 'in_progress').length, hint: 'Currently in care', tone: 'blue' },
    { label: 'At cashier', value: loading ? '—' : visits.filter((v) => v.status === 'awaiting_payment').length, hint: 'Ready for payment', tone: 'green' },
  ];

  async function doCancel() {
    setBusy(true);
    setError('');
    try {
      await api(`/visits/${cancel._id}/cancel`, { method: 'POST', body: { reason } });
      toast.success('Visit cancelled');
      setCancel(null);
      reload();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Today’s visits" subtitle="Everyone checked in today, and anyone still in the hospital." />
      <MetricGrid items={metrics} />
      <Card bodyClass="p-0">
        {loading ? <Spinner /> : !data.length ? <Empty title="No visits yet today" /> : (
          <table className="table">
            <thead><tr><th>Patient</th><th>Clinic</th><th>Checked in</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.map((v) => (
                <tr key={v._id}>
                  <td data-label=""><Link to={`/reception?p=${v.patient?._id}`} className="font-semibold text-slate-900 hover:text-brand-700">{fullName(v.patient)}</Link><span className="block text-xs text-slate-500">{v.patient?.patientNo} · {v.visitNo}</span></td>
                  <td data-label="Clinic">{v.clinic?.name}</td>
                  <td data-label="Checked in">{dateTime(v.createdAt)}</td>
                  <td data-label="Status"><Badge color={VISIT_STATUS[v.status]?.color}>{VISIT_STATUS[v.status]?.label}</Badge>{v.priority === 1 && <Badge color="red" className="ml-1">Urgent</Badge>}</td>
                  <td data-label="">{['waiting', 'in_progress'].includes(v.status) && <Button size="sm" variant="ghost" onClick={() => { setCancel(v); setReason(''); setError(''); }}>Cancel</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={Boolean(cancel)} onClose={() => setCancel(null)} title="Cancel this visit?" size="sm" guardChanges={false}
        footer={<><Button variant="secondary" onClick={() => setCancel(null)}>Keep it</Button><Button variant="danger" loading={busy} disabled={!reason.trim()} onClick={doCancel}>Cancel visit</Button></>}>
        <p className="mb-3 text-sm text-slate-600">Only possible before any service was given. The registration and consultation fees are removed.</p>
        <Field label="Reason"><input className="input" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Checked in the wrong patient" /></Field>
        <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>
      </Modal>
    </div>
  );
}
