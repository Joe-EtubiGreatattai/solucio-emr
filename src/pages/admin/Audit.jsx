import { useState } from 'react';
import useFetch from '../../lib/useFetch';
import { dateTime } from '../../lib/format';
import { Button, Card, PageHeader, Spinner } from '../../components/ui';

export default function Audit() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const { data, loading } = useFetch(`/audit?page=${page}${action ? `&action=${action}` : ''}`);
  return (
    <div>
      <PageHeader title="Activity log" subtitle="Who did what, including who opened which patient’s chart."
        actions={<select className="input !w-auto" aria-label="Filter" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">Everything</option><option value="patient">Patients</option><option value="visit">Visits</option><option value="payment">Payments</option><option value="bill">Bill changes</option><option value="stock">Stock</option><option value="price">Prices</option><option value="auth">Sign-ins</option>
        </select>} />
      <Card bodyClass="p-0">
        {loading || !data ? <Spinner /> : (
          <>
            <table className="table">
              <thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th></tr></thead>
              <tbody>{data.items.map((a) => (
                <tr key={a._id}><td data-label="When">{dateTime(a.createdAt)}</td><td data-label="Who">{a.user?.name || '—'}</td><td data-label="What">{a.action}</td>
                  <td data-label="Details" className="max-w-md truncate text-xs text-slate-500">{a.metadata && JSON.stringify(a.metadata)}</td></tr>
              ))}</tbody>
            </table>
            <div className="flex items-center justify-between p-3 text-sm text-slate-500">
              <span>Page {data.page} of {data.pages || 1}</span>
              <span className="flex gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</Button><Button size="sm" variant="secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Older</Button></span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
