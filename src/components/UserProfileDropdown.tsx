import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getAuthDisplayLabel, useAuth, type AuthStatus } from '../contexts/AuthContext';
import { useAbiProfile } from '../contexts/AbiProfileContext';

interface UserProfileDropdownProps {
  onOpenAuth: () => void;
}

function getInitials(status: AuthStatus, user: User | null): string {
  if (status === 'authenticated' && user?.email) {
    return user.email[0].toUpperCase();
  }
  if (status === 'guest') return 'G';
  return '…';
}

function getAvatarUrl(user: User | null): string | undefined {
  const url = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture;
  return typeof url === 'string' ? url : undefined;
}

export function UserProfileDropdown({ onOpenAuth }: UserProfileDropdownProps) {
  const { status, user, signOut } = useAuth();
  const { openModal } = useAbiProfile();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const authLabel = getAuthDisplayLabel(status, user);
  const initials = getInitials(status, user);
  const avatarUrl = getAvatarUrl(user ?? null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    try {
      await signOut();
    } catch {
      // onAuthStateChange updates UI
    }
  }

  function handleOpenAuth() {
    setOpen(false);
    onOpenAuth();
  }

  function handleEditAbiProfile() {
    setOpen(false);
    openModal();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border-default bg-surface-overlay transition-colors hover:border-accent/50 hover:bg-surface-elevated"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Benutzerprofil"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-accent">{initials}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border-subtle bg-surface-elevated py-1 shadow-[0_8px_24px_#00000050]"
        >
          <div className="border-b border-border-subtle px-4 py-3">
            <p className="truncate text-sm font-medium text-text-primary">
              {status === 'authenticated' && user?.email ? user.email : 'Gast'}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">{authLabel}</p>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={handleEditAbiProfile}
            className="w-full px-4 py-2.5 text-left text-sm text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
          >
            Profil
          </button>

          {status === 'authenticated' ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleSignOut()}
              className="w-full px-4 py-2.5 text-left text-sm text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
            >
              Abmelden
            </button>
          ) : status === 'guest' ? (
            <button
              type="button"
              role="menuitem"
              onClick={handleOpenAuth}
              className="w-full px-4 py-2.5 text-left text-sm text-accent transition-colors hover:bg-surface-overlay"
            >
              Anmelden
            </button>
          ) : (
            <p className="px-4 py-2.5 text-sm text-text-tertiary">Wird geladen …</p>
          )}
        </div>
      )}
    </div>
  );
}
