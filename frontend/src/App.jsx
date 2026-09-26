import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import CookieNotice from './components/CookieNotice';
import BetaBanner from './components/BetaBanner';

const AuthPage = lazy(() => import('./pages/Auth'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const LandingPage = lazy(() => import('./pages/Landing'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const LegalPage = lazy(() => import('./pages/Legal'));

function PageFallback() {
  return <div className="flex min-h-screen items-center justify-center bg-[#101820] text-sm text-slate-300">Loading SyncBoard...</div>;
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#101820]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" /></div>;

  return (
    <Router>
      <BetaBanner />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<AuthPage session={session} />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/privacy" element={<LegalPage policy="privacy" />} />
          <Route path="/terms" element={<LegalPage policy="terms" />} />
          <Route path="/cookies" element={<LegalPage policy="cookies" />} />
          <Route path="/refunds" element={<LegalPage policy="refunds" />} />
          <Route path="/dashboard" element={session ? <DashboardPage session={session} /> : <Navigate to="/login" replace />} />
          <Route path="/settings" element={session ? <SettingsPage session={session} /> : <Navigate to="/login" replace />} />
          <Route path="/" element={<LandingPage session={session} />} />
        </Routes>
        <CookieNotice />
      </Suspense>
    </Router>
  );
}

export default App;
