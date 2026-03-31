/**
 * UserMenuDropdown
 * ----------------
 * Displays the current user's avatar + name in the top-right header.
 * Clicking opens a dropdown with Profile, Settings, and Logout actions.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/CurrentUserContext.jsx';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';

export default function UserMenuDropdown() {
  const { currentUser } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    base44.auth.logout();
  };

  if (!currentUser) return null;

  const profile = {
    first_name: currentUser.first_name,
    last_name: currentUser.last_name,
    full_name: currentUser.full_name,
    email: currentUser.email,
    profile_photo_url: currentUser.profile_photo_url,
  };
  const initials = [profile.first_name?.[0], profile.last_name?.[0]].filter(Boolean).join('').toUpperCase()
    || profile.email?.[0]?.toUpperCase()
    || '?';

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-white/10"
        style={{ color: 'var(--sidebar-text-active)' }}
      >
        {/* Avatar */}
        {profile.profile_photo_url ? (
          <img
            src={profile.profile_photo_url}
            alt={profile.full_name}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-2 ring-white/20"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(37,99,235,0.25)', color: 'var(--sidebar-accent)' }}
          >
            {initials}
          </div>
        )}
        <span className="text-xs font-medium hidden sm:block max-w-[100px] truncate" style={{ color: 'var(--text-primary)' }}>
          {profile.first_name || profile.full_name || profile.email}
        </span>
        <ChevronDown className="w-3 h-3 opacity-50 hidden sm:block" style={{ color: 'var(--text-muted)' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-56 rounded-xl shadow-lg border py-1 z-50"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
        >
          {/* User info header */}
          <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {profile.full_name || profile.email}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {profile.email}
            </p>
            <span
              className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
              style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
            >
              {currentUser.role}
            </span>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              to={`${createPageUrl('Settings')}#profile`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <User className="w-4 h-4 flex-shrink-0" />
              Profile
            </Link>
            <Link
              to={createPageUrl('Settings')}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              Settings
            </Link>
          </div>

          <div className="border-t py-1" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.color = '#EF4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}