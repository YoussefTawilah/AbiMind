import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** true, wenn Supabase-Env-Vars gesetzt sind */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Supabase-Client (Browser).
 *
 * Der Anon-Key ist absichtlich öffentlich (VITE_-Prefix) – Schutz kommt über
 * Row Level Security, nicht durch Geheimhaltung im Frontend.
 *
 * WICHTIG: VITE_SUPABASE_URL muss die Projekt-Root-URL sein, z. B.
 *   https://xyzxyz.supabase.co
 * NICHT die OAuth-Callback-URL (/auth/v1/callback).
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        detectSessionInUrl: true,
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

if (import.meta.env.DEV && supabase) {
  console.log('[Abimind Auth] Supabase-Client initialisiert', {
    url: supabaseUrl,
    redirectHint: {
      search: window.location.search,
      hash: window.location.hash ? `${window.location.hash.slice(0, 40)}…` : '(leer)',
    },
  });
}
