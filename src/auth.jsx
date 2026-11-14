import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import { disconnectLive } from './lib/live.js';

const AuthContext = createContext(null);
const ROLE_KEY = 'emr_role';
const readRole = () => { try { return localStorage.getItem(ROLE_KEY); } catch { return null; } };
const saveRole = (r) => { try { localStorage.setItem(ROLE_KEY, r); } catch { /* private mode */ } };

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { user, company }
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [activeRole, setActiveRoleState] = useState(readRole);

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me')
      .then(setSession)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const own = session?.user?.roles || [];
  // Admins may work at any station, so they can switch to every role
  const roles = own.includes('admin') ? ['admin', 'reception', 'nurse', 'doctor', 'lab', 'pharmacy', 'cashier', 'billing'] : own;
  // The remembered role only counts if the person still has it
  const role = roles.includes(activeRole) ? activeRole : roles[0];

  const signIn = (data) => {
    setToken(data.token);
    setSession({ user: data.user, company: data.company });
  };
  const signOut = () => {
    disconnectLive();
    setToken(null);
    setSession(null);
  };
  const setActiveRole = (r) => { saveRole(r); setActiveRoleState(r); };
  // Admins may do everything; other people only what their roles allow
  const can = (...rs) => own.includes('admin') || rs.some((r) => own.includes(r));

  return (
    <AuthContext.Provider value={{ ...session, roles, role, setActiveRole, can, loading, signIn, signOut, setSession }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
