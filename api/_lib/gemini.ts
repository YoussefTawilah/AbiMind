import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildImagePrompt, buildTextPrompt, SYSTEM_PROMPT } from './prompt';
import { parseGeneratedCards, type GeneratedCard } from './parse-response';

/**
 * Standardmodell für Free Tier (Stand Juli 2026).
 *
 * gemini-1.5-flash und gemini-2.0-flash sind eingestellt (Shutdown Juni 2026).
 * gemini-2.5-flash ist die aktuelle kostenlose Flash-Variante in Google AI Studio.
 * Überschreibbar via GEMINI_MODEL (z. B. gemini-3-flash).
 */
const DEFAULT_MODEL = 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 60_000;

export interface GenerateInput {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
}

export async function callGemini(input: GenerateInput): Promise<GeneratedCard[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY ist nicht konfiguriert.');
  }

  const hasText = Boolean(input.text?.trim());
  const hasImage = Boolean(input.imageBase64);

  if (!hasText && !hasImage) {
    throw new Error('Entweder Text oder Bild muss übergeben werden.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? DEFAULT_MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 4096,
      // Erzwingt JSON-Ausgabe (Gemini-Äquivalent zu OpenAI response_format)
      responseMimeType: 'application/json',
    },
  });

  // Gemini multimodal: Text + Bild als Parts-Array (nicht Chat-Messages wie OpenAI)
  type ContentPart = string | { inlineData: { mimeType: string; data: string } };

  let parts: ContentPart[];

  if (hasImage && input.imageBase64) {
    const mime = input.mimeType ?? 'image/jpeg';
    parts = [
      hasText ? buildTextPrompt(input.text!) : buildImagePrompt(),
      {
        inlineData: {
          mimeType: mime,
          data: input.imageBase64, // reines Base64, ohne data:-Prefix
        },
      },
    ];
  } else {
    parts = [buildTextPrompt(input.text!)];
  }

  try {
    const result = await withTimeout(
      model.generateContent(parts),
      REQUEST_TIMEOUT_MS,
    );

    const content = result.response.text();
    if (!content) {
      throw new Error('Gemini hat keine Antwort geliefert.');
    }

    return parseGeneratedCards(content);
  } catch (err) {
    throw mapGeminiError(err);
  }
}

/** Timeout-Wrapper – Gemini SDK hat kein natives AbortSignal für generateContent */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('API-Timeout nach 60 Sekunden. Bitte erneut versuchen.'));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/** Gemini-spezifische Fehler → nutzerfreundliche Meldungen */
function mapGeminiError(err: unknown): Error {
  if (err instanceof Error) {
    // Bereits unsere Timeout-Meldung
    if (err.message.includes('API-Timeout')) return err;

    const msg = err.message.toLowerCase();

    if (msg.includes('api_key_invalid') || msg.includes('api key not valid')) {
      return new Error('Gemini API-Key ungültig. Prüfe GEMINI_API_KEY in .env.local.');
    }

    // 429 RESOURCE_EXHAUSTED – Free-Tier RPM/RPD-Limit
    if (msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota')) {
      return new Error(
        'Gemini Free-Tier-Limit erreicht (Rate Limit oder Tageskontingent). ' +
          'Warte ein paar Minuten oder prüfe dein Kontingent im Google AI Studio.',
      );
    }

    // 503 – Modell überlastet (häufiger bei Gemini als bei OpenAI)
    if (msg.includes('503') || msg.includes('unavailable') || msg.includes('overloaded')) {
      return new Error(
        'Gemini ist momentan überlastet (503). Bitte in 30–60 Sekunden erneut versuchen.',
      );
    }

    // 400 – ungültige Anfrage (z. B. Bild zu groß, falsches Format)
    if (msg.includes('400') || msg.includes('invalid_argument')) {
      return new Error(`Ungültige Anfrage an Gemini: ${err.message.slice(0, 150)}`);
    }

    // Safety-Filter blockiert Inhalt
    if (msg.includes('blocked') || msg.includes('safety')) {
      return new Error(
        'Inhalt wurde von Geminis Safety-Filter blockiert. Versuche ein anderes Dokument.',
      );
    }

    return err;
  }

  return new Error('Unbekannter Gemini-Fehler.');
}
