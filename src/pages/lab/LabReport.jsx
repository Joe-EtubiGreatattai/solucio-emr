import { Printer } from 'lucide-react';
import { useAuth } from '../../auth.jsx';
import { age, dateTime, fullName } from '../../lib/format';
import { Button, Modal } from '../../components/ui';

/** Printable result. Print styles hide everything else on the page. */
export default function LabReport({ order, onClose }) {
  const { company } = useAuth();
  if (!order) return null;
  const r = order.result;
  return (
    <Modal open onClose={onClose} title="Lab result" size="lg" guardChanges={false}
      footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button icon={Printer} onClick={() => window.print()}>Print</Button></>}>
      <div id="print-area" className="text-sm">
        <div className="mb-4 border-b border-slate-200 pb-3">
          <p className="text-lg font-bold">{company?.name || 'Solucio Hospital'}</p>
          <p className="text-slate-500">Laboratory report</p>
        </div>
        <dl className="mb-4 grid grid-cols-2 gap-1">
          <dt className="text-slate-500">Patient</dt><dd className="font-semibold">{fullName(order.patient)}</dd>
          <dt className="text-slate-500">Patient no.</dt><dd>{order.patient?.patientNo}</dd>
          <dt className="text-slate-500">Sex / age</dt><dd>{order.patient?.sex === 'male' ? 'Male' : 'Female'}{order.patient?.dob ? ` / ${age(order.patient.dob)}` : ''}</dd>
          <dt className="text-slate-500">Test</dt><dd className="font-semibold">{order.name}</dd>
          <dt className="text-slate-500">Requested by</dt><dd>{order.orderedBy?.name}</dd>
          <dt className="text-slate-500">Verified</dt><dd>{dateTime(r?.verifiedAt)}</dd>
        </dl>
        <table className="w-full border-collapse text-left">
          <thead><tr className="border-b border-slate-300"><th className="py-1">Test</th><th className="py-1">Result</th><th className="py-1">Unit</th><th className="py-1">Normal range</th></tr></thead>
          <tbody>
            {r?.values.map((v) => (
              <tr key={v.name} className="border-b border-slate-100">
                <td className="py-1">{v.name}</td>
                <td className={`py-1 font-semibold ${v.flag === 'low' || v.flag === 'high' ? 'text-rose-700' : ''}`}>{v.value}{v.flag === 'low' ? ' (L)' : v.flag === 'high' ? ' (H)' : ''}</td>
                <td className="py-1">{v.unit}</td>
                <td className="py-1">{v.refLow != null || v.refHigh != null ? `${v.refLow ?? ''} – ${v.refHigh ?? ''}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {r?.comment && <p className="mt-3"><span className="text-slate-500">Comment:</span> {r.comment}</p>}
      </div>
    </Modal>
  );
}
