import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Send, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, download } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { fullName, naira, toKobo } from '../../lib/format';
import { newRequestId } from '../../lib/id';
import { Badge, Button, Card, Empty, ErrorNote, Field, Modal, MoneyInput, PageHeader, Spinner } from '../../components/ui';

const thisMonth = () => new Date(Date.now() + 3600000).toISOString().slice(0, 7);
const CLAIM = { open: ['Not sent', 'slate'], submitted: ['Sent to HMO', 'blue'], partly_paid: ['Partly paid', 'amber'], paid: ['Paid', 'green'] };

export default function Claims() {
  const { data: hmos } = useFetch('/hmos', { initial: [] });
  const [hmo, setHmo] = useState('');
  const [month, setMonth] = useState(thisMonth);
  const path = hmo ? `/billing/claims?hmo=${hmo}&month=${month}` : null;
  return (
    <div>
      <PageHeader title="HMO claims" subtitle="What each HMO owes for visits closed in a month. Export it, send it, then record their payment."
        actions={<>
          <select className="input !w-auto" aria-label="HMO" value={hmo} onChange={(e) => setHmo(e.target.value)}><option value="">Choose HMO…</option>{hmos.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}</select>
          <input className="input !w-auto" type="month" aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </>} />
      {path ? <ClaimView key={path} path={path} hmo={hmo} month={month} /> : <Card><Empty title="Pick an HMO" icon={Send} /></Card>}
    </div>
  );
}

function ClaimView({ path, hmo, month }) {
  const { data, loading, reload } = useFetch(path);
  const [pay, setPay] = useState(false);
  const [form, setForm] = useState({ amount: '', method: 'transfer' });
  const [requestId, setRequestId] = useState(newRequestId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (loading || !data) return <Spinner />;
  const st = CLAIM[data.claim.status];

  const submit = async () => { try { await api(`/billing/claims/${hmo}/${month}/submit`, { method: 'POST' }); toast.success('Marked as sent'); reload(); } catch (e) { toast.error(e.message); } };
  const record = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/billing/claims/${hmo}/${month}/paid`, { method: 'POST', body: { amountKobo: toKobo(form.amount), method: form.method, requestId } });
      toast.success('Payment recorded');
      setPay(false);
      setRequestId(newRequestId());
      reload();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="text-sm text-slate-500">Claim total</p><p className="money text-2xl font-bold">{naira(data.totalKobo)}</p></div>
        <div className="card p-4"><p className="text-sm text-slate-500">Paid by HMO</p><p className="money text-2xl font-bold">{naira(data.claim.paidKobo)}</p></div>
        <div className="card p-4"><p className="text-sm text-slate-500">Status</p><p className="mt-1"><Badge color={st[1]}>{st[0]}</Badge>{data.missingAuthCount > 0 && <Badge color="amber" className="ml-1">{data.missingAuthCount} missing approval code</Badge>}</p></div>
      </div>
      <Card title={`${data.hmo.name} · ${month}`} bodyClass="p-0" action={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={Download} disabled={!data.patients.length} onClick={() => download(`/billing/claims/export?hmo=${hmo}&month=${month}`, `claim-${data.hmo.name}-${month}.csv`)}>Export CSV</Button>
          {data.claim.status === 'open' && <Button size="sm" variant="secondary" icon={Send} disabled={!data.patients.length} onClick={submit}>Mark as sent</Button>}
          <Button size="sm" icon={Wallet} disabled={!data.patients.length} onClick={() => { setPay(true); setForm({ amount: '', method: 'transfer' }); }}>Record HMO payment</Button>
        </div>
      }>
        {!data.patients.length ? <Empty title="No closed visits for this HMO in this month" /> : (
          <table className="table">
            <thead><tr><th>Patient</th><th>Visits</th><th className="text-right">HMO owes</th></tr></thead>
            <tbody>
              {data.patients.map((p) => (
                <tr key={p.patient._id}>
                  <td data-label=""><span className="font-semibold">{fullName(p.patient)}</span><span className="block text-xs text-slate-500">{p.patient.patientNo} · {p.memberNo}</span></td>
                  <td data-label="Visits">{p.visits.map((v) => (
                    <Link key={v.visitId} to={`/billing/bill/${v.visitId}`} className="block text-sm text-brand-700 hover:underline">
                      {v.visitNo} · {v.date} · {v.lines.length} item{v.lines.length === 1 ? '' : 's'}{v.lines.some((l) => l.missingAuth) ? ' · needs code' : ''}
                    </Link>
                  ))}</td>
                  <td data-label="HMO owes" className="money text-right font-semibold">{naira(p.totalKobo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={pay} onClose={() => setPay(false)} title="HMO payment received" size="sm" guardChanges={false}
        footer={<><Button variant="secondary" onClick={() => setPay(false)}>Cancel</Button><Button loading={busy} disabled={!toKobo(form.amount)} onClick={record}>Record</Button></>}>
        <div className="space-y-3">
          <Field label="Amount"><MoneyInput value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="How"><select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option value="transfer">Transfer</option><option value="pos">POS</option><option value="cash">Cash</option></select></Field>
          <p className="text-xs text-slate-500">It’s recorded in Payment &amp; Receipt as HMO income.</p>
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Modal>
    </>
  );
}
