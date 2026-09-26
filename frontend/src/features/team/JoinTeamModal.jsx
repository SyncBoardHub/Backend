import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { LogIn, X } from 'lucide-react';
import { apiOrThrow } from '../../lib/api';
import { useToast } from '../../hooks/useToast';

export default function JoinTeamModal({ isOpen, onClose, onJoined }) {
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!joinCode.trim()) return;

    setIsSubmitting(true);
    try {
      const team = await apiOrThrow('/api/teams/join', 'POST', { code: joinCode.trim().toUpperCase() });
      setJoinCode('');
      onJoined(team);
      onClose();
      showToast({
        title: team.status === 'pending' ? 'Request sent for approval' : 'Joined team',
        message: team.status === 'pending' ? `${team.name}'s leader must approve your request.` : `You are now in ${team.name}.`,
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Could not join team',
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
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
                  <LogIn className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Join Team</h3>
                  <p className="text-xs text-gray-500">Use the invite code shared by your project lead.</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="cursor-pointer text-gray-400 transition hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Enter invite code"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                required
                autoFocus
                maxLength={10}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center font-mono text-lg uppercase tracking-[0.22em] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-purple-500 disabled:opacity-60"
              >
                {isSubmitting ? 'Joining...' : 'Join Team'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
