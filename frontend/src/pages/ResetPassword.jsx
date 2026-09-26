import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import BrandMark from '../components/BrandMark';
import LegalFooter from '../components/LegalFooter';
import ThemeToggle from '../components/ThemeToggle';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) setReady(Boolean(data.session)); });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => { if (active) setReady(Boolean(nextSession)); });
    return () => { active = false; authListener.subscription.unsubscribe(); };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    setSuccess(true);
    await supabase.auth.signOut();
  };

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link className="marketing-brand" to="/"><BrandMark /><span>SyncBoard</span></Link>
        <ThemeToggle />
      </header>
      <main className="auth-main">
        <section className="auth-card" aria-labelledby="reset-title">
          <p className="marketing-eyebrow">Account security</p>
          <h1 id="reset-title">Set a new password</h1>
          {success ? <div className="auth-signed-in"><CheckCircle2 className="success-icon" aria-hidden="true" size={38} /><p>Your password has been updated. You can now sign in securely.</p><button className="auth-primary-button" type="button" onClick={() => navigate('/login', { replace: true })}>Return to sign in</button></div> : !ready ? <div className="auth-signed-in"><p>This reset link is invalid or has expired. Request a new one from the sign-in page.</p><button className="auth-secondary-button" type="button" onClick={() => navigate('/login', { replace: true })}>Return to sign in</button></div> : <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="new-password">New password<input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="6" required /></label>
            <label htmlFor="confirm-password">Confirm new password<input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength="6" required /></label>
            {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
            <button className="auth-primary-button" type="submit" disabled={loading}>{loading ? 'Updating password...' : 'Update password'} {!loading ? <ArrowRight aria-hidden="true" size={18} /> : null}</button>
          </form>}
        </section>
      </main>
      <LegalFooter />
    </div>
  );
}
