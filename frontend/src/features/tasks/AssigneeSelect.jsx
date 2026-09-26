import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronDown, Crown } from 'lucide-react';

function AvatarBadge({ label }) {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-[10px] font-bold text-white">
      {label}
    </span>
  );
}

export default function AssigneeSelect({ members, value, onChange, currentUserId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const normalizedMembers = useMemo(() => {
    const unique = new Map();
    members.forEach((member) => unique.set(member.id, member));
    return Array.from(unique.values());
  }, [members]);

  const currentUser = normalizedMembers.find((member) => member.id === currentUserId);
  const selected = normalizedMembers.find((member) => member.id === value);
  const isSelf = !value || value === currentUserId;

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm transition hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <div className="flex min-w-0 items-center gap-2">
          {isSelf ? (
            <React.Fragment>
              <AvatarBadge label={currentUser?.avatar || currentUser?.name?.charAt(0) || '?'} />
              <span className="truncate text-white">Assign to myself</span>
            </React.Fragment>
          ) : selected ? (
            <React.Fragment>
              <AvatarBadge label={selected.avatar || selected.name?.charAt(0) || '?'} />
              <span className="truncate text-white">{selected.name}</span>
            </React.Fragment>
          ) : (
            <span className="text-gray-400">Select assignee</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open ? (
          <div
            className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1625] p-1.5 shadow-2xl"
          >
            {[currentUser, ...normalizedMembers.filter((member) => member.id !== currentUserId)].filter(Boolean).map((member) => {
              const isActive = member.id === (value || currentUserId);
              const isOwner = member.role === 'leader';

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    onChange(member.id);
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    isActive ? 'bg-purple-500/20 text-white' : 'text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <AvatarBadge label={member.avatar || member.name?.charAt(0) || '?'} />
                  <span className="truncate">{member.id === currentUserId ? 'Myself' : member.name}</span>
                  {isOwner ? (
                    <span className="ml-auto flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-300">
                      <Crown className="h-3 w-3" />
                      Owner
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
