import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react';

function getDisplayName(session) {
  return session?.user?.user_metadata?.name
    || session?.user?.user_metadata?.full_name
    || session?.user?.email?.split('@')[0]
    || 'Your profile';
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfileMenu({ session, onOpenProfile, onOpenSettings, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const name = getDisplayName(session);
  const email = session?.user?.email || '';

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const runAction = (action) => {
    setOpen(false);
    action?.();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="profile-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Open profile menu"
      >
        <span className="profile-avatar">{getInitials(name)}</span>
        <span className="hidden min-w-0 text-left lg:block">
          <strong className="profile-trigger__name">{name}</strong>
          <span className="profile-trigger__meta">Account</span>
        </span>
        <ChevronDown className={`hidden h-4 w-4 transition-transform lg:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="profile-menu" role="menu">
          <div className="profile-menu__header">
            <span className="profile-avatar profile-avatar--large">{getInitials(name)}</span>
            <div className="min-w-0">
              <strong className="block truncate">{name}</strong>
              <span className="block truncate">{email}</span>
            </div>
          </div>
          <div className="profile-menu__divider" />
          <button type="button" role="menuitem" onClick={() => runAction(onOpenProfile)}>
            <UserRound />
            Profile
          </button>
          <button type="button" role="menuitem" onClick={() => runAction(onOpenSettings)}>
            <Settings />
            Settings
          </button>
          <div className="profile-menu__divider" />
          <button type="button" role="menuitem" className="profile-menu__danger" onClick={() => runAction(onLogout)}>
            <LogOut />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
