import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { setCloudUserId } from '../lib/dataSource';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  getLocalImportSummary,
  importAllLocalData,
  readAllLocalData,
  userHasCloudData,
  type LocalImportSummary,
} from '../lib/sync';
import { migrateCloudCardScores } from '../lib/cloudDb';

export type AuthStatus = 'loading' | 'guest' | 'authenticated';

/** Sync-Zustand nach Login: Import-Angebot oder Cloud-Daten laden */
export type SyncState = 'idle' | 'checking' | 'prompt_import' | 'importing' | 'ready';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  isConfigured: boolean;
  syncState: SyncState;
  localImportSummary: LocalImportSummary | null;
  syncError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  confirmImport: () => Promise<void>;
  declineImport: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [localImportSummary, setLocalImportSummary] = useState<LocalImportSummary | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncRunRef = useRef(0);

  const resetSync = useCallback(() => {
    setSyncState('idle');
    setLocalImportSummary(null);
    setSyncError(null);
    setCloudUserId(null);
  }, []);

  const finishSyncReady = useCallback(() => {
    setSyncState('ready');
    setSyncError(null);
  }, []);

  const runSyncCheck = useCallback(
    async (authenticatedUser: User) => {
      const runId = ++syncRunRef.current;
      setSyncState('checking');
      setSyncError(null);

      try {
        const hasCloud = await userHasCloudData(authenticatedUser.id);
        if (syncRunRef.current !== runId) return;

        if (hasCloud) {
          setCloudUserId(authenticatedUser.id);
          try {
            const migrated = await migrateCloudCardScores();
            if (migrated > 0) {
              console.log(`[Abimind Auth] Cloud-Scores migriert: ${migrated} Karten`);
            }
          } catch (migrateErr) {
            console.warn('[Abimind Auth] Cloud-Score-Migration fehlgeschlagen', migrateErr);
          }
          if (syncRunRef.current !== runId) return;
          finishSyncReady();
          return;
        }

        const summary = await getLocalImportSummary();
        if (syncRunRef.current !== runId) return;

        if (summary.total > 0) {
          setLocalImportSummary(summary);
          setSyncState('prompt_import');
          return;
        }

        setCloudUserId(authenticatedUser.id);
        finishSyncReady();
      } catch (err) {
        if (syncRunRef.current !== runId) return;
        setSyncError(err instanceof Error ? err.message : 'Synchronisierung fehlgeschlagen.');
        setCloudUserId(authenticatedUser.id);
        finishSyncReady();
      }
    },
    [finishSyncReady],
  );

  const handleAuthenticated = useCallback(
    (authenticatedUser: User) => {
      console.log('[Abimind Auth] → authenticated', { email: authenticatedUser.email });
      setUser(authenticatedUser);
      setStatus('authenticated');
      void runSyncCheck(authenticatedUser);
    },
    [runSyncCheck],
  );

  const handleGuest = useCallback(() => {
    console.log('[Abimind Auth] → guest');
    syncRunRef.current += 1;
    setUser(null);
    setStatus('guest');
    resetSync();
  }, [resetSync]);

  useEffect(() => {
    if (!supabase) {
      console.log('[Abimind Auth] Kein Supabase-Client → Gast-Modus');
      handleGuest();
      return;
    }

    let ignore = false;

    console.log('[Abimind Auth] Auth-Effect startet', {
      strictModeNote: 'In DEV kann React Strict Mode diesen Effect 2× mounten',
      url: window.location.href,
      search: window.location.search || '(leer)',
      hash: window.location.hash ? `${window.location.hash.slice(0, 60)}…` : '(leer)',
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (ignore) {
        console.log('[Abimind Auth] getSession() ignoriert (Effect cleanup / Strict Mode)');
        return;
      }
      console.log('[Abimind Auth] getSession() Ergebnis', {
        error: error?.message ?? null,
        hasSession: Boolean(session),
        userId: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
      });
      if (session?.user) {
        handleAuthenticated(session.user);
      } else {
        handleGuest();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (ignore) {
        console.log('[Abimind Auth] onAuthStateChange ignoriert (Effect cleanup)', { event });
        return;
      }
      console.log('[Abimind Auth] onAuthStateChange', {
        event,
        hasSession: Boolean(session),
        userId: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
      });
      if (session?.user) {
        handleAuthenticated(session.user);
      } else if (event === 'SIGNED_OUT') {
        handleGuest();
      }
    });

    return () => {
      console.log('[Abimind Auth] Auth-Effect cleanup (Listener wird entfernt)');
      ignore = true;
      subscription.unsubscribe();
    };
  }, [handleAuthenticated, handleGuest]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      throw new Error('Supabase ist nicht konfiguriert. Prüfe VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY.');
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const confirmImport = useCallback(async () => {
    if (!user) return;
    setSyncState('importing');
    setSyncError(null);
    setCloudUserId(user.id);
    try {
      const localData = await readAllLocalData();
      await importAllLocalData(user.id, localData);
      finishSyncReady();
    } catch (err) {
      setCloudUserId(null);
      setSyncError(err instanceof Error ? err.message : 'Import fehlgeschlagen.');
      setSyncState('prompt_import');
    }
  }, [user, finishSyncReady]);

  const declineImport = useCallback(() => {
    if (user) setCloudUserId(user.id);
    finishSyncReady();
  }, [user, finishSyncReady]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isConfigured: isSupabaseConfigured,
      syncState,
      localImportSummary,
      syncError,
      signInWithGoogle,
      signOut,
      confirmImport,
      declineImport,
    }),
    [
      status,
      user,
      syncState,
      localImportSummary,
      syncError,
      signInWithGoogle,
      signOut,
      confirmImport,
      declineImport,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden.');
  return ctx;
}

/** Anzeige-Label für Header */
export function getAuthDisplayLabel(status: AuthStatus, user: User | null): string {
  if (status === 'loading') return 'Wird geladen …';
  if (status === 'authenticated' && user?.email) return `Eingeloggt als ${user.email}`;
  return 'Gast-Modus';
}

/** true, wenn eingeloggt und Sync abgeschlossen → Cloud-CRUD aktiv */
export function isDataReady(status: AuthStatus, syncState: SyncState): boolean {
  if (status !== 'authenticated') return true;
  return syncState === 'ready';
}
