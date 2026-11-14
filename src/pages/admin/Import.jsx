import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, getToken } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { dateTime } from '../../lib/format';
import { Badge, Button, Card, ErrorNote, Field, PageHeader } from '../../components/ui';

const FIELDS = [
  ['fullName', 'Full name (one column)'], ['firstName', 'First name'], ['lastName', 'Last name / surname'], ['otherNames', 'Other names'],
  ['sex', 'Sex'], ['dob', 'Date of birth'], ['phone', 'Phone'], ['address', 'Address'], ['folderNo', 'Old folder / patient no.'],
  ['hmoName', 'HMO name'], ['memberNo', 'HMO member no.'], ['allergies', 'Allergies'], ['notes', 'Notes / history'],
];
// Guess which column is which from its header
const GUESS = { fullName: /^(full ?name|name|patient ?name)$/i, firstName: /first|given/i, lastName: /last|surname|family/i, otherNames: /other|middle/i, sex: /sex|gender/i, dob: /birth|dob/i, phone: /phone|mobile|tel/i, address: /address/i, folderNo: /folder|file|card|hosp.*no|patient.*(no|id)/i, hmoName: /^hmo$|insur|hmo name/i, memberNo: /member|enrol|policy/i, allergies: /allerg/i, notes: /note|history|remark/i };
const BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/api`;

export default function Import() {
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const { data: batches, reload } = useFetch('/imports', { initial: [] });

  async function upload(f) {
    setFile(f); setParsed(null); setPreview(null); setError(''); setBusy('parse');
    try {
      const res = await fetch(`${BASE}/imports/parse`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/octet-stream', 'x-file-name': encodeURIComponent(f.name) }, body: f });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Couldn’t read the file');
      setParsed(data);
      const m = {};
      for (const [field, rx] of Object.entries(GUESS)) { const h = data.headers.find((x) => rx.test(x) && !Object.values(m).includes(x)); if (h) m[field] = h; }
      if (m.fullName && (m.firstName || m.lastName)) delete m.fullName;
      setMapping(m);
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  }
  async function check() {
    setBusy('preview'); setError('');
    try { setPreview(await api('/imports/preview', { method: 'POST', body: { rows: parsed.rows, mapping } })); } catch (e) { setError(e.message); } finally { setBusy(''); }
  }
  async function run() {
    setBusy('import'); setError('');
    try {
      const b = await api('/imports', { method: 'POST', body: { rows: parsed.rows, mapping, fileName: file.name } });
      toast.success(`Imported ${b.imported} patients (${b.skipped} skipped)`);
      setFile(null); setParsed(null); setPreview(null); reload();
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  }
  async function undo(b) {
    try { await api(`/imports/${b._id}/undo`, { method: 'POST' }); toast.success('Import undone'); reload(); } catch (e) { toast.error(e.message); }
  }
  const ok = preview?.filter((p) => !p.problems.length && !p.duplicateOf).length || 0;

  return (
    <div>
      <PageHeader title="Import patients" subtitle="Bring in patients from the old records: a CSV or Excel (.xlsx) file with one patient per row."
        back={<Link to="/patients" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={15} /> Patients</Link>} />
      <div className="space-y-4">
        <Card title="1. Choose the file">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-brand-400">
            <Upload className="h-8 w-8 text-brand-600" />
            <span className="font-semibold">{file ? file.name : 'Click to choose a .csv or .xlsx file'}</span>
            {parsed && <span className="text-sm text-slate-500">{parsed.rows.length} rows found</span>}
            <input type="file" accept=".csv,.xlsx" className="sr-only" onChange={(e) => e.target.files[0] && upload(e.target.files[0])} />
          </label>
        </Card>
        {parsed && (
          <Card title="2. Match the columns" subtitle="We guessed from the headers. Check each one.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map(([f, l]) => (
                <Field key={f} label={l}>
                  <select className="input" value={mapping[f] || ''} onChange={(e) => { setMapping({ ...mapping, [f]: e.target.value || undefined }); setPreview(null); }}>
                    <option value="">— not in this file —</option>{parsed.headers.map((h) => <option key={h}>{h}</option>)}
                  </select>
                </Field>
              ))}
            </div>
            <Button className="mt-4" loading={busy === 'preview'} onClick={check}>Check the rows</Button>
          </Card>
        )}
        {preview && (
          <Card title="3. Check and import" subtitle={`${ok} ready · ${preview.filter((p) => p.duplicateOf).length} look like patients already here · ${preview.filter((p) => p.problems.length).length} have problems`} bodyClass="p-0"
            action={<Button loading={busy === 'import'} disabled={!ok} onClick={run}>Import {ok} patients</Button>}>
            <div className="max-h-[28rem] overflow-y-auto">
              <table className="table">
                <thead><tr><th>Row</th><th>Patient</th><th>Status</th></tr></thead>
                <tbody>{preview.map((p) => (
                  <tr key={p.row}>
                    <td data-label="Row">{p.row}</td>
                    <td data-label="">{[p.data.firstName, p.data.lastName].filter((x) => x && x !== '-').join(' ') || '—'}<span className="block text-xs text-slate-500">{[p.data.folderNo, p.data.phone, p.data.dob && String(p.data.dob).slice(0, 10)].filter(Boolean).join(' · ')}</span></td>
                    <td data-label="Status">
                      {p.problems.map((x) => <Badge key={x} color="red" className="mb-1 mr-1">{x}</Badge>)}
                      {p.duplicateOf && <Badge color="amber">Already here: {p.duplicateOf}</Badge>}
                      {!p.problems.length && !p.duplicateOf && <Badge color="green">Ready</Badge>}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Card>
        )}
        <ErrorNote>{error}</ErrorNote>
        <Card title="Past imports" bodyClass="p-0">
          <table className="table">
            <thead><tr><th>File</th><th>When</th><th>Imported</th><th /></tr></thead>
            <tbody>{batches.map((b) => (
              <tr key={b._id}><td data-label="">{b.fileName}</td><td data-label="When">{dateTime(b.createdAt)} · {b.by?.name}</td><td data-label="Imported">{b.imported} of {b.rows}</td>
                <td data-label="">{b.undoneAt ? <Badge>Undone</Badge> : <Button size="sm" variant="ghost" onClick={() => undo(b)}>Undo</Button>}</td></tr>
            ))}{!batches.length && <tr><td data-label="" colSpan={4} className="text-slate-500">None yet.</td></tr>}</tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
