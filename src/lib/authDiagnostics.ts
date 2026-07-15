import { isSupabaseConfigured, supabase } from './supabase';

/** Prüft, ob Google als Auth-Provider in Supabase aktiviert ist */
export async function isGoogleAuthEnabled(): Promise<boolean | null> {
  if (!supabase || !isSupabaseConfigured) return null;

  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
    });
    if (!res.ok) {
      console.warn('[Abimind Auth] Auth-Settings nicht abrufbar', res.status);
      return null;
    }
    const data = (await res.json()) as { external?: { google?: boolean } };
    const enabled = data.external?.google === true;
    console.log('[Abimind Auth] Google-Provider aktiv:', enabled);
    return enabled;
  } catch (err) {
    console.warn('[Abimind Auth] Auth-Settings-Check fehlgeschlagen', err);
    return null;
  }
}
