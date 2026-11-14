import { useState } from 'react';
import { Link } from 'react-router-dom';
import useFetch from '../../lib/useFetch';
import { useAuth } from '../../auth.jsx';
import { date, fullName, naira } from '../../lib/format';
import { Card, Empty, PageHeader, Spinner, StatCard, Tabs } from '../../components/ui';
import { StockMovementsReport } from '../store/StockMovements.jsx';

const today = () => new Date(Date.now() + 3600000).toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;
const CAT = { registration: 'Registration', consultation: 'Consultation', lab: 'Laboratory', drug: 'Pharmacy', procedure: 'Procedures', other: 'Other', discount: 'Discounts' };

export default function Reports() {
  const { can } = useAuth();
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [tab, setTab] = useState('takings');
  const tabs = [{ value: 'takings', label: 'Takings' }, { value: 'revenue', label: 'Revenue' }, { value: 'hmo', label: 'HMOs owe' }, { value: 'owing', label: 'Patients owe' }];
  if (can('pharmacy')) tabs.push({ value: 'stock', label: 'Stock value' });
  if (can('pharmacy') || can('store')) tabs.push({ value: 'movements', label: 'Stock movements' });
  return (
    <div>
      <PageHeader title="Reports" actions={['takings', 'revenue'].includes(tab) && <>
        <input type="date" className="input !w-auto" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="input !w-auto" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} />
      </>} />
      <div className="mb-4"><Tabs value={tab} onChange={setTab} tabs={tabs} /></div>
      {tab === 'takings' && <Takings from={from} to={to} />}
      {tab === 'revenue' && <Revenue from={from} to={to} />}
      {tab === 'hmo' && <HmoOwe />}
      {tab === 'owing' && <Owing />}
      {tab === 'stock' && <StockValue />}
      {tab === 'movements' && <StockMovementsReport />}
    </div>
  );
}

function Takings({ from, to }) {
  const { data, loading } = useFetch(`/reports/takings?from=${from}&to=${to}`);
  if (loading || !data) return <Spinner />;
  const sum = (k) => data.days.reduce((s, d) => s + d[k], 0);
  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <StatCard label="Total taken" value={naira(data.totalKobo, { decimals: 0 })} />
        <StatCard label="Cash" value={naira(sum('cash'), { decimals: 0 })} /><StatCard label="POS" value={naira(sum('pos'), { decimals: 0 })} /><StatCard label="Transfer" value={naira(sum('transfer'), { decimals: 0 })} />
      </div>
      <Card bodyClass="p-0">{!data.days.length ? <Empty title="No payments in these dates">Pick other dates above.</Empty> : <table className="table"><thead><tr><th>Day</th><th className="text-right">Cash</th><th className="text-right">POS</th><th className="text-right">Transfer</th><th className="text-right">Total</th></tr></thead>
        <tbody>{data.days.map((d) => { const top = Math.max(...data.days.map((x) => x.totalKobo), 1); return (
          <tr key={d.day}><td data-label="">{date(d.day)}</td>{['cash', 'pos', 'transfer'].map((k) => <td key={k} data-label={k.toUpperCase()} className="money text-right">{d[k] ? naira(d[k]) : <span className="text-slate-300">—</span>}</td>)}
            <td data-label="Total" className="text-right"><span className="money font-semibold">{naira(d.totalKobo)}</span><span className="ml-auto mt-1 block h-1.5 rounded-full bg-brand-500/80" style={{ width: `${Math.max(4, (d.totalKobo / top) * 100)}%` }} /></td></tr>
        ); })}</tbody></table>}</Card>
    </>
  );
}

function Revenue({ from, to }) {
  const { data, loading } = useFetch(`/reports/revenue?from=${from}&to=${to}`);
  if (loading || !data) return <Spinner />;
  const table = (rows, key, label) => (
    <Card title={label} bodyClass="p-0">{!rows.length ? <Empty title="No closed visits in these dates" /> : <table className="table"><thead><tr><th /><th className="text-right">HMO</th><th className="text-right">Patients</th><th className="text-right">Total</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r[key]}><td data-label="">{CAT[r[key]] || r[key]}</td><td data-label="HMO" className="money text-right">{naira(r.hmoKobo)}</td><td data-label="Patients" className="money text-right">{naira(r.patientKobo)}</td><td data-label="Total" className="money text-right font-semibold">{naira(r.totalKobo)}</td></tr>)}</tbody></table>}</Card>
  );
  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2"><StatCard label="Billed (closed visits)" value={naira(data.totalKobo, { decimals: 0 })} /><StatCard label="Visits closed" value={data.visits} /></div>
      <div className="grid gap-4 lg:grid-cols-2">{table(data.byCategory, 'category', 'By department')}{table(data.byClinic, 'clinic', 'By clinic')}</div>
    </>
  );
}

function HmoOwe() {
  const { data, loading } = useFetch('/reports/hmo-receivables', { initial: [] });
  if (loading) return <Spinner />;
  return (
    <Card bodyClass="p-0">{!data.length ? <Empty title="No HMO bills yet" /> : <table className="table"><thead><tr><th>HMO</th><th className="text-right">Billed to HMO</th><th className="text-right">Paid</th><th className="text-right">Still owed</th></tr></thead>
      <tbody>{data.map((r) => <tr key={r.hmo._id}><td data-label="">{r.hmo.name}</td><td data-label="Billed" className="money text-right">{naira(r.owedKobo)}</td><td data-label="Paid" className="money text-right">{naira(r.paidKobo)}</td><td data-label="Still owed" className="money text-right font-semibold">{naira(r.outstandingKobo)}</td></tr>)}</tbody></table>}</Card>
  );
}

function Owing() {
  const { data, loading } = useFetch('/reports/outstanding');
  if (loading || !data) return <Spinner />;
  return (
    <Card title={`Patients owe ${naira(data.totalKobo)}`} subtitle="Open a patient to see their bills." bodyClass="p-0">{!data.patients.length ? <Empty title="Nobody owes anything" /> : <table className="table"><thead><tr><th>Patient</th><th>Phone</th><th className="text-right">Owes</th></tr></thead>
      <tbody>{data.patients.map((p) => <tr key={p.patient?._id}><td data-label=""><Link to={`/reception?p=${p.patient?._id}`} className="font-medium text-brand-700 hover:underline">{fullName(p.patient)}</Link> <span className="text-xs text-slate-500">{p.patient?.patientNo}</span></td><td data-label="Phone">{p.patient?.phone}</td><td data-label="Owes" className="money text-right font-semibold">{naira(p.balanceKobo)}</td></tr>)}</tbody></table>}</Card>
  );
}

function StockValue() {
  const { data, loading } = useFetch('/reports/stock-value');
  if (loading || !data) return <Spinner />;
  return (
    <Card title={`Stock worth ${naira(data.totalKobo)} at cost`} bodyClass="p-0">{!data.items.length ? <Empty title="No stock recorded" /> : <table className="table"><thead><tr><th>Drug</th><th className="text-right">Qty</th><th className="text-right">Value</th></tr></thead>
      <tbody>{data.items.map((r) => <tr key={r._id}><td data-label="">{r.name}</td><td data-label="Qty" className="money text-right">{r.qty}</td><td data-label="Value" className="money text-right">{naira(r.valueKobo)}</td></tr>)}</tbody></table>}</Card>
  );
}
