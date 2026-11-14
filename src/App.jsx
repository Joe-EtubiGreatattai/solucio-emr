import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Logo from './components/Logo.jsx';
import Login from './pages/Login.jsx';
import { ROLE_HOME } from './lib/roles.js';
import { routes } from './routes.jsx';

export default function App() {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Logo className="h-12 w-12 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  if (!role) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-100 p-6 text-center">
        <Logo className="h-12 w-12" />
        <p className="font-semibold">You don’t have an EMR role yet.</p>
        <p className="text-sm text-slate-500">Ask an HR admin to give you one in Solucio HR → Staff.</p>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        {routes.map((r) => <Route key={r.path} path={r.path} element={r.element} />)}
        <Route path="*" element={<Navigate to={ROLE_HOME[role] || '/'} replace />} />
      </Routes>
    </Layout>
  );
}
