import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, Upload, Users, X } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { age, fullName } from '../../lib/format.js';
import { Avatar, Button, Card, ErrorNote, PageHeader, Spinner } from '../../components/ui.jsx';
import ImportPatients from '../admin/Import.jsx';

const PAGE_SIZE = 25;

export default function DoctorPatients() {
  const { can } = useAuth();
  const isAdmin = can('admin');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let current = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      api(`/patients/directory?page=${page}&limit=${PAGE_SIZE}&q=${encodeURIComponent(query.trim())}`)
        .then((result) => { if (current) setData(result); })
        .catch((e) => { if (current) setError(e.message); })
        .finally(() => { if (current) setLoading(false); });
    }, query ? 200 : 0);
    return () => { current = false; clearTimeout(timer); };
  }, [page, query, refresh]);

  function search(value) {
    setQuery(value);
    setPage(1);
  }

  const first = data?.total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const last = Math.min(page * PAGE_SIZE, data?.total || 0);

  return (
    <div>
      <PageHeader title="Patients" subtitle="Browse the patient register and open a patient’s chart."
        actions={isAdmin && <Button variant={showImport ? 'secondary' : 'primary'} icon={showImport ? X : Upload} onClick={() => setShowImport((visible) => !visible)}>{showImport ? 'Close import' : 'Import patients'}</Button>} />
      {isAdmin && showImport && <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><ImportPatients embedded onImported={() => { setPage(1); setRefresh((n) => n + 1); }} /></div>}
      <Card bodyClass="p-0">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input !rounded-xl !py-2.5 pl-10" value={query} onChange={(e) => search(e.target.value)} placeholder="Search name, phone, patient or folder number" aria-label="Search patients" />
          </div>
          <p className="text-sm text-slate-500">{data ? `${data.total.toLocaleString()} patients` : 'Loading patient count…'}</p>
        </div>

        {error && <div className="p-4"><ErrorNote>{error}</ErrorNote></div>}
        {loading && <Spinner className="!py-10" />}
        {!loading && !error && !data?.items.length && (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Users size={21} /></span>
            <p className="mt-3 font-semibold text-slate-800">{query ? 'No matching patients' : 'No patients registered yet'}</p>
            <p className="mt-1 text-sm text-slate-500">{query ? 'Try a different name, phone number, or patient number.' : 'Patients will appear here after reception registers them.'}</p>
          </div>
        )}
        {!loading && !error && data?.items.length > 0 && (
          <>
            <ul className="divide-y divide-slate-100">
              {data.items.map((patient) => (
                <li key={patient._id}>
                  <Link to={`/patients/${patient._id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-brand-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600 sm:px-5">
                    <Avatar name={fullName(patient)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-slate-900">{fullName(patient)}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500 sm:text-sm">
                        {patient.patientNo}{patient.folderNo ? ` · Folder ${patient.folderNo}` : ''} · {patient.sex === 'male' ? 'Male' : 'Female'}{patient.dob ? ` · ${age(patient.dob)}` : ''}{patient.phone ? ` · ${patient.phone}` : ''}
                      </span>
                    </span>
                    <span className="hidden text-sm font-medium text-brand-700 sm:block">Open chart</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
              <p className="text-xs text-slate-500">Showing {first}–{last} of {data.total.toLocaleString()}</p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                <span className="min-w-16 text-center text-xs tabular-nums text-slate-500">Page {page} of {Math.max(1, data.pages)}</span>
                <Button variant="secondary" size="sm" icon={ChevronRight} disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
