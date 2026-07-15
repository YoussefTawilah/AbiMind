import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isGoogleAuthEnabled } from '../lib/authDiagnostics';

interface AuthScreenProps {
  onGuestContinue: () => void;
}

export function AuthScreen({ onGuestContinue }: AuthScreenProps) {
  const { signInWithGoogle, isConfigured } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isConfigured) return;
    void isGoogleAuthEnabled().then(setGoogleEnabled);
  }, [isConfigured]);

  async function handleGoogleLogin() {
    setError(null);

    if (googleEnabled === false) {
      setError(
        'Google-Login ist in Supabase noch nicht aktiviert. Siehe Authentication → Providers → Google.',
      );
      return;
    }

    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div className="text-center">
        <h2 className="text-display">Anmelden</h2>
        <p className="mt-3 text-body">
          Optional: Mit Account werden deine Decks in der Cloud gespeichert und auf allen Geräten
          synchronisiert. Ohne Login lernst du lokal auf diesem Gerät.
        </p>
      </div>

      {!isConfigured && (
        <div className="alert-warning">
          Supabase ist noch nicht konfiguriert. Trage{' '}
          <code className="rounded bg-surface-overlay px-1 text-accent">VITE_SUPABASE_URL</code> und{' '}
          <code className="rounded bg-surface-overlay px-1 text-accent">VITE_SUPABASE_ANON_KEY</code>{' '}
          in <code className="rounded bg-surface-overlay px-1 text-accent">.env.local</code> ein.
        </div>
      )}

      {googleEnabled === false && (
        <div className="alert-error">
          <strong>Google-Provider ist in Supabase deaktiviert.</strong>
          <p className="mt-2">
            Supabase Dashboard → Authentication → Providers → Google → Enable. Dort Client ID und
            Client Secret aus der Google Cloud Console eintragen.
          </p>
        </div>
      )}

      {error && <div className="alert-error">{error}</div>}

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={!isConfigured || loading || googleEnabled === false}
          className="btn-secondary flex w-full gap-3 py-3 disabled:opacity-50"
        >
          <GoogleIcon />
          {loading ? 'Weiterleitung …' : 'Mit Google anmelden'}
        </button>

        <button type="button" onClick={onGuestContinue} className="btn-primary w-full py-3">
          Als Gast fortfahren
        </button>
      </div>

      <p className="text-center text-caption">
        Gast-Modus: Alle Daten bleiben lokal in deinem Browser (IndexedDB). Kein Account nötig.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
