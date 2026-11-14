import { Printer } from 'lucide-react';
import useFetch from '../../lib/useFetch';
import { dateTime, fullName, naira } from '../../lib/format';
import { Button, Modal, Spinner } from '../../components/ui';

/** Printable receipt for one payment. */
export default function Receipt({ paymentId, onClose }) {
  if (!paymentId) return null;
  return <ReceiptModal paymentId={paymentId} onClose={onClose} />;
}

function ReceiptModal({ paymentId, onClose }) {
  const { data, loading } = useFetch(`/cashier/payments/${paymentId}/receipt`);
  const hmo = data?.summary?.hmoKobo > 0;
  return (
    <Modal open onClose={onClose} title="Receipt" guardChanges={false}
      footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button icon={Printer} onClick={() => window.print()} disabled={!data}>Print</Button></>}>
      {loading || !data ? <Spinner /> : (
        <div id="print-area" className="mx-auto max-w-sm text-sm">
          <p className="text-center text-lg font-bold">{data.hospital || 'Solucio Hospital'}</p>
          <p className="mb-3 text-center text-slate-500">Payment receipt</p>
          <dl className="mb-3 grid grid-cols-2 gap-y-0.5">
            <dt className="text-slate-500">Receipt no.</dt><dd className="text-right font-semibold">{data.payment.receiptNo || `${data.payment.paymentNo} (receipt no. pending)`}</dd>
            <dt className="text-slate-500">Date</dt><dd className="text-right">{dateTime(data.payment.createdAt)}</dd>
            <dt className="text-slate-500">Patient</dt><dd className="text-right">{fullName(data.patient)}</dd>
            <dt className="text-slate-500">Patient no.</dt><dd className="text-right">{data.patient?.patientNo}</dd>
            <dt className="text-slate-500">Visit</dt><dd className="text-right">{data.visit.visitNo}</dd>
            {hmo && <><dt className="text-slate-500">HMO</dt><dd className="text-right">{data.visit.payer?.hmo?.name}</dd></>}
          </dl>
          <table className="mb-3 w-full">
            <tbody>
              {data.lines.map((l) => (
                <tr key={l._id} className="border-b border-dashed border-slate-200">
                  <td className="py-1">{l.name}{l.qty > 1 ? ` ×${l.qty}` : ''}</td>
                  <td className="money py-1 text-right">{naira(hmo ? l.patientKobo : l.totalKobo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="grid grid-cols-2 gap-y-0.5">
            {hmo && <><dt>HMO pays</dt><dd className="money text-right">{naira(data.summary.hmoKobo)}</dd></>}
            <dt>{hmo ? 'Your share' : 'Total'}</dt><dd className="money text-right">{naira(data.summary.patientKobo)}</dd>
            <dt className="font-bold">This payment ({data.payment.method.toUpperCase()})</dt><dd className="money text-right font-bold">{naira(data.payment.amountKobo)}</dd>
            <dt>Paid in total</dt><dd className="money text-right">{naira(data.summary.paidKobo)}</dd>
            <dt>Balance</dt><dd className="money text-right">{naira(data.summary.balanceKobo)}</dd>
          </dl>
          <p className="mt-4 text-center text-xs text-slate-500">Received by {data.payment.by?.name}. Thank you.</p>
        </div>
      )}
    </Modal>
  );
}
