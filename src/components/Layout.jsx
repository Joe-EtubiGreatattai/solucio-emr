import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useExit } from '../lib/motion';
import { ROLE_HOME, ROLE_LABEL, ROLE_NAV } from '../lib/roles.js';
import { Avatar } from './ui';
import Logo from './Logo';
import RoleSwitcher from './RoleSwitcher';

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-[15px] transition ${isActive ? 'bg-white font-semibold text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'}`}>
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 top-1/2 h-8 w-1.5 -translate-y-1/2 animate-[grow-y_0.3s_ease-out_both] rounded-r-full bg-brand-700" />}
          <Icon className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-brand-700' : ''}`} />
          <span className="flex-1">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function Sidebar({ onLogout, orgName, role }) {
  return (
    <div className="flex h-full flex-col rounded-3xl bg-slate-100/80 px-3 py-6">
      <Link to={ROLE_HOME[role] || '/'} className="mb-8 flex items-center gap-2.5 px-4">
        <Logo className="h-10 w-10" />
        <span className="leading-tight">
          <span className="block text-lg font-semibold tracking-tight">Solucio EMR</span>
          <span className="block text-xs text-slate-500">{orgName || 'Solucio Hospital'}</span>
        </span>
      </Link>
      <nav aria-label="Main" className="flex-1 space-y-0.5">
        {(ROLE_NAV[role] || []).map((n) => <NavItem key={n.to} {...n} />)}
      </nav>
      <div className="space-y-0.5 border-t border-slate-200 pt-4">
        <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[15px] text-slate-500 transition hover:bg-white/70 hover:text-slate-800">
          <LogOut className="h-5 w-5" /> Sign out
        </button>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const { user, company, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  useEffect(() => setDrawer(false), [location.pathname]);
  const drawerAnim = useExit(drawer, 200);
  const logout = () => { signOut(); navigate('/'); };

  return (
    <div className="min-h-screen bg-white sm:bg-slate-200/60 sm:p-4 print:bg-white print:p-0">
      <div className="flex min-h-screen gap-4 bg-white p-2 sm:min-h-[calc(100vh-2rem)] sm:rounded-[2rem] sm:p-4 print:p-0">
        <aside className="sticky top-4 hidden h-[calc(100vh-4rem)] w-64 shrink-0 lg:block print:!hidden"><Sidebar onLogout={logout} orgName={company?.name} role={role} /></aside>
        {drawerAnim.mounted && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className={`absolute inset-0 bg-slate-900/50 ${drawerAnim.closing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={() => setDrawer(false)} />
            <aside className={`relative h-full w-72 bg-white p-3 ${drawerAnim.closing ? 'animate-slide-out-left' : 'animate-slide-in-left'}`}><Sidebar onLogout={logout} orgName={company?.name} role={role} /></aside>
            <button type="button" aria-label="Close menu" className="absolute left-[18.5rem] top-4 text-white" onClick={() => setDrawer(false)}><X /></button>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-4">
          <header className="flex items-center gap-3 rounded-3xl bg-slate-100/80 px-3 py-3 sm:px-5 print:hidden">
            <button type="button" aria-label="Open menu" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white lg:hidden" onClick={() => setDrawer(true)}><Menu className="h-5 w-5" /></button>
            <RoleSwitcher />
            <div className="ml-auto flex items-center gap-3 pr-2">
              <Avatar name={user?.name} />
              <span className="hidden text-left leading-tight md:block">
                <span className="block text-sm font-semibold">{user?.name}</span>
                <span className="block text-xs text-slate-500">{ROLE_LABEL[role]}</span>
              </span>
            </div>
          </header>
          <main className="flex-1 rounded-3xl bg-slate-100/80 px-3 py-5 sm:p-6 lg:p-8 print:bg-white print:p-0">
            <div key={location.pathname} className="animate-fade-up print:animate-none">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
