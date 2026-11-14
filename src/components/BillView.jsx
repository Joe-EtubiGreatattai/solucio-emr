import { AlertTriangle } from 'lucide-react';
import { Badge } from './ui';
import { naira } from '../lib/format';

const CATEGORY = { registration: 'Registration', consultation: 'Consultation', lab: 'Laboratory', drug: 'Pharmacy', procedure: 'Procedures', other: 'Other', discount: 'Discounts' };
const ORDER = ['registration', 'consultation', 'lab', 'procedure', 'drug', 'other', 'discount'];

/**
 * A visit's bill grouped by department. Shows HMO and patient columns when the HMO pays anything.
 * actions(line) renders per-line buttons (billing officer only).
 */
export default function BillView({ summary, actions, showVoided = false }) {
  if (!summary) return null;
  const lines = summary.lines.filter((l) => showVoided || l.status === 'active');
  const hmo = summary.hmoKobo > 0 || lines.some((l) => l.hmoKobo > 0);
  const groups = ORDER.map((c) => [c, lines.filter((l) => l.category === c)]).filter(([, ls]) => ls.length);
  return (
    <div>
      <table className="table">
        <thead>
          <tr><th>Item</th><th className="text-right">Qty</th><th className="text-right">Price</th>{hmo && <th className="text-right">HMO pays</th>}<th className="text-right">{hmo ? 'Patient pays' : 'Amount'}</th>{actions && <th />}</tr>
        </thead>
        {groups.map(([cat, ls]) => (
          <tbody key={cat}>
            <tr className="!animate-none"><td colSpan={6} data-label="" className="!bg-slate-50 !py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{CATEGORY[cat]}</td></tr>
            {ls.map((l) => (
              <tr key={l._id} className={l.status === 'voided' ? 'opacity-50 line-through' : ''}>
                <td data-label="Item">
                  <span className="font-medium">{l.name}</span>
                  {l.needsAuth && !l.authCode && <Badge color="amber" icon={AlertTriangle} className="ml-2">Needs HMO approval code</Badge>}
                  {l.authCode && <span className="ml-2 text-xs text-slate-500">Approval {l.authCode}</span>}
                  {l.hmoRejected && <Badge color="red" className="ml-2">Rejected by HMO</Badge>}
                  {l.status === 'voided' && <span className="ml-2 text-xs no-underline">Removed: {l.voidReason}</span>}
                </td>
                <td data-label="Qty" className="money text-right">{l.qty}</td>
                <td data-label="Price" className="money text-right">{naira(l.unitKobo)}</td>
                {hmo && <td data-label="HMO pays" className="money text-right">{naira(l.hmoKobo)}</td>}
                <td data-label={hmo ? 'Patient pays' : 'Amount'} className="money text-right font-semibold">{naira(hmo ? l.patientKobo : l.totalKobo)}</td>
                {actions && <td data-label="">{l.status === 'active' && actions(l)}</td>}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      <dl className="space-y-1.5 border-t border-slate-200 p-4 text-sm">
        <Row label="Total" value={summary.totalKobo} />
        {hmo && <Row label="HMO pays" value={summary.hmoKobo} />}
        <Row label={hmo ? 'Patient’s share' : 'Patient pays'} value={summary.patientKobo} />
        {summary.paidKobo > 0 && <Row label="Paid so far" value={-summary.paidKobo} />}
        <Row label="Balance due" value={summary.balanceKobo} strong />
      </dl>
      {summary.overLimit && <p className="mx-4 mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">This patient has gone over their HMO plan’s yearly limit. Check with the HMO.</p>}
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className={`flex justify-between ${strong ? 'border-t border-slate-200 pt-2 text-base font-bold text-slate-900' : 'text-slate-600'}`}>
      <dt>{label}</dt><dd className="money">{naira(value)}</dd>
    </div>
  );
}
