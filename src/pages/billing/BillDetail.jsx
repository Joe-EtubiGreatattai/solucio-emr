import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgePercent, KeyRound, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { naira, toKobo } from '../../lib/format';
import { Button, Card, ErrorNote, Field, IconButton, Modal, MoneyInput, Spinner } from '../../components/ui';
import PatientBanner from '../../components/PatientBanner';
import BillView from '../../components/BillView';

export default function BillDetail() {
  const { visitId } = useParams();
  const { data, loading, reload } = useFetch(`/billing/bills/${visitId}`);
  const [act, setAct] = useState(null); // { kind: void|auth|reject|discount, line }
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (loading || !data) return <Spinner />;
  const { visit, patient, summary } = data;
  const open = ['waiting', 'in_progress', 'awaiting_payment'].includes(visit.status);
  const start = (kind, line) => { setAct({ kind, line }); setValue(''); setError(''); };

  async function go() {
    setBusy(true);
    setError('');
    try {
      if (act.kind === 'void') await api(`/billing/lines/${act.line._id}/void`, { method: 'POST', body: { reason: value } });
      if (act.kind === 'auth') await api(`/billing/lines/${act.line._id}/auth`, { method: 'POST', body: { authCode: value } });
      if (act.kind === 'reject') await api(`/billing/lines/${act.line._id}/reject`, { method: 'POST', body: { reason: value } });
      if (act.kind === 'discount') await api(`/billing/visits/${visitId}/discount`, { method: 'POST', body: { amountKobo: toKobo(value.amount), reason: value.reason } });
      toast.success('Done');
      setAct(null);
      reload();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const TITLES = { void: 'Remove this charge', auth: 'HMO approval code', reject: 'HMO rejected this item', discount: 'Discount or waiver' };
  return (
    <div>
      <Link to="/billing" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Bills</Link>
      <PatientBanner patient={patient} visit={visit}
        action={open && summary.balanceKobo > 0 && <Button variant="secondary" icon={BadgePercent} onClick={() => { setAct({ kind: 'discount' }); setValue({ amount: '', reason: '' }); setError(''); }}>Discount</Button>} />
      <Card title="Bill" subtitle={`${visit.visitNo} · removed charges shown crossed out`} bodyClass="p-0">
        <BillView summary={summary} showVoided actions={(l) => (
          <span className="flex justify-end gap-1">
            {l.needsAuth && <IconButton icon={KeyRound} label="Add approval code" tone="brand" onClick={() => start('auth', l)} />}
            {l.hmoKobo > 0 && visit.status === 'closed' && <Button size="sm" variant="ghost" onClick={() => start('reject', l)}>HMO rejected</Button>}
            <IconButton icon={Trash2} label="Remove charge" tone="danger" onClick={() => start('void', l)} />
          </span>
        )} />
      </Card>
      <Modal open={Boolean(act)} onClose={() => setAct(null)} title={act && TITLES[act.kind]} size="sm" guardChanges={false}
        footer={<><Button variant="secondary" onClick={() => setAct(null)}>Cancel</Button><Button loading={busy} variant={act?.kind === 'void' ? 'danger' : 'primary'} onClick={go}>Save</Button></>}>
        {act?.line && <p className="mb-3 text-sm text-slate-600">{act.line.name} · {naira(act.line.totalKobo)}</p>}
        {act?.kind === 'discount' ? (
          <div className="space-y-3">
            <Field label="Amount off"><MoneyInput value={value.amount || ''} onChange={(e) => setValue({ ...value, amount: e.target.value })} /></Field>
            <Field label="Reason"><input className="input" value={value.reason || ''} onChange={(e) => setValue({ ...value, reason: e.target.value })} placeholder="e.g. Staff relative, approved by MD" /></Field>
          </div>
        ) : (
          <Field label={act?.kind === 'auth' ? 'Approval code' : 'Reason'}>
            <input className="input" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={act?.kind === 'reject' ? 'The HMO’s reason. The patient will owe this amount.' : ''} />
          </Field>
        )}
        <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>
      </Modal>
    </div>
  );
}
