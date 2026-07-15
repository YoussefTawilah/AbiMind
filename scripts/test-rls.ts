/**
 * RLS-Verifikation gegen eine echte Supabase-Instanz.
 *
 * Voraussetzungen:
 * 1. SQL-Migration ausgeführt (supabase/migrations/20260714000000_initial_schema.sql)
 * 2. Zwei Testnutzer in Supabase Auth angelegt (z. B. per Google oder E-Mail)
 * 3. Env-Variablen gesetzt (siehe unten)
 *
 * Ausführen:
 *   npx tsx scripts/test-rls.ts
 *
 * Env:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *   TEST_USER_A_EMAIL + TEST_USER_A_PASSWORD
 *   TEST_USER_B_EMAIL + TEST_USER_B_PASSWORD
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(filename: string): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), filename), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvFile('.env.local');

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

const userA = {
  email: process.env.TEST_USER_A_EMAIL,
  password: process.env.TEST_USER_A_PASSWORD,
};
const userB = {
  email: process.env.TEST_USER_B_EMAIL,
  password: process.env.TEST_USER_B_PASSWORD,
};

function requireEnv(): void {
  const missing: string[] = [];
  if (!url || url.includes('dein-projekt')) missing.push('VITE_SUPABASE_URL');
  if (!anonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  if (!userA.email || !userA.password) missing.push('TEST_USER_A_EMAIL/PASSWORD');
  if (!userB.email || !userB.password) missing.push('TEST_USER_B_EMAIL/PASSWORD');
  if (missing.length > 0) {
    console.error('Fehlende oder Platzhalter-Konfiguration:', missing.join(', '));
    process.exit(1);
  }
}

async function signIn(email: string, password: string) {
  const client = createClient(url!, anonKey!);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error(`Login fehlgeschlagen: ${email}`);
  return { client, userId: data.user.id };
}

async function main(): Promise<void> {
  requireEnv();

  const deckIdA = crypto.randomUUID();
  const deckIdB = crypto.randomUUID();
  const deckNameA = `RLS-Test-A-${Date.now()}`;
  const deckNameB = `RLS-Test-B-${Date.now()}`;

  const sessionA = await signIn(userA.email!, userA.password!);
  const sessionB = await signIn(userB.email!, userB.password!);

  console.log('Nutzer A:', sessionA.userId);
  console.log('Nutzer B:', sessionB.userId);

  const now = new Date().toISOString();

  // Nutzer A legt ein Deck an
  const { error: insertAError } = await sessionA.client.from('decks').insert({
    id: deckIdA,
    user_id: sessionA.userId,
    name: deckNameA,
    created_at: now,
    updated_at: now,
  });
  if (insertAError) throw insertAError;

  // Nutzer B legt ein Deck an
  const { error: insertBError } = await sessionB.client.from('decks').insert({
    id: deckIdB,
    user_id: sessionB.userId,
    name: deckNameB,
    created_at: now,
    updated_at: now,
  });
  if (insertBError) throw insertBError;

  // Nutzer A sieht nur eigenes Deck
  const { data: decksA, error: selectAError } = await sessionA.client.from('decks').select('id, name');
  if (selectAError) throw selectAError;
  const namesA = (decksA ?? []).map((d) => d.name);
  if (!namesA.includes(deckNameA)) {
    throw new Error(`Nutzer A sieht eigenes Deck nicht: ${deckNameA}`);
  }
  if (namesA.includes(deckNameB)) {
    throw new Error(`RLS-FEHLER: Nutzer A sieht Deck von Nutzer B (${deckNameB})`);
  }

  // Nutzer B sieht nur eigenes Deck
  const { data: decksB, error: selectBError } = await sessionB.client.from('decks').select('id, name');
  if (selectBError) throw selectBError;
  const namesB = (decksB ?? []).map((d) => d.name);
  if (!namesB.includes(deckNameB)) {
    throw new Error(`Nutzer B sieht eigenes Deck nicht: ${deckNameB}`);
  }
  if (namesB.includes(deckNameA)) {
    throw new Error(`RLS-FEHLER: Nutzer B sieht Deck von Nutzer A (${deckNameA})`);
  }

  // Nutzer A darf Deck von B nicht direkt lesen
  const { data: crossRead, error: crossReadError } = await sessionA.client
    .from('decks')
    .select('id')
    .eq('id', deckIdB)
    .maybeSingle();
  if (crossReadError) throw crossReadError;
  if (crossRead) {
    throw new Error('RLS-FEHLER: Nutzer A konnte Deck-ID von Nutzer B direkt lesen');
  }

  // Nutzer A darf nicht als Nutzer B schreiben
  const { error: spoofError } = await sessionA.client.from('decks').insert({
    id: crypto.randomUUID(),
    user_id: sessionB.userId,
    name: 'Spoof-Versuch',
    created_at: now,
    updated_at: now,
  });
  if (!spoofError) {
    throw new Error('RLS-FEHLER: Nutzer A konnte Deck mit fremder user_id anlegen');
  }

  // Aufräumen
  await sessionA.client.from('decks').delete().eq('id', deckIdA);
  await sessionB.client.from('decks').delete().eq('id', deckIdB);

  console.log('✓ RLS-Test bestanden: Nutzer sehen nur eigene Decks.');
}

main().catch((err) => {
  console.error('RLS-Test fehlgeschlagen:', err);
  process.exit(1);
});
