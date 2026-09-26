import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Link2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import LegalFooter from '../components/LegalFooter';
import ThemeToggle from '../components/ThemeToggle';
import { apiOrThrow } from '../lib/api';
import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function InvitePage({ session }) {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    fetch(`${API_BASE_URL}/api/invites/${encodeURIComponent(code)}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || 'This invite link is no longer available.');
        if (active) setInvite(data);
      })
    .catch((requestError) => {
        if (active) setError(requestError.name === 'AbortError' ? 'This invite check timed out. Please try again.' : requestError.message);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (active) setLoading(false);
      });
    return () => { active = false; controller.abort(); window.clearTimeout(timeoutId); };
  }, [code, retryToken]);

  const joinWorkspace = async () => {
    setJoining(true);
    setError('');
    try {
      const result = await apiOrThrow('/api/teams/join', 'POST', { code });
      if (result?.status === 'pending') {
        setPending(true);
        return;
      }
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to join this workspace.');
    } finally {
      setJoining(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate(`/login?join=${encodeURIComponent(code)}`, { replace: true });
  };

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link className="marketing-brand" to="/"><BrandMark /><span>SyncBoard</span></Link>
        <ThemeToggle />
      </header>
      <main className="auth-main">
        <section className="auth-card invite-page-card" aria-labelledby="invite-title">
          <div className="invite-page-icon"><Link2 aria-hidden="true" size={22} /></div>
          <p className="marketing-eyebrow">Workspace invitation</p>
          <h1 id="invite-title">Join a project workspace</h1>
          {loading ? <p className="auth-intro">Checking this invite link...</p> : null}
          {!loading && invite ? (
            <>
              <p className="auth-intro"><strong>{invite.name}</strong> invited you to request access to their shared project work. The workspace leader approves new members.</p>
              {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
              {session ? (
                <div className="invite-page-actions">
                  {pending ? <p className="form-message form-message--success" role="status">Your request was sent. The workspace leader must approve it before you can access the team.</p> : <button className="auth-primary-button" type="button" onClick={joinWorkspace} disabled={joining}>
                    {joining ? 'Sending request...' : 'Request to join'} <ArrowRight aria-hidden="true" size={18} />
                  </button>}
                  <button className="auth-secondary-button" type="button" onClick={signOut}>Use another account</button>
                </div>
              ) : (
                <div className="invite-page-actions">
                  <Link className="auth-primary-button" to={`/login?join=${encodeURIComponent(code)}`}>Sign in to join <ArrowRight aria-hidden="true" size={18} /></Link>
                  <p className="invite-page-note"><CheckCircle2 aria-hidden="true" size={16} /> New to SyncBoard? Sign in, then choose “Create an account”.</p>
                </div>
              )}
            </>
          ) : null}
          {!loading && !invite ? (
            <div className="invite-page-actions">
              <p className="form-message form-message--error" role="alert">{error || 'This invite link is invalid or has been revoked.'}</p>
              <button className="auth-secondary-button" type="button" onClick={() => { setError(''); setInvite(null); setLoading(true); setRetryToken((value) => value + 1); }}>Try again</button>
            </div>
          ) : null}
        </section>
      </main>
      <LegalFooter />
    </div>
  );
}
