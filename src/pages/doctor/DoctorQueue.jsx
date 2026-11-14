import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import useFetch from '../../lib/useFetch';
import { Card, PageHeader } from '../../components/ui';
import QueueList from '../../components/QueueList';

const KEY = 'emr_clinic';
const read = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };

export default function DoctorQueue() {
  const { data: clinics } = useFetch('/clinics', { initial: [] });
  const [clinic, setClinic] = useState(read);
  const navigate = useNavigate();
  const choose = (v) => { setClinic(v); try { localStorage.setItem(KEY, v); } catch { /* ignore */ } };
  const open = (e) => {
    if (e.status === 'waiting') api(`/queues/${e._id}/start`, { method: 'POST' }).catch(() => {});
    navigate(`/doctor/visit/${e.visit._id}`);
  };
  return (
    <div>
      <PageHeader title="My queue" subtitle="Patients sent to your clinic, urgent first."
        actions={
          <select className="input !w-auto" aria-label="Clinic" value={clinic} onChange={(e) => choose(e.target.value)}>
            <option value="">All clinics</option>
            {clinics.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        } />
      <Card bodyClass="p-0"><QueueList station="doctor" clinic={clinic} onOpen={open} emptyText="Nobody waiting for you." /></Card>
    </div>
  );
}
