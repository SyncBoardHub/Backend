import { useCallback, useEffect, useState } from 'react';
import { Check, Trash2, UserMinus, X } from 'lucide-react';
import { apiOrThrow } from '../../lib/api';
import { useToast } from '../../hooks/useToast';

export default function TeamManagementPanel({ team, onChanged, onDeleted, onClose }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const { showToast } = useToast();

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiOrThrow(`/api/teams/${team.id}/join-requests`);
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast({ title: 'Could not load join requests', message: error.message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showToast, team.id]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const reviewRequest = async (requestId, decision) => {
    setBusyId(requestId);
    try {
      await apiOrThrow(`/api/teams/${team.id}/join-requests/${requestId}/${decision}`, 'POST');
      setRequests((current) => current.filter((request) => request.id !== requestId));
      await onChanged();
      showToast({ title: decision === 'approve' ? 'Member approved' : 'Request declined', message: decision === 'approve' ? 'The user can now access this workspace.' : 'The request was declined.', variant: 'success' });
    } catch (error) {
      showToast({ title: 'Could not review request', message: error.message, variant: 'error' });
    } finally {
      setBusyId('');
    }
  };

  const removeMember = async (userId, name) => {
    if (!window.confirm(`Remove ${name || 'this member'} from ${team.name}?`)) return;
    setBusyId(userId);
    try {
      await apiOrThrow(`/api/teams/${team.id}/members/${userId}`, 'DELETE');
      await onChanged();
      showToast({ title: 'Member removed', message: `${name || 'The member'} no longer has access to this workspace.`, variant: 'success' });
    } catch (error) {
      showToast({ title: 'Could not remove member', message: error.message, variant: 'error' });
    } finally {
      setBusyId('');
    }
  };

  const deleteTeam = async () => {
    if (!window.confirm(`Delete ${team.name}? This removes its tasks, notes, files, and membership records.`)) return;
    setBusyId('team');
    try {
      await apiOrThrow(`/api/teams/${team.id}`, 'DELETE');
      onDeleted(team.id);
      showToast({ title: 'Team deleted', message: `${team.name} was removed.`, variant: 'success' });
    } catch (error) {
      showToast({ title: 'Could not delete team', message: error.message, variant: 'error' });
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className="team-management-panel" aria-label={`Manage ${team.name}`}>
      <div className="team-management-panel__header">
        <div><strong>Manage {team.name}</strong><span>Only the workspace leader can approve requests, remove members, or delete this team.</span></div>
        <button type="button" onClick={onClose} aria-label="Close team management"><X size={16} /></button>
      </div>

      <div className="team-management-panel__section">
        <div className="team-management-panel__section-heading"><strong>Join requests</strong><span>{requests.length}</span></div>
        {loading ? <p className="team-management-panel__empty">Loading requests...</p> : requests.length === 0 ? <p className="team-management-panel__empty">No pending requests.</p> : requests.map((request) => (
          <div className="team-management-panel__request" key={request.id}>
            <div><strong>{request.user?.name || 'Unknown user'}</strong><span>{request.user?.email || 'No email available'}</span></div>
            <div className="team-management-panel__actions">
              <button type="button" disabled={busyId === request.id} onClick={() => reviewRequest(request.id, 'approve')}><Check size={14} /> Approve</button>
              <button type="button" disabled={busyId === request.id} onClick={() => reviewRequest(request.id, 'reject')}><X size={14} /> Decline</button>
            </div>
          </div>
        ))}
      </div>

      <div className="team-management-panel__section">
        <div className="team-management-panel__section-heading"><strong>Members</strong><span>{team.members?.length || 0}</span></div>
        {(team.members || []).map((member) => (
          <div className="team-management-panel__member" key={member.id}>
            <div><strong>{member.name || 'Unnamed member'}</strong><span>{member.id === team.ownerId ? 'Leader' : 'Member'}</span></div>
            {member.id !== team.ownerId ? <button type="button" aria-label={`Remove ${member.name || 'member'}`} disabled={busyId === member.id} onClick={() => removeMember(member.id, member.name)}><UserMinus size={15} /></button> : null}
          </div>
        ))}
      </div>

      <button type="button" className="team-management-panel__delete" disabled={busyId === 'team'} onClick={deleteTeam}><Trash2 size={15} /> Delete team</button>
    </section>
  );
}
