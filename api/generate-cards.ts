import type { VercelRequest, VercelResponse } from '@vercel/node';
import { logEnvKeyNames } from './_lib/load-env';
import { callGemini } from './_lib/gemini';

/**
 * Serverless Function: KI-Kartengenerator
 *
 * Der GEMINI_API_KEY liegt NUR in der Server-Umgebung (Vercel Dashboard / .env.local).
 * Das Frontend sendet nur extrahierten Text oder ein Base64-Bild – nie den API-Key.
 *
 * Env-Lesen: api/_lib/gemini.ts Zeile 22 → process.env.GEMINI_API_KEY
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  logEnvKeyNames('generate-cards');

  // CORS für lokale Entwicklung
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Nur POST erlaubt.' });
  }

  try {
    const body = req.body ?? {};
    const { text, imageBase64, mimeType } = body as {
      text?: string;
      imageBase64?: string;
      mimeType?: string;
    };

    // Größenlimits (Base64 ≈ 33 % größer als Original)
    if (imageBase64 && imageBase64.length > 14_000_000) {
      return res.status(413).json({
        error: 'Bild zu groß (max. ~10 MB). Bitte verkleinern oder als PDF exportieren.',
      });
    }

    if (text && text.length > 50_000) {
      return res.status(413).json({
        error: 'Text zu lang (max. 50.000 Zeichen). Bitte kürzeres Dokument verwenden.',
      });
    }

    const cards = await callGemini({ text, imageBase64, mimeType });
    return res.status(200).json({ cards });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Serverfehler.';
    console.error('[generate-cards]', message);
    return res.status(500).json({ error: message });
  }
}
