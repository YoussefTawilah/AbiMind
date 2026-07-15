import { describe, expect, it } from 'vitest';
import {
  computeScoreFromHistory,
  DEFAULT_KNOWLEDGE_SCORE,
  qualityToTarget,
  SCORE_ALPHA,
  selectionWeight,
  updateKnowledgeScore,
} from './knowledgeScore';

describe('qualityToTarget', () => {
  it('mappt 1–5 auf Ziel-Scores', () => {
    expect(qualityToTarget(1)).toBe(5);
    expect(qualityToTarget(5)).toBe(95);
  });
});

describe('updateKnowledgeScore (EMA)', () => {
  it('startet bei neutralem Score 50', () => {
    expect(updateKnowledgeScore(50, 5)).toBe(
      Math.round(SCORE_ALPHA * 95 + (1 - SCORE_ALPHA) * 50),
    );
  });

  it('zieht bei Bewertung 1 stark nach unten', () => {
    const afterOne = updateKnowledgeScore(80, 1);
    expect(afterOne).toBeLessThan(50);
  });

  it('hebt bei Bewertung 5 an', () => {
    const afterFive = updateKnowledgeScore(30, 5);
    expect(afterFive).toBeGreaterThan(30);
  });

  it('klemmt auf 0–100', () => {
    expect(updateKnowledgeScore(0, 1)).toBeGreaterThanOrEqual(0);
    expect(updateKnowledgeScore(100, 5)).toBeLessThanOrEqual(100);
  });
});

describe('computeScoreFromHistory', () => {
  it('bleibt bei 50 ohne Historie', () => {
    expect(computeScoreFromHistory([])).toBe(DEFAULT_KNOWLEDGE_SCORE);
  });

  it('verarbeitet Bewertungen chronologisch', () => {
    let score = DEFAULT_KNOWLEDGE_SCORE;
    for (const q of [5, 5, 1] as const) {
      score = updateKnowledgeScore(score, q);
    }
    expect(computeScoreFromHistory([5, 5, 1])).toBe(score);
  });
});

describe('selectionWeight (Vorschau für nächsten Schritt)', () => {
  it('gibt nie bewerteten Karten maximales Gewicht', () => {
    expect(selectionWeight(50, 0)).toBe(100);
  });

  it('bevorzugt niedrige Scores', () => {
    expect(selectionWeight(10, 3)).toBeGreaterThan(selectionWeight(90, 3));
  });

  it('hat Mindestgewicht für gut gekonnte Karten', () => {
    expect(selectionWeight(99, 10)).toBe(5);
  });
});
