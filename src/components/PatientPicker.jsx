import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../api.js';
import { age, fullName } from '../lib/format';
import { Avatar, Spinner } from './ui';

/** Search box + results: name, phone, SOL number, folder number or HMO number. */
export default function PatientPicker({ onPick, autoFocus = true, placeholder = 'Name, phone, patient no., folder no. or HMO no.' }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(null); return undefined; }
    setBusy(true);
    const t = setTimeout(() => {
      api(`/patients?q=${encodeURIComponent(term)}`).then(setResults).catch(() => setResults([])).finally(() => setBusy(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input className="input !rounded-2xl !py-3.5 pl-12 !text-base" autoFocus={autoFocus} value={q} placeholder={placeholder} aria-label="Find a patient" onChange={(e) => setQ(e.target.value)} />
      </div>
      {busy && <Spinner className="!py-6" />}
      {!busy && results && (
        <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {results.map((p) => (
            <li key={p._id}>
              <button type="button" onClick={() => onPick(p)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-brand-50/60">
                <Avatar name={fullName(p)} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{fullName(p)}</span>
                  <span className="block truncate text-sm text-slate-500">{p.patientNo}{p.folderNo ? ` · Folder ${p.folderNo}` : ''} · {p.sex === 'male' ? 'M' : 'F'}{p.dob ? ` · ${age(p.dob)}` : ''}{p.phone ? ` · ${p.phone}` : ''}</span>
                </span>
              </button>
            </li>
          ))}
          {!results.length && <li className="px-4 py-4 text-sm text-slate-600">No patient matches “{q.trim()}”.</li>}
        </ul>
      )}
    </div>
  );
}
