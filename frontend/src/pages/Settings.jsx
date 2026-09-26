import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell, Check, KeyRound, Monitor, Moon, Save, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { apiOrThrow } from '../lib/api';
import { useTheme } from '../lib/useTheme';
import { useToast } from '../hooks/useToast';

const tabs = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'appearance', label: 'Appearance', icon: Monitor },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Account & security', icon: ShieldCheck },
];

const defaultNotifications = {
  assignments: true,
  deadlines: true,
  mentions: true,
  activity: false,
  emailEnabled: true,
};

function initials(name) {
  return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function SettingRow({ label, description, children }) {
  return (
    <div className="settings-row">
      <div>
        <p className="settings-row__label">{label}</p>
        <p className="settings-row__description">{description}</p>
      </div>
      <div className="settings-row__control">{children}</div>
    </div>
  );
}

export default function SettingsPage({ session }) {
  const navigate = useNavigate();
  const { preference, setTheme } = useTheme();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({
    name: session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || '',
    avatar: '',
    email: session?.user?.email || '',
    joinedAt: null,
  });
  const [notifications, setNotifications] = useState(() => {
    return defaultNotifications;
  });
  const [mfaFactors, setMfaFactors] = useState([]);
  const [mfaEnrollment, setMfaEnrollment] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([apiOrThrow('/api/profile'), apiOrThrow('/api/preferences/notifications')])
      .then(([profileData, preferenceData]) => {
        if (!active) return;
        if (profileData) setProfile(profileData);
        if (preferenceData?.preferences) setNotifications({ ...defaultNotifications, ...preferenceData.preferences });
      })
      .catch(() => {
        if (active) showToast({ title: 'Profile unavailable', message: 'You can still update appearance preferences locally.', variant: 'error' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  const loadMfaFactors = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    setMfaFactors(data?.totp || []);
  }, []);

  useEffect(() => {
    loadMfaFactors().catch(() => {
      showToast({ title: 'MFA status unavailable', message: 'Try again after refreshing the page.', variant: 'error' });
    });
  }, [loadMfaFactors, showToast]);

  const displayInitials = useMemo(() => initials(profile.name || 'SyncBoard'), [profile.name]);

  const updateNotification = async (key) => {
    const previous = notifications;
    const next = { ...previous, [key]: !previous[key] };
    setNotifications(next);
    try {
      await apiOrThrow('/api/preferences/notifications', 'PATCH', { preferences: next });
    } catch (error) {
      setNotifications(previous);
      showToast({ title: 'Could not save notification preference', message: error.message, variant: 'error' });
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await apiOrThrow('/api/profile', 'PATCH', { name: profile.name, avatar: profile.avatar });
      setProfile(updated);
      showToast({ title: 'Profile saved', message: 'Your profile details are up to date.', variant: 'success' });
    } catch (error) {
      showToast({ title: 'Could not save profile', message: error.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const requestPasswordReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      showToast({ title: 'Could not send reset email', message: error.message, variant: 'error' });
      return;
    }
    showToast({ title: 'Reset email sent', message: 'Check your inbox for the secure password reset link.', variant: 'success' });
  };

  const enrollMfa = async () => {
    setMfaLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'SyncBoard authenticator' });
      if (error) throw error;
      setMfaEnrollment(data);
      setMfaCode('');
    } catch (error) {
      showToast({ title: 'Could not start MFA setup', message: error.message, variant: 'error' });
    } finally {
      setMfaLoading(false);
    }
  };

  const verifyMfaEnrollment = async (event) => {
    event.preventDefault();
    setMfaLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaEnrollment.id });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: mfaEnrollment.id, challengeId: challenge.id, code: mfaCode });
      if (verifyError) throw verifyError;
      await loadMfaFactors();
      setMfaEnrollment(null);
      setMfaCode('');
      showToast({ title: 'MFA enabled', message: 'Your authenticator app is now required after password sign-in.', variant: 'success' });
    } catch (error) {
      showToast({ title: 'Could not verify MFA', message: error.message, variant: 'error' });
    } finally {
      setMfaLoading(false);
    }
  };

  const disableMfa = async (factorId) => {
    if (!window.confirm('Disable authenticator verification for this account?')) return;
    setMfaLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      await loadMfaFactors();
      showToast({ title: 'MFA disabled', message: 'Password sign-in will no longer ask for an authenticator code.', variant: 'success' });
    } catch (error) {
      showToast({ title: 'Could not disable MFA', message: error.message, variant: 'error' });
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <button type="button" className="settings-back" onClick={() => navigate('/dashboard')}>
          <ArrowLeft />
          Back to workspace
        </button>
        <div>
          <p className="settings-eyebrow">Account</p>
          <h1>Settings</h1>
          <p>Keep your workspace comfortable and your profile useful to teammates.</p>
        </div>
      </header>

      <div className="settings-layout">
        <aside className="settings-tabs" aria-label="Settings sections">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'settings-tab settings-tab--active' : 'settings-tab'}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon />
                {tab.label}
              </button>
            );
          })}
        </aside>

        <main className="settings-card">
          {activeTab === 'profile' ? (
            <section>
              <div className="settings-section-heading">
                <div>
                  <p className="settings-eyebrow">Your identity</p>
                  <h2>Profile</h2>
                  <p>Teammates see your name and initials when you own project work.</p>
                </div>
              </div>
              <form className="settings-form" onSubmit={saveProfile}>
                <div className="settings-profile-preview">
                  <span className="profile-avatar profile-avatar--xl">{displayInitials}</span>
                  <div>
                    <strong>{profile.name || 'Your name'}</strong>
                    <span>{profile.email}</span>
                  </div>
                </div>
                <label>
                  Display name
                  <input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} maxLength={80} required />
                </label>
                <label>
                  Avatar initials <span className="settings-label-hint">optional</span>
                  <input value={profile.avatar || ''} onChange={(event) => setProfile((current) => ({ ...current, avatar: event.target.value.toUpperCase().slice(0, 3) }))} maxLength={3} placeholder={displayInitials} />
                </label>
                <label>
                  Email address
                  <input value={profile.email} readOnly disabled />
                </label>
                <div className="settings-form__actions">
                  <button type="submit" className="settings-primary-button" disabled={saving || loading}>
                    <Save />
                    {saving ? 'Saving...' : 'Save profile'}
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {activeTab === 'appearance' ? (
            <section>
              <div className="settings-section-heading">
                <div>
                  <p className="settings-eyebrow">Make it yours</p>
                  <h2>Appearance</h2>
                  <p>Choose the theme that works best for your study space.</p>
                </div>
              </div>
              <div className="theme-options">
                {[
                  { id: 'system', label: 'System', description: 'Follow your device setting', icon: Monitor },
                  { id: 'light', label: 'Light', description: 'Bright and focused', icon: Sun },
                  { id: 'dark', label: 'Dark', description: 'Comfortable at night', icon: Moon },
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <button key={option.id} type="button" className={preference === option.id ? 'theme-option theme-option--active' : 'theme-option'} onClick={() => setTheme(option.id)}>
                      <Icon />
                      <span><strong>{option.label}</strong><small>{option.description}</small></span>
                      {preference === option.id ? <Check className="theme-option__check" /> : null}
                    </button>
                  );
                })}
              </div>
              <div className="settings-note">Your preference is saved on this device. System mode follows your operating system automatically.</div>
            </section>
          ) : null}

          {activeTab === 'notifications' ? (
            <section>
              <div className="settings-section-heading">
                <div>
                  <p className="settings-eyebrow">Stay informed</p>
                  <h2>Notifications</h2>
                  <p>Choose the project updates that deserve your attention.</p>
                </div>
              </div>
              <div className="settings-list">
                {[
                  ['assignments', 'Task assignments', 'Know when someone gives you work.'],
                  ['deadlines', 'Deadline reminders', 'Get a nudge before work is due.'],
                  ['mentions', 'Mentions', 'See when a teammate calls you out.'],
                  ['activity', 'Team activity', 'Follow project changes as they happen.'],
                  ['emailEnabled', 'Email notifications', 'Receive selected updates by email when delivery is configured.'],
                ].map(([key, label, description]) => (
                  <SettingRow key={key} label={label} description={description}>
                    <button type="button" className={notifications[key] ? 'settings-switch settings-switch--on' : 'settings-switch'} onClick={() => updateNotification(key)} aria-pressed={notifications[key]}>
                      <span />
                    </button>
                  </SettingRow>
                ))}
              </div>
              <div className="settings-note">In-app notifications remain available. Email delivery is optional and only active when the beta environment is configured.</div>
            </section>
          ) : null}

          {activeTab === 'security' ? (
            <section>
              <div className="settings-section-heading">
                <div>
                  <p className="settings-eyebrow">Keep access safe</p>
                  <h2>Account & security</h2>
                  <p>Manage the credentials used to access your workspace.</p>
                </div>
              </div>
              <div className="settings-list">
                <SettingRow label="Email address" description="Your sign-in address cannot be changed here.">
                  <span className="settings-value">{profile.email}</span>
                </SettingRow>
                <SettingRow label="Password" description="Send yourself a secure password reset link.">
                  <button type="button" className="settings-secondary-button" onClick={requestPasswordReset}><KeyRound /> Reset password</button>
                </SettingRow>
                <SettingRow label="Authenticator app" description="Add optional TOTP verification after your password. Store your authenticator backup safely.">
                  {mfaFactors.filter((factor) => factor.status === 'verified').length > 0 ? (
                    <button type="button" className="settings-secondary-button" disabled={mfaLoading} onClick={() => disableMfa(mfaFactors.find((factor) => factor.status === 'verified').id)}>Disable MFA</button>
                  ) : (
                    <button type="button" className="settings-secondary-button" disabled={mfaLoading} onClick={enrollMfa}>{mfaLoading ? 'Starting...' : 'Enable MFA'}</button>
                  )}
                </SettingRow>
                <SettingRow label="Account created" description="The date this SyncBoard account was created.">
                  <span className="settings-value">{profile.joinedAt ? new Date(profile.joinedAt).toLocaleDateString() : 'Available after profile load'}</span>
                </SettingRow>
              </div>
              {mfaEnrollment ? (
                <form className="mfa-enrollment" onSubmit={verifyMfaEnrollment}>
                  <h3>Finish authenticator setup</h3>
                  <p>Scan this QR code with your authenticator app, then enter the six-digit code it generates. Save the setup secret in a secure password manager before closing this screen. This beta does not provide SMS fallback.</p>
                  {mfaEnrollment.totp?.qr_code ? <img src={mfaEnrollment.totp.qr_code} alt="Authenticator setup QR code" /> : null}
                  {mfaEnrollment.totp?.secret ? <code>{mfaEnrollment.totp.secret}</code> : null}
                  <label htmlFor="settings-mfa-code">Verification code<input id="settings-mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required /></label>
                  <button type="submit" className="settings-primary-button" disabled={mfaLoading || mfaCode.length !== 6}>{mfaLoading ? 'Verifying...' : 'Verify and enable'}</button>
                </form>
              ) : null}
              <div className="settings-note settings-note--warning">Never share your password or recovery link. SyncBoard will not ask for either in a team message.</div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
