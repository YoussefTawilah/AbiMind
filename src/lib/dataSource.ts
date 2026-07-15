import { isSupabaseConfigured } from './supabase';

/** Aktuelle Cloud-Nutzer-ID (null = Gast-Modus / IndexedDB) */
let cloudUserId: string | null = null;

export function setCloudUserId(userId: string | null): void {
  cloudUserId = userId;
}

export function getCloudUserId(): string | null {
  return cloudUserId;
}

/** true, wenn eingeloggt und Supabase konfiguriert → CRUD geht gegen Postgres */
export function isCloudMode(): boolean {
  return cloudUserId !== null && isSupabaseConfigured;
}
