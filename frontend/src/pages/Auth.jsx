import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LayoutDashboard, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiOrThrow } from '../lib/api';
import BrandMark from '../components/BrandMark';
import LegalFooter from '../components/LegalFooter';
import ThemeToggle from '../components/ThemeToggle';

export default function AuthPage({ session: propSession }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(propSession || null);
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  useEffect(() => {
    if (!session) return;
    const inviteCode = new URLSearchParams(location.search).get('join');
    navigate(inviteCode ? `/join/${encodeURIComponent(inviteCode)}` : '/dashboard', { replace: true });
  }, [location.search, navigate, session]);

  const resetMessages = () => {
    setError(null);
    setMessage(null);
  };

  const switchMode = (nextLogin, nextForgotPassword = false) => {
    setIsLogin(nextLogin);
    setIsForgotPassword(nextForgotPassword);
    resetMessages();
  };

  const getPostAuthPath = () => {
    const inviteCode = new URLSearchParams(location.search).get('join');
    return inviteCode ? `/join/${encodeURIComponent(inviteCode)}` : '/dashboard';
  };

  const startMfaChallenge = async () => {
    const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) throw assuranceError;
    if (assurance?.nextLevel !== 'aal2' || assurance.currentLevel === 'aal2') return false;

    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) throw factorsError;
    const factor = factors?.totp?.find((item) => item.status === 'verified');
    if (!factor) return false;

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (challengeError) throw challengeError;
    setMfaChallenge({ factorId: factor.id, challengeId: challenge.id });
    return true;
  };

  const verifyMfa = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaChallenge.factorId,
        challengeId: mfaChallenge.challengeId,
        code: mfaCode.trim(),
      });
      if (verifyError) throw verifyError;
      navigate(getPostAuthPath(), { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'That verification code was not accepted.');
    } finally {
      setLoading(false);
    }
  };

  const cancelMfa = async () => {
    await supabase.auth.signOut();
    setMfaChallenge(null);
    setMfaCode('');
    setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    resetMessages();

    if (!isLogin && !isForgotPassword && !acceptedPolicies) {
      setError('Please accept the Terms and acknowledge the Privacy Policy to continue.');
      return;
    }

    setLoading(true);
    try {
      if (isForgotPassword) {
        const data = await apiOrThrow('/api/auth/forgot-password', 'POST', { email });
        setMessage(data.message || 'Check your inbox for a password reset link.');
        return;
      }

      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (!(await startMfaChallenge())) navigate(getPostAuthPath(), { replace: true });
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, acceptedPolicies }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed.');

      if (!data.token) {
        switchMode(true);
        setMessage(data.message || 'Account created. Check your email before signing in.');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (!(await startMfaChallenge())) navigate(getPostAuthPath(), { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setLoading(false);
  };

  const formTitle = mfaChallenge ? 'Verify your sign-in' : isForgotPassword ? 'Reset your password' : isLogin ? 'Sign in to SyncBoard' : 'Create your workspace account';
  const formDescription = mfaChallenge ? 'Enter the six-digit code from your authenticator app to continue.' : isForgotPassword ? 'We will email a reset link if an account exists for this address.' : isLogin ? 'Sign in to view your team tasks and shared project work.' : 'Create an account for your college project workspace.';

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link className="marketing-brand" to="/"><BrandMark /><span>SyncBoard</span></Link>
        <ThemeToggle />
      </header>
      <main className="auth-main">
        <section className="auth-card" aria-labelledby="auth-title">
          <p className="marketing-eyebrow">College project workspace</p>
          <h1 id="auth-title">{formTitle}</h1>
          <p className="auth-intro">{formDescription}</p>

          {mfaChallenge ? (
            <form className="auth-form" onSubmit={verifyMfa}>
              <label htmlFor="mfa-code">Authenticator code<input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required /></label>
              {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
              <button className="auth-primary-button" type="submit" disabled={loading || mfaCode.length !== 6}>{loading ? 'Checking code...' : 'Verify and continue'} <ArrowRight aria-hidden="true" size={18} /></button>
              <button className="auth-text-button" type="button" onClick={cancelMfa}>Use another sign-in method</button>
            </form>
          ) : session ? (
            <div className="auth-signed-in">
              <p>You are signed in as <strong>{session.user.email}</strong>.</p>
              {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
              <button className="auth-primary-button" type="button" onClick={() => navigate('/dashboard', { replace: true })}><LayoutDashboard aria-hidden="true" size={18} /> Open workspace</button>
              <button className="auth-secondary-button" type="button" disabled={loading} onClick={handleLogout}><LogOut aria-hidden="true" size={18} /> {loading ? 'Signing out...' : 'Sign out'}</button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {!isLogin && !isForgotPassword ? <label htmlFor="name">Full name<input id="name" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></label> : null}
              <label htmlFor="email">Email address<input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              {!isForgotPassword ? <label htmlFor="password">Password<input id="password" type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength="6" required /></label> : null}
              {!isLogin && !isForgotPassword ? <label className="consent-field" htmlFor="legal-consent"><input id="legal-consent" type="checkbox" checked={acceptedPolicies} onChange={(event) => setAcceptedPolicies(event.target.checked)} required /><span>I agree to the <Link to="/terms">Terms and Conditions</Link> and acknowledge the <Link to="/privacy">Privacy Policy</Link>.</span></label> : null}
              {isLogin && !isForgotPassword ? <button className="auth-text-button" type="button" onClick={() => switchMode(true, true)}>Forgot password?</button> : null}
              {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
              {message ? <p className="form-message form-message--success" role="status">{message}</p> : null}
              <button className="auth-primary-button" type="submit" disabled={loading}>{loading ? 'Please wait...' : isForgotPassword ? 'Send reset link' : isLogin ? 'Sign in' : 'Create account'} {!loading ? <ArrowRight aria-hidden="true" size={18} /> : null}</button>
            </form>
          )}

          {!session ? <div className="auth-switch">{isForgotPassword ? <><span>Remembered your password?</span><button type="button" onClick={() => switchMode(true)}>Sign in</button></> : isLogin ? <><span>New to SyncBoard?</span><button type="button" onClick={() => switchMode(false)}>Create an account</button></> : <><span>Already have an account?</span><button type="button" onClick={() => switchMode(true)}>Sign in</button></>}</div> : null}
        </section>
      </main>
      <LegalFooter />
    </div>
  );
}
