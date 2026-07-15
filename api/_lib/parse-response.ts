/** Von der KI erwartete Kartenstruktur (Server + Client) */
export interface GeneratedCard {
  front: string;
  back: string;
  tag: string;
}

export class AiParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiParseError';
  }
}

/**
 * Parst und validiert die KI-Antwort.
 * Toleriert Markdown-Codeblöcke (```json ... ```), die manche Modelle hinzufügen.
 */
export function parseGeneratedCards(raw: string): GeneratedCard[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new AiParseError('KI-Antwort ist leer.');
  }

  let jsonStr = trimmed;

  // Markdown-Codeblock entfernen falls vorhanden
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new AiParseError(
      'KI-Antwort ist kein gültiges JSON. Bitte erneut versuchen.',
    );
  }

  const cardsRaw = extractCardsArray(parsed);
  if (cardsRaw.length === 0) {
    throw new AiParseError(
      'KI hat keine Karten erzeugt. Versuche ein anderes Dokument oder mehr Inhalt.',
    );
  }

  const cards: GeneratedCard[] = [];
  for (let i = 0; i < cardsRaw.length; i++) {
    const item = cardsRaw[i];
    if (!item || typeof item !== 'object') continue;

    const record = item as Record<string, unknown>;
    const front = String(record.front ?? '').trim();
    const back = String(record.back ?? '').trim();
    const tag = String(record.tag ?? 'Allgemein').trim() || 'Allgemein';

    if (!front || !back) continue;

    cards.push({ front, back, tag });
  }

  if (cards.length === 0) {
    throw new AiParseError(
      'KI-Antwort enthielt keine gültigen Karten (front/back fehlen).',
    );
  }

  return cards;
}

function extractCardsArray(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.cards)) return obj.cards;
    if (Array.isArray(obj.karten)) return obj.karten;
    if (Array.isArray(obj.flashcards)) return obj.flashcards;
  }

  throw new AiParseError(
    'KI-Antwort hat nicht das erwartete Format { "cards": [...] }.',
  );
}
