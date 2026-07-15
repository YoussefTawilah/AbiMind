/**
 * Duplikat-Erkennung für KI-generierte Karten vs. bestehendes Deck.
 *
 * Ansatz (zweistufig, ohne externe Bibliothek):
 * 1. Exakter Vergleich: normalisierte Vorderseite (Kleinschreibung, Trimmen, Satzzeichen entfernt)
 * 2. Ähnlichkeit: Jaccard-Index auf Wortmengen (≥ 85 % Überlappung)
 *
 * Warum kein Fuzzy-Matching (Levenshtein)?
 * - Für Lernkarten reicht meist „gleiche Frage, andere Interpunktion" (Stufe 1)
 * - Jaccard fängt leichte Umformulierungen ab („Was ist X?" vs. „Was bedeutet X?")
 *   ohne Tippfehler-Noise von Levenshtein auf kurzen Strings
 * - Kein Extra-Paket, schnell im Browser, für Anfänger-Portfolio nachvollziehbar
 */

export type DuplicateSimilarity = 'exact' | 'similar';

export interface DuplicateMatch {
  existingFront: string;
  similarity: DuplicateSimilarity;
}

/** Normalisiert Kartentext für Vergleich */
export function normalizeCardText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[?.!,;:()[\]"""'»«–—]/g, '');
}

/** Jaccard-Ähnlichkeit zweier Texte auf Wortbasis (0–1) */
export function wordJaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(
    normalizeCardText(a)
      .split(' ')
      .filter((w) => w.length > 0),
  );
  const wordsB = new Set(
    normalizeCardText(b)
      .split(' ')
      .filter((w) => w.length > 0),
  );

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

const SIMILAR_THRESHOLD = 0.85;

/** Prüft eine Vorderseite gegen alle bestehenden Vorderseiten im Deck */
export function findDuplicateMatch(
  front: string,
  existingFronts: string[],
): DuplicateMatch | null {
  if (!front.trim() || existingFronts.length === 0) return null;

  const normalized = normalizeCardText(front);

  for (const existing of existingFronts) {
    if (normalizeCardText(existing) === normalized) {
      return { existingFront: existing, similarity: 'exact' };
    }
  }

  for (const existing of existingFronts) {
    if (wordJaccardSimilarity(front, existing) >= SIMILAR_THRESHOLD) {
      return { existingFront: existing, similarity: 'similar' };
    }
  }

  return null;
}

/** Mappt jede generierte Vorderseite auf einen optionalen Duplikat-Treffer */
export function findDuplicatesForCards(
  generatedFronts: string[],
  existingFronts: string[],
): (DuplicateMatch | null)[] {
  return generatedFronts.map((front) => findDuplicateMatch(front, existingFronts));
}
