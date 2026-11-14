import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { ROLE_HOME, ROLE_LABEL } from '../lib/roles.js';

// For people with more than one job (e.g. a nurse who also covers reception)
export default function RoleSwitcher() {
  const { roles, role, setActiveRole } = useAuth();
  const navigate = useNavigate();
  if (roles.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-slate-500 sm:inline">Working as</span>
      <select className="input !w-auto !rounded-full !py-1.5 font-semibold" value={role} aria-label="Working as"
        onChange={(e) => { setActiveRole(e.target.value); navigate(ROLE_HOME[e.target.value]); }}>
        {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
      </select>
    </label>
  );
}
