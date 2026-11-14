import { useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, Plus, ShieldCheck, Users } from 'lucide-react';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { dateTime } from '../../lib/format';
import { ROLE_LABEL } from '../../lib/roles';
import { Badge, Button, Card, ErrorNote, Field, MetricGrid, Modal, PageHeader, Spinner } from '../../components/ui';

const emptyForm = { name: '', email: '', password: '', confirmPassword: '', roles: [] };
const staffRoles = Object.entries(ROLE_LABEL).filter(([role]) => role !== 'admin');

export default function Staff() {
  const { data = [], loading, reload } = useFetch('/users', { initial: [] });
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const toggleRole = (role) => setForm((current) => ({
    ...current,
    roles: current.roles.includes(role) ? current.roles.filter((value) => value !== role) : [...current.roles, role],
  }));

  async function createAccount(event) {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    if (!form.roles.length) {
      setError('Choose at least one staff role.');
      return;
    }
    setBusy(true);
    try {
      await api('/users', { method: 'POST', body: { name: form.name, email: form.email, password: form.password, roles: form.roles } });
      toast.success('Staff account created');
      setCreateOpen(false);
      setForm(emptyForm);
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const metrics = [
    { label: 'Active accounts', value: loading ? '—' : data.filter((user) => !user.disabled).length, icon: Users, tone: 'brand', hint: 'Can sign in to the EMR' },
    { label: 'HR managed', value: loading ? '—' : data.filter((user) => user.source === 'hr').length, icon: ShieldCheck, tone: 'blue', hint: 'Roles sync from Solucio HR' },
    { label: 'Local accounts', value: loading ? '—' : data.filter((user) => user.source === 'local').length, icon: KeyRound, tone: 'amber', hint: 'Credentials managed in the EMR' },
  ];

  return (
    <div>
      <PageHeader
        title="Staff accounts"
        subtitle="HR-managed staff and local EMR accounts. Create a local account when a staff member needs EMR access before using Solucio HR."
        actions={<Button icon={Plus} onClick={() => { setError(''); setForm(emptyForm); setCreateOpen(true); }}>Create staff account</Button>}
      />
      <MetricGrid items={metrics} />
      <Card title="People with EMR access" subtitle="HR roles sync automatically. Local account access is managed here." bodyClass="p-0">
        {loading ? <Spinner /> : (
          <table className="table">
            <thead><tr><th>Staff member</th><th>Access roles</th><th>Account</th><th>Last signed in</th></tr></thead>
            <tbody>{data.map((user) => (
              <tr key={user._id} className={user.disabled ? 'opacity-60' : ''}>
                <td data-label=""><span className="font-semibold text-slate-900">{user.name}</span><span className="block text-xs text-slate-500">{user.email}{user.jobTitle ? ` · ${user.jobTitle}` : ''}</span></td>
                <td data-label="Access roles">{user.disabled ? <Badge>No access</Badge> : user.roles.map((role) => <Badge key={role} color="teal" className="mb-1 mr-1">{ROLE_LABEL[role] || role}</Badge>)}</td>
                <td data-label="Account">{user.source === 'hr' ? <Badge color="blue">Solucio HR</Badge> : <Badge color="amber">Local EMR</Badge>}</td>
                <td data-label="Last signed in">{dateTime(user.lastLoginAt)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a staff account" size="md" footer={
        <><Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={busy}>Cancel</Button><Button type="submit" form="create-staff-form" loading={busy}>Create account</Button></>
      }>
        <div className="mb-5 rounded-xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-sm leading-6 text-brand-900">
          This creates a local EMR sign-in. The staff member will use this email and password on the EMR sign-in page. Admin access is managed separately.
        </div>
        <form id="create-staff-form" onSubmit={createAccount} className="space-y-4">
          <Field label="Full name"><input className="input" autoComplete="name" required minLength={2} maxLength={120} value={form.name} onChange={set('name')} placeholder="e.g. Ada Okafor" /></Field>
          <Field label="Work email"><input className="input" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={set('email')} placeholder="name@clinic.com" /></Field>
          <fieldset>
            <legend className="label">EMR roles</legend>
            <p className="mb-2 text-xs leading-5 text-slate-500">Select every area this staff member needs to use.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {staffRoles.map(([role, label]) => {
                const checked = form.roles.includes(role);
                return (
                  <label key={role} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${checked ? 'border-brand-300 bg-brand-50 text-brand-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}>
                    <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={checked} onChange={() => toggleRole(role)} />
                    {label}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Temporary password" hint="At least 10 characters, with letters and a number."><input className="input" type="password" autoComplete="new-password" required minLength={10} value={form.password} onChange={set('password')} /></Field>
            <Field label="Confirm password"><input className="input" type="password" autoComplete="new-password" required minLength={10} value={form.confirmPassword} onChange={set('confirmPassword')} /></Field>
          </div>
          <ErrorNote>{error}</ErrorNote>
        </form>
      </Modal>
    </div>
  );
}
