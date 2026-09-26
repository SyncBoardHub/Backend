import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { apiOrThrow } from '../../lib/api';
import { useToast } from '../../hooks/useToast';

export default function CreateTeamModal({ isOpen, onClose, onCreated }) {
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!teamName.trim()) return;

    setIsSubmitting(true);
    try {
      const team = await apiOrThrow('/api/teams', 'POST', {
        name: teamName.trim(),
        description: teamDesc.trim(),
      });

      setTeamName('');
      setTeamDesc('');
      onCreated(team);
      onClose();
      showToast({
        title: 'Team created',
        message: `${team.name} is ready for collaboration.`,
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Could not create team',
        message: error.message,
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <div
            className="glass-panel w-full max-w-md rounded-3xl p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Create Team</h3>
                  <p className="text-xs text-gray-500">Set up a workspace for your course project, club, or capstone.</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="cursor-pointer text-gray-400 transition hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Project or team name"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                required
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <textarea
                placeholder="Description (optional)"
                value={teamDesc}
                onChange={(event) => setTeamDesc(event.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-3 font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:from-purple-500 hover:to-blue-500 disabled:opacity-60"
              >
                {isSubmitting ? 'Creating...' : 'Create Team'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
