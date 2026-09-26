import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Crown, Plus, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import CreateTeamModal from './CreateTeamModal';
import JoinTeamModal from './JoinTeamModal';

export default function TeamPanel({ currentTeam, onTeamChange, session }) {
  const [teams, setTeams] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const currentTeamId = currentTeam?.id;

  const sortedTeams = useMemo(
    () => [...teams].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
    [teams],
  );

  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api('/api/teams');
      if (data && Array.isArray(data)) {
        setTeams(data);
        if (!currentTeamId && data.length > 0) {
          onTeamChange(data[0]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentTeamId, onTeamChange]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchTeams();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchTeams]);

  const handleCopyInvite = async () => {
    if (!currentTeam?.inviteCode) return;
    await navigator.clipboard.writeText(currentTeam.inviteCode);
    showToast({
      title: 'Invite code copied',
      message: `${currentTeam.inviteCode} is ready to share.`,
      variant: 'success',
    });
  };

  const handleCreated = (team) => {
    setTeams((prev) => [team, ...prev.filter((item) => item.id !== team.id)]);
    onTeamChange(team);
  };

  const handleJoined = async (team) => {
    await fetchTeams();
    onTeamChange(team);
  };

  return (
    <React.Fragment>
      <div className="glass-panel rounded-3xl p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Project spaces</p>
            <h3 className="mt-1 text-lg font-bold text-white">Your projects</h3>
          </div>
          <div className="rounded-2xl bg-white/5 px-3 py-2 text-xs text-gray-400">
            {sortedTeams.length} total
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:from-purple-500 hover:to-blue-500"
          >
            <Plus className="h-4 w-4" />
            Create Team
          </button>
          <button
            type="button"
            onClick={() => setShowJoinModal(true)}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <Users className="h-4 w-4" />
            Join Team
          </button>
        </div>

        {currentTeam ? (
          <button
            type="button"
            onClick={handleCopyInvite}
            className="mb-4 flex w-full cursor-pointer items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.06]"
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Invite Code</p>
              <p className="mt-1 font-mono text-sm text-white">{currentTeam.inviteCode}</p>
            </div>
            <Copy className="h-4 w-4 text-purple-300" />
          </button>
        ) : null}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Your Teams</p>
            {isLoading ? <span className="text-[10px] text-gray-500">Loading...</span> : null}
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {sortedTeams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => onTeamChange(team)}
                className={`w-full cursor-pointer rounded-2xl border px-4 py-3 text-left transition ${
                  currentTeam?.id === team.id
                    ? 'border-purple-400/30 bg-purple-500/15'
                    : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 text-sm font-bold text-white">
                    {team.name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">{team.name}</p>
                      {team.ownerId === session?.user?.id ? <Crown className="h-3.5 w-3.5 flex-shrink-0 text-yellow-400" /> : null}
                    </div>
                    <p className="truncate text-xs text-gray-500">{team.description || 'No description yet'}</p>
                  </div>
                </div>
              </button>
            ))}

            {!isLoading && sortedTeams.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-gray-500">
              Create a project space or join one with an invite code.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <CreateTeamModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />
      <JoinTeamModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} onJoined={handleJoined} />
    </React.Fragment>
  );
}
