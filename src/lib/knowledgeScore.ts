import type { ReviewQuality } from '../types';

/**
 * Kenntnis-Score-Algorithmus (ersetzt SM-2 für Kartenauswahl)
 *
 * ── Idee ─────────────────────────────────────────────────────────
 * Jede Karte hat einen Score von 0–100. Niedrig = unsicher, hoch = gut gekonnt.
 * Nach jeder Lernmodus-Bewertung (1–5) wird der Score aktualisiert.
 *
 * ── Formel: Exponentieller Gleitender Durchschnitt (EMA) ─────────
 *
 *   score_neu = α × Ziel(bewertung) + (1 − α) × score_alt
 *
 * Das ist äquivalent zu einem gewichteten Mittel, bei dem neuere Bewertungen
 * stärker zählen: die letzte Bewertung hat Gewicht α, die davor α(1−α),
 * die noch ältere α(1−α)² usw.
 *
 * ── Parameter ────────────────────────────────────────────────────
 *
 * α = 0.45  → letzte Bewertung zählt 45 %, Rest aus bisherigem Score
 *
 * Ziel(bewertung) – wohin der Score „ziehen" will:
 *
 *   1 (vergessen)        →  5
 *   2 (falsch, erinnert) → 25
 *   3 (mühsam richtig)   → 50
 *   4 (leicht gezögert)  → 75
 *   5 (perfekt)          → 95
 *
 * Keine 0/100-Extreme: ein einzelnes Vergessen stürzt den Score nicht
 * sofort ab; ein einzelnes „5" macht die Karte nicht unsichtbar.
 * Die Kartenauswahl (später) sorgt über Gewichte dafür, dass schwache
 * Karten öfter erscheinen.
 *
 * ── Neue Karten ──────────────────────────────────────────────────
 *
 * Start-Score = 50 (neutral), reviewCount = 0.
 * In der Auswahl-Logik (nächster Schritt) bekommen reviewCount === 0
 * maximale Priorität – ähnlich wie sehr niedrige Scores.
 *
 * ── Migration aus ReviewLog ──────────────────────────────────────
 *
 * Nur Einträge mit mode === 'sm2' (Übungsmodus ändert den Score nicht).
 * Chronologisch sortiert, EMA Schritt für Schritt durchspielen.
 * Keine Historie → Start-Score 50.
 */

/** Anteil der aktuellen Bewertung am neuen Score (0–1) */
export const SCORE_ALPHA = 0.45;

/** Neutraler Startwert für neue oder nie bewertete Karten */
export const DEFAULT_KNOWLEDGE_SCORE = 50;

/** Ziel-Score pro Bewertung (1–5) auf der Skala 0–100 */
export const QUALITY_TARGETS: Record<ReviewQuality, number> = {
  1: 5,
  2: 25,
  3: 50,
  4: 75,
  5: 95,
};

/** Mappt eine Bewertung auf den Ziel-Score Z(q) */
export function qualityToTarget(quality: ReviewQuality): number {
  return QUALITY_TARGETS[quality];
}

/** Begrenzt und rundet einen Score auf 0–100 */
export function clampScore(score: number): number {
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Ein Lernschritt: score_neu = α × Z(q) + (1 − α) × score_alt
 */
export function updateKnowledgeScore(
  currentScore: number,
  quality: ReviewQuality,
): number {
  const target = qualityToTarget(quality);
  const next = SCORE_ALPHA * target + (1 - SCORE_ALPHA) * currentScore;
  return clampScore(next);
}

/**
 * Berechnet den Score aus einer chronologischen Liste von SM-2-Bewertungen.
 * Wird für die einmalige Migration aus ReviewLog-Historie genutzt.
 */
export function computeScoreFromHistory(
  qualities: ReviewQuality[],
  initialScore: number = DEFAULT_KNOWLEDGE_SCORE,
): number {
  return qualities.reduce(
    (score, quality) => updateKnowledgeScore(score, quality),
    initialScore,
  );
}

/** Standardwerte für eine neu angelegte Karte */
export function createDefaultKnowledgeState(): {
  knowledgeScore: number;
  reviewCount: number;
} {
  return {
    knowledgeScore: DEFAULT_KNOWLEDGE_SCORE,
    reviewCount: 0,
  };
}

/**
 * Gewicht für gewichtete Zufallsauswahl (nächster Implementierungsschritt).
 *
 *   gewicht = max(MIN_WEIGHT, 100 − score)
 *
 * Score  0 → Gewicht 100 (sehr oft)
 * Score 50 → Gewicht  50
 * Score 95 → Gewicht   5 (MIN_WEIGHT – kommt trotzdem ab und zu)
 *
 * Nie bewertete Karten (reviewCount === 0) → NEW_CARD_WEIGHT (höchste Priorität).
 */
export const MIN_SELECTION_WEIGHT = 5;
export const NEW_CARD_SELECTION_WEIGHT = 100;

export function selectionWeight(
  knowledgeScore: number,
  reviewCount: number,
): number {
  if (reviewCount === 0) return NEW_CARD_SELECTION_WEIGHT;
  return Math.max(MIN_SELECTION_WEIGHT, 100 - knowledgeScore);
}
