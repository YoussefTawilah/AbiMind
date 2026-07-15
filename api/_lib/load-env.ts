/**
 * Lädt .env-Dateien explizit für lokale Serverless Functions.
 *
 * Hintergrund: Bei `vercel dev --local` (ohne vercel link) werden Env-Vars
 * oft NICHT in process.env der API-Functions injiziert – Vite lädt .env.local
 * nur für das Frontend. Dieser Loader schließt die Lücke.
 */
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

/** In dieser Reihenfolge laden; spätere Dateien überschreiben frühere */
const ENV_FILES = ['.env', '.env.development', '.env.local', '.env.development.local'];

let loaded = false;

export function loadLocalEnv(): void {
  if (loaded) return;
  loaded = true;

  for (const file of ENV_FILES) {
    const path = resolve(root, file);
    if (existsSync(path)) {
      config({ path, override: true, quiet: true });
      console.log(`[load-env] geladen: ${file}`);
    }
  }
}

/** Debug: nur Variablennamen loggen, niemals Werte */
export function logEnvKeyNames(context: string): void {
  const keys = Object.keys(process.env).sort();
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  console.log(`[${context}] process.env Keys (${keys.length}):`, keys.join(', '));
  console.log(`[${context}] GEMINI_API_KEY gesetzt:`, hasGemini);
}

// Beim Import sofort laden (vor callGemini)
loadLocalEnv();
