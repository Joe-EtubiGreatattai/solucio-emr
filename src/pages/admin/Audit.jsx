import { useState } from 'react';
import useFetch from '../../lib/useFetch';
import { dateTime } from '../../lib/format';
import { Avatar, Button, Card, PageHeader, Spinner } from '../../components/ui';

const FILTERS = [['', 'Everything'], ['patient', 'Patients'], ['visit', 'Visits'], ['payment', 'Payments'], ['bill', 'Bill changes'], ['stock', 'Stock'], ['price', 'Prices'], ['admission', 'Admissions'], ['auth', 'Sign-ins']];

// Plain words for each recorded action
const WORDS = {
  'auth.login': 'Signed in', 'auth.failed_login': 'Wrong password', 'auth.locked': 'Account locked after wrong passwords', 'auth.change_password': 'Changed their password',
  'patient.create': 'Registered a patient', 'patient.update': 'Edited a patient’s details', 'patient.view': 'Opened a patient’s chart',
  'patients.import': 'Imported patients', 'patients.import.undo': 'Undid a patient import',
  'visit.checkin': 'Checked a patient in', 'visit.cancel': 'Cancelled a visit', 'visit.complete': 'Finished a visit', 'visit.send': 'Sent a patient to another station', 'visit.close': 'Closed a bill with a balance',
  'vitals.create': 'Recorded vitals', 'note.save': 'Saved consultation notes', 'order.create': 'Placed an order', 'order.cancel': 'Cancelled an order',
  'lab.result': 'Entered a lab result', 'lab.verify': 'Verified a lab result', 'procedure.done': 'Did a procedure',
  'pharmacy.dispense': 'Dispensed drugs', 'pharmacy.return': 'Took back returned drugs',
  'stock.receive': 'Received stock', 'stock.adjust': 'Adjusted stock', 'stock.take': 'Did a stock count',
  'payment.create': 'Took a payment', 'bill.void': 'Removed a charge', 'bill.discount': 'Gave a discount', 'bill.auth': 'Added an HMO approval code',
  'claim.submit': 'Sent an HMO claim', 'claim.paid': 'Recorded an HMO payment', 'claim.reject': 'Marked an item rejected by the HMO',
  'price.create': 'Added a price list item', 'price.update': 'Changed a price', 'hmo.create': 'Added an HMO', 'hmo.update': 'Edited an HMO', 'hmo.plan.create': 'Added an HMO plan', 'hmo.plan.update': 'Edited an HMO plan',
  'clinic.create': 'Added a clinic', 'clinic.update': 'Edited a clinic',
  'store.item.create': 'Added a General Store item', 'store.item.update': 'Edited a General Store item',
  'store.purchase.receive': 'Received a General Store purchase', 'store.adjust': 'Adjusted General Store stock',
  'store.transfer.create': 'Sent a General Store transfer to Pharmacy', 'store.transfer.receive': 'Received a General Store transfer',
  'ward.create': 'Added a ward', 'admission.create': 'Admitted a patient', 'admission.transfer': 'Moved a patient to another bed', 'admission.discharge': 'Discharged a patient',
};
const KEY_WORDS = { patientNo: 'Patient', visitNo: 'Visit', name: 'Item', reason: 'Reason', qty: 'Quantity', total: 'Total', kind: 'Type', code: 'Code', authCode: 'Code', ward: 'Ward', bedNo: 'Bed', toWard: 'To ward', toBed: 'To bed', test: 'Test', fileName: 'File', imported: 'Imported', ip: 'From' };
const naira = (k) => `₦${(k / 100).toLocaleString('en-NG')}`;

function details(meta) {
  if (!meta || typeof meta !== 'object') return '';
  return Object.entries(meta)
    .filter(([k, v]) => v !== undefined && v !== null && v !== '' && typeof v !== 'object' && k !== 'via')
    .map(([k, v]) => `${KEY_WORDS[k] || k.replace(/Kobo$/, '').replace(/([A-Z])/g, ' $1').toLowerCase()}: ${/Kobo$/.test(k) ? naira(v) : v}`)
    .join(' · ');
}

export default function Audit() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const { data, loading } = useFetch(`/audit?page=${page}${action ? `&action=${action}` : ''}`);
  return (
    <div>
      <PageHeader title="Activity log" subtitle="Who did what and when, including every time someone opened a patient’s chart." />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map(([v, label]) => (
          <button key={v || 'all'} type="button" onClick={() => { setAction(v); setPage(1); }} aria-pressed={action === v}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${action === v ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>{label}</button>
        ))}
      </div>
      <Card bodyClass="p-0">
        {loading || !data ? <Spinner /> : !data.items.length ? <p className="p-8 text-center text-sm text-slate-500">Nothing recorded here yet.</p> : (
          <>
            <ul className="divide-y divide-slate-100">
              {data.items.map((a) => (
                <li key={a._id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                  <Avatar name={a.user?.name || 'System'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-900"><span className="font-semibold">{a.user?.name || 'System'}</span> {(WORDS[a.action] || a.action).replace(/^./, (c) => c.toLowerCase())}</p>
                    {details(a.metadata) && <p className="truncate text-xs text-slate-500">{details(a.metadata)}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{dateTime(a.createdAt)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-slate-100 p-3 text-sm text-slate-500">
              <span>Page {data.page} of {data.pages || 1}</span>
              <span className="flex gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</Button><Button size="sm" variant="secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Older</Button></span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
