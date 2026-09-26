import { useMemo, useState } from 'react';
import { Ban, Check, Copy, Link2, Mail, MessageCircle, RefreshCw, Share2, Smartphone, X } from 'lucide-react';
import { apiOrThrow } from '../../lib/api';
import { buildInviteLink, buildShareTargets } from '../../lib/invite';
import { useToast } from '../../hooks/useToast';

export default function InviteSharePanel({ team, onTeamChange, onClose, canManage = false }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const inviteLink = useMemo(() => buildInviteLink(team.inviteCode), [team.inviteCode]);
  const targets = useMemo(() => buildShareTargets(team.name, inviteLink), [team.name, inviteLink]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      showToast({ title: 'Invite link copied', message: 'Share it with your project team.', variant: 'success' });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast({ title: 'Could not copy invite link', message: 'Select the link and copy it manually.', variant: 'error' });
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: `Join ${team.name} on SyncBoard`, text: `Join ${team.name} on SyncBoard`, url: inviteLink });
    } catch (error) {
      if (error.name !== 'AbortError') showToast({ title: 'Sharing unavailable', message: 'Use one of the available share options.', variant: 'error' });
    }
  };

  const updateInvite = async (path, successTitle) => {
    setBusy(true);
    try {
      const updated = await apiOrThrow(`/api/teams/${team.id}/invite/${path}`, 'POST');
      onTeamChange(updated);
      showToast({ title: successTitle, message: path === 'revoke' ? 'Create a new link whenever you are ready.' : 'The previous link no longer works.', variant: 'success' });
    } catch (error) {
      showToast({ title: 'Invite update failed', message: error.message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="invite-share-panel" aria-label="Share workspace invite">
      <div className="invite-share-panel__header">
        <div><strong>Invite to {team.name}</strong><span>Anyone with this link can request access. You approve each request.</span></div>
        <button type="button" onClick={onClose} aria-label="Close invite sharing"><X size={17} /></button>
      </div>
      {team.inviteEnabled === false ? (
        <div className="invite-share-panel__revoked">
          <p>This invite link is revoked.</p>
          {canManage ? <button type="button" disabled={busy} onClick={() => updateInvite('regenerate', 'New invite link created')}><RefreshCw size={15} /> Create new link</button> : <span>Ask the workspace owner for a new link.</span>}
        </div>
      ) : (
        <>
          <div className="invite-share-panel__link"><Link2 size={15} /><span>{inviteLink}</span><button type="button" onClick={copyLink} aria-label="Copy invite link">{copied ? <Check size={16} /> : <Copy size={16} />}</button></div>
          <div className="invite-share-panel__actions">
            <button type="button" onClick={copyLink}><Copy size={15} /> {copied ? 'Copied' : 'Copy'}</button>
            {navigator.share ? <button type="button" onClick={nativeShare}><Share2 size={15} /> Share</button> : null}
            <a href={targets.whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>
            <a href={targets.email}><Mail size={15} /> Email</a>
            <a href={targets.sms}><Smartphone size={15} /> Message</a>
          </div>
          {canManage ? (
            <div className="invite-share-panel__management">
              <button type="button" disabled={busy} onClick={() => updateInvite('regenerate', 'Invite link regenerated')}><RefreshCw size={14} /> Regenerate</button>
              <button type="button" disabled={busy} onClick={() => updateInvite('revoke', 'Invite link revoked')}><Ban size={14} /> Revoke</button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
