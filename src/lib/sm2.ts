import type { Card, ReviewQuality, Sm2Result } from '../types';

/**
 * @deprecated SM-2 wurde durch knowledgeScore.ts ersetzt.
 * Datei bleibt vorerst für CSV-Import und bestehende Tests.
 * Nach vollständiger UI-Migration nach src/lib/_archive/sm2.ts verschieben.
 *
 * SM-2 Spaced-Repetition-Algorithmus (SuperMemo 2, Wozniak 1987)
 *
 * Diese Implementierung folgt der Original-Formel. Du bewertest dich auf
 * einer Skala von 1–5 (Abimind-Anpassung; Original SM-2 nutzt 0–5):
 *
 *   1 = komplett vergessen
 *   2 = falsch, aber erinnert nach Aufdecken
 *   3 = richtig mit großer Mühe
 *   4 = richtig mit leichter Zögern
 *   5 = perfekt, sofort gewusst
 *
 * Bewertungen < 3 gelten als „nicht bestanden" → Karte wird zurückgesetzt.
 * Bewertungen ≥ 3 gelten als „bestanden" → Intervall wächst.
 */

/** Standard-Easiness-Factor für neue Karten (Original-SM-2-Wert) */
export const DEFAULT_EASINESS_FACTOR = 2.5;

/** Untergrenze für den Easiness Factor – Karten werden nie „härter" als 1.3 */
export const MIN_EASINESS_FACTOR = 1.3;

/** Bewertungen unter diesem Wert = Karte nicht bestanden */
export const PASS_THRESHOLD = 3;

/**
 * Gibt das heutige Datum als ISO-String (nur Datum, UTC-Mitternacht) zurück.
 * Alle Fälligkeitsvergleiche laufen über reine Datumsstrings (YYYY-MM-DD).
 */
export function toDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Addiert `days` Tage zu einem ISO-Datum und gibt ein neues ISO-Datum zurück */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + days);
  return toDateString(d);
}

/**
 * Berechnet den neuen Easiness Factor (EF) nach der Original-SM-2-Formel:
 *
 *   EF' = EF + (0.1 − (5 − q) × (0.08 + (5 − q) × 0.02))
 *
 * Intuition:
 * - Bei q = 5 (perfekt):  EF steigt um +0.1  → Karte wird leichter
 * - Bei q = 4:            EF steigt um +0.0  → neutral
 * - Bei q = 3:            EF sinkt um −0.14 → etwas schwerer
 * - Bei q = 2:            EF sinkt um −0.32 → deutlich schwerer
 * - Bei q = 1:            EF sinkt um −0.54 → stark schwerer
 *
 * Der EF wird nie unter 1.3 gesenkt (Minimum aus dem Original-Algorithmus).
 */
export function calculateEasinessFactor(
  currentEF: number,
  quality: ReviewQuality,
): number {
  const q = quality;
  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  const newEF = currentEF + delta;
  return Math.max(MIN_EASINESS_FACTOR, Math.round(newEF * 100) / 100);
}

/**
 * Kernfunktion: Berechnet alle neuen SM-2-Werte nach einer Bewertung.
 *
 * Ablauf (Original SM-2):
 *
 * 1. EF aktualisieren (immer, unabhängig vom Ergebnis)
 *
 * 2a. Bei bestandener Antwort (q ≥ 3):
 *     - 1. erfolgreiche Wiederholung → Intervall = 1 Tag
 *     - 2. erfolgreiche Wiederholung → Intervall = 6 Tage
 *     - ab 3. Wiederholung         → Intervall = vorheriges Intervall × EF (gerundet)
 *     - repetitions wird um 1 erhöht
 *
 * 2b. Bei nicht bestandener Antwort (q < 3):
 *     - repetitions = 0 (zurück auf Anfang)
 *     - Intervall = 1 Tag (Karte morgen wieder)
 *
 * 3. Fälligkeitsdatum = heute + neues Intervall
 */
export function calculateSm2(
  card: Pick<Card, 'easinessFactor' | 'interval' | 'repetitions'>,
  quality: ReviewQuality,
  today: string = toDateString(),
): Sm2Result {
  const newEF = calculateEasinessFactor(card.easinessFactor, quality);

  let newRepetitions: number;
  let newInterval: number;

  if (quality >= PASS_THRESHOLD) {
    // ── Bestanden ──────────────────────────────────────────────
    if (card.repetitions === 0) {
      // Erste erfolgreiche Wiederholung
      newInterval = 1;
    } else if (card.repetitions === 1) {
      // Zweite erfolgreiche Wiederholung
      newInterval = 6;
    } else {
      // Ab der dritten: Intervall mit EF multiplizieren
      newInterval = Math.round(card.interval * newEF);
    }
    newRepetitions = card.repetitions + 1;
  } else {
    // ── Nicht bestanden: komplett zurücksetzen ─────────────────
    newRepetitions = 0;
    newInterval = 1;
  }

  // Mindestintervall 1 Tag (auch bei Reset)
  newInterval = Math.max(1, newInterval);

  return {
    easinessFactor: newEF,
    interval: newInterval,
    repetitions: newRepetitions,
    dueDate: addDays(today, newInterval),
  };
}

/** Prüft, ob eine Karte heute oder früher fällig ist */
export function isDue(card: Pick<Card, 'dueDate'>, today: string = toDateString()): boolean {
  return card.dueDate <= today;
}

/** Erstellt SM-2-Standardwerte für eine brandneue Karte (sofort fällig) */
export function createDefaultSm2State(today: string = toDateString()): Omit<Sm2Result, 'dueDate'> & { dueDate: string } {
  return {
    easinessFactor: DEFAULT_EASINESS_FACTOR,
    interval: 0,
    repetitions: 0,
    dueDate: today, // neue Karten sind sofort fällig
  };
}
