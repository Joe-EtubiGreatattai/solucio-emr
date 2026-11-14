import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Mail, MessageCircle, Phone, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api.js';
import { Badge, Button, Card, ErrorNote, Field, PageHeader, Spinner } from '../../components/ui';

const TABS = [['new', 'New'], ['contacted', 'Contacted'], ['confirmed', 'Confirmed'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['', 'All']];
const STATUS = {
  new: ['New', 'amber'], contacted: ['Contacted', 'blue'], confirmed: ['Confirmed', 'green'],
  completed: ['Completed', 'teal'], cancelled: ['Cancelled', 'slate'],
};
const SLOT = { morning: 'Morning (8:00 AM – 12:00 PM)', afternoon: 'Afternoon (12:00 PM – 4:00 PM)', evening: 'Evening (4:00 PM – 8:00 PM)' };
const ACTION = { requested: 'Requested online', contacted: 'Contacted', confirm: 'Confirmed', complete: 'Completed', cancel: 'Cancelled', note: 'Note' };
const dateLabel = (value) => value ? new Date(`${value}T12:00:00Z`).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }) : '—';
const timeLabel = (value) => value ? new Date(value).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }) : '';

export default function OnlineAppointments() {
  const [tab, setTab] = useState('new');
  const [query, setQuery] = useState('');
  const [data, setData] = useState({ items: [], counts: {} });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('morning');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await api(`/online-bookings?status=${encodeURIComponent(tab)}&q=${encodeURIComponent(query)}`);
      setData(next);
      setSelected((old) => old ? next.items.find((b) => b.ref === old.ref) || null : null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [tab, query]);

  useEffect(() => {
    const timer = setTimeout(load, query ? 250 : 0);
    const refresh = setInterval(load, 60_000);
    return () => { clearTimeout(timer); clearInterval(refresh); };
  }, [load]);

  function openMode(value) {
    setMode(value); setError(''); setText('');
    setDate(selected?.confirmed?.date || selected?.date || '');
    setSlot(selected?.confirmed?.timeSlot || selected?.timeSlot || 'morning');
  }

  async function act(body) {
    if (!selected) return;
    setBusy(true); setError('');
    try {
      await api(`/online-bookings/${encodeURIComponent(selected.ref)}`, { method: 'PATCH', body });
      toast.success(body.action === 'confirm' ? 'Appointment confirmed; patient notified' : 'Appointment updated');
      setMode(''); setText(''); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const total = Object.values(data.counts).reduce((sum, count) => sum + count, 0);
  return (
    <div>
      <PageHeader title="Online appointments" subtitle="Website requests appear here for reception to contact, confirm, and manage." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map(([value, label]) => (
          <Button key={value} size="sm" variant={tab === value ? 'primary' : 'secondary'} onClick={() => { setTab(value); setSelected(null); }}>
            {label} <span className="ml-1 opacity-70">{value ? data.counts[value] || 0 : total}</span>
          </Button>
        ))}
        <label className="relative ml-auto w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, reference" className="input !py-2 pl-9" aria-label="Search appointments" />
        </label>
      </div>
      <div className={selected ? 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] xl:items-start' : ''}>
      <Card bodyClass="p-0">
        {loading ? <Spinner /> : !data.items.length ? <div className="p-12 text-center text-sm text-slate-500">{query ? 'No requests match your search.' : tab === 'new' ? 'No new requests. New website bookings appear here automatically.' : 'No requests in this list.'}</div> : (
          <div className="divide-y divide-slate-100">
            {data.items.map((booking) => (
              <button key={booking.ref} type="button" onClick={() => { setSelected(booking); setMode(''); setError(''); }} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-slate-50 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center sm:px-5 ${selected?.ref === booking.ref ? 'bg-brand-50/60' : ''}`}>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-900">{booking.fullName}</span>
                  <span className="block text-xs text-slate-500">{booking.ref} · {booking.phone}</span>
                </span>
                <span className="text-sm text-slate-700">{booking.department}<span className="block text-xs text-slate-500">{booking.specialist || 'Any specialist'}</span></span>
                <span className="text-sm text-slate-700">{dateLabel(booking.date)}<span className="block text-xs text-slate-500">{SLOT[booking.timeSlot] || booking.timeSlot}</span></span>
                <Badge color={STATUS[booking.status]?.[1] || 'slate'}>{STATUS[booking.status]?.[0] || booking.status}</Badge>
              </button>
            ))}
          </div>
        )}
      </Card>
      {selected && (
        <section className="card p-4 sm:p-5 xl:sticky xl:top-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div><h2 className="text-xl font-semibold text-slate-900">{selected.fullName}</h2><p className="text-sm text-slate-500">Requested {timeLabel(selected.createdAt)}</p></div>
            <Button size="sm" variant="ghost" onClick={() => { setSelected(null); setMode(''); }}>Close</Button>
          </div>
          <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2"><Badge color={STATUS[selected.status]?.[1] || 'slate'}>{STATUS[selected.status]?.[0] || selected.status}</Badge><span className="text-xs text-slate-500">{selected.ref}</span></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card title="Requested visit" bodyClass="space-y-2 p-4 text-sm">
              <p><b>Department:</b> {selected.department}</p><p><b>Specialist:</b> {selected.specialist || 'No preference'}</p>
              <p><b>Date:</b> {dateLabel(selected.date)}</p><p><b>Time:</b> {SLOT[selected.timeSlot] || selected.timeSlot}</p>
              {selected.confirmed && <p><b>Confirmed:</b> {dateLabel(selected.confirmed.date)} · {SLOT[selected.confirmed.timeSlot] || selected.confirmed.timeSlot}</p>}
              <p><b>Reason:</b> {selected.reason}</p>
            </Card>
            <Card title="Contact patient" bodyClass="space-y-3 p-4 text-sm">
              <p>{selected.phone}</p><p className="break-all">{selected.email}</p>
              <div className="flex flex-wrap gap-2">
                <a className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 py-2 font-semibold text-white" href={`tel:${selected.phone}`}><Phone className="h-4 w-4" /> Call</a>
                <a className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold" href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
                <a className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold" href={`mailto:${selected.email}`}><Mail className="h-4 w-4" /> Email</a>
              </div>
              {selected.cancelReason && <p><b>Cancellation:</b> {selected.cancelReason}</p>}
            </Card>
          </div>
          {selected.history?.length > 0 && <Card title="Request history" bodyClass="p-4"><ol className="space-y-2 text-sm">{selected.history.map((item, i) => <li key={`${item.at}-${i}`}><b>{ACTION[item.action] || item.action}</b> · {timeLabel(item.at)} · {item.by}{item.note ? ` — ${item.note}` : ''}</li>)}</ol></Card>}
          {selected.notes && <p className="text-sm text-slate-600"><b>Notes:</b> {selected.notes}</p>}
          {!mode && <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {selected.status === 'new' && <Button variant="secondary" onClick={() => act({ action: 'contacted' })}>Mark contacted</Button>}
            {!['completed', 'cancelled'].includes(selected.status) && <>
              <Button icon={CalendarDays} onClick={() => openMode('confirm')}>{selected.status === 'confirmed' ? 'Change appointment' : 'Confirm appointment'}</Button>
              {selected.status === 'confirmed' && <Button variant="secondary" onClick={() => act({ action: 'complete' })}>Patient arrived</Button>}
              <Button variant="danger-soft" onClick={() => openMode('cancel')}>Cancel request</Button>
            </>}
            <Button variant="ghost" onClick={() => openMode('note')}>Add note</Button>
          </div>}
          {mode === 'confirm' && <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
            <h3 className="font-semibold">Confirm appointment</h3>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Date"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field label="Time"><select className="input" value={slot} onChange={(e) => setSlot(e.target.value)}>{Object.entries(SLOT).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div>
            <Field label="Note (optional)"><input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. with Dr Eze" /></Field>
            <div className="flex gap-2"><Button loading={busy} onClick={() => act({ action: 'confirm', date, timeSlot: slot, note: text })}>Confirm and email patient</Button><Button variant="secondary" onClick={() => setMode('')}>Back</Button></div>
          </div>}
          {mode === 'cancel' && <div className="space-y-3 rounded-2xl bg-slate-50 p-4"><h3 className="font-semibold">Cancel request</h3><Field label="Reason"><input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Why is it being cancelled?" /></Field><div className="flex gap-2"><Button variant="danger" loading={busy} disabled={!text.trim()} onClick={() => act({ action: 'cancel', reason: text })}>Cancel and email patient</Button><Button variant="secondary" onClick={() => setMode('')}>Back</Button></div></div>}
          {mode === 'note' && <div className="space-y-3 rounded-2xl bg-slate-50 p-4"><h3 className="font-semibold">Add a note</h3><Field label="Note"><textarea className="input min-h-24" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. No answer, will call again" /></Field><div className="flex gap-2"><Button loading={busy} disabled={!text.trim()} onClick={() => act({ action: 'note', note: text })}>Save note</Button><Button variant="secondary" onClick={() => setMode('')}>Back</Button></div></div>}
          <ErrorNote>{error}</ErrorNote>
          </div>
        </section>
      )}
      </div>
      {!selected && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
    </div>
  );
}
