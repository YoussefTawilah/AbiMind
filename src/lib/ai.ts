/**
 * Frontend-API-Client für den KI-Kartengenerator.
 *
 * Ruft NUR unsere eigene Serverless Function auf (/api/generate-cards).
 * Der Gemini-Key bleibt auf dem Server – nie im Browser-Bundle.
 */

import type { GeneratedCard } from '../types';

const API_PATH = '/api/generate-cards';
const CLIENT_TIMEOUT_MS = 65_000;

export class AiClientError extends Error {
  readonly code: 'network' | 'timeout' | 'server' | 'parse' | 'empty';

  constructor(message: string, code: 'network' | 'timeout' | 'server' | 'parse' | 'empty') {
    super(message);
    this.name = 'AiClientError';
    this.code = code;
  }
}

export interface GenerateFromTextOptions {
  text: string;
}

export interface GenerateFromImageOptions {
  imageBase64: string;
  mimeType: string;
  /** Optional: zusätzlicher Kontext als Text */
  text?: string;
}

/**
 * Sendet extrahierten Text an die Serverless Function.
 */
export async function generateCardsFromText(
  text: string,
): Promise<GeneratedCard[]> {
  if (!text.trim()) {
    throw new AiClientError(
      'Kein Text zum Verarbeiten. Das PDF scheint leer oder gescannt zu sein – versuche ein Bild-Upload.',
      'empty',
    );
  }
  return callGenerateApi({ text: text.trim() });
}

/**
 * Sendet ein Bild (Base64 ohne data:-Prefix) an die Serverless Function.
 */
export async function generateCardsFromImage(
  imageBase64: string,
  mimeType: string,
): Promise<GeneratedCard[]> {
  return callGenerateApi({ imageBase64, mimeType });
}

async function callGenerateApi(body: Record<string, string>): Promise<GeneratedCard[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const response = await fetch(API_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = (await response.json()) as {
      cards?: GeneratedCard[];
      error?: string;
    };

    if (!response.ok) {
      throw new AiClientError(
        data.error ?? `Serverfehler (${response.status})`,
        'server',
      );
    }

    if (!data.cards || data.cards.length === 0) {
      throw new AiClientError(
        'Keine Karten generiert. Versuche ein anderes Dokument.',
        'empty',
      );
    }

    return data.cards;
  } catch (err) {
    if (err instanceof AiClientError) throw err;

    if (err instanceof Error && err.name === 'AbortError') {
      throw new AiClientError(
        'Anfrage-Timeout. Die KI braucht zu lange – bitte erneut versuchen.',
        'timeout',
      );
    }

    // Vite ohne vercel dev → 404 auf /api
    if (err instanceof TypeError) {
      throw new AiClientError(
        'API nicht erreichbar. Starte die App mit „npm run dev:full" (vercel dev).',
        'network',
      );
    }

    throw new AiClientError(
      err instanceof Error ? err.message : 'Netzwerkfehler',
      'network',
    );
  } finally {
    clearTimeout(timeout);
  }
}

/** Festes Beispiel für manuelle Tests (DevTools-Konsole) */
export const EXAMPLE_TEXT = `
Die Photosynthese ist der Prozess, bei dem Pflanzen aus Lichtenergie,
Wasser und Kohlenstoffdioxid Glucose und Sauerstoff herstellen.
Die Gesamtformel lautet: 6 CO₂ + 6 H₂O + Lichtenergie → C₆H₁₂O₆ + 6 O₂.
Die Lichtreaktion findet in den Thylakoiden statt, die Calvin-Zyklen in den Stroma.
Chlorophyll ist das primäre Pigment für Lichtabsorption.
`;
