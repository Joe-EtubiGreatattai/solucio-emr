import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Avatar, Badge } from './ui';
import { age, date, fullName, naira } from '../lib/format';

/** Who the patient is, at a glance. Allergies in red; money owed from earlier visits in amber. */
export default function PatientBanner({ patient, visit, outstandingKobo, action }) {
  if (!patient) return null;
  const hmo = visit?.payer?.type === 'hmo' ? visit.payer : null;
  return (
    <div className="card mb-4 flex flex-wrap items-center gap-4 p-4">
      <Avatar name={fullName(patient)} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold text-slate-900">{fullName(patient)}</p>
        <p className="text-sm text-slate-500">
          {patient.patientNo}{patient.folderNo ? ` · Folder ${patient.folderNo}` : ''} · {patient.sex === 'male' ? 'Male' : 'Female'}{patient.dob ? ` · ${age(patient.dob)} (${date(patient.dob)})` : ''}
          {visit?.visitNo ? ` · Visit ${visit.visitNo}` : ''}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {hmo ? <Badge color="blue" icon={ShieldCheck}>{hmo.hmo?.name || 'HMO'}{hmo.memberNo ? ` · ${hmo.memberNo}` : ''}</Badge> : visit && <Badge>Cash</Badge>}
          {patient.allergies?.length > 0 && <Badge color="red" icon={AlertTriangle}>Allergies: {patient.allergies.join(', ')}</Badge>}
          {outstandingKobo > 0 && <Badge color="amber">Owes {naira(outstandingKobo, { decimals: 0 })} from earlier visits</Badge>}
        </div>
      </div>
      {action}
    </div>
  );
}
