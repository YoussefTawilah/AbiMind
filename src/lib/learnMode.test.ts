import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
import { selectionWeight, updateKnowledgeScore } from './knowledgeScore';
import { averageKnowledgeScore, buildWeightedStudyQueue } from './studySelection';

function card(id: string, score: number, reviewCount = 1): Card {
  return {
    id,
    deckId: 'd1',
    front: 'Q',
    back: 'A',
    knowledgeScore: score,
    reviewCount,
    easinessFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: '2026-07-14',
    createdAt: '2026-07-14T10:00:00.000Z',
    updatedAt: '2026-07-14T10:00:00.000Z',
  };
}

/**
 * Simuliert den Datenfluss nach reviewCard(): Score wird dauerhaft aktualisiert,
 * Durchschnitt und gewichtete Auswahl reagieren darauf.
 */
describe('Lernmodus: Score → Analytics & Auswahl', () => {
  it('hebt den Deck-Durchschnitt nach guter Bewertung an', () => {
    const cards = [card('a', 50), card('b', 50)];
    cards[0].knowledgeScore = updateKnowledgeScore(cards[0].knowledgeScore, 5);
    cards[0].reviewCount += 1;

    expect(averageKnowledgeScore(cards)).toBeGreaterThan(50);
    expect(averageKnowledgeScore([card('a', 50), card('b', 50)])).toBe(50);
  });

  it('erhöht das Auswahl-Gewicht nach schlechter Bewertung', () => {
    const before = selectionWeight(80, 3);
    const afterScore = updateKnowledgeScore(80, 1);
    const after = selectionWeight(afterScore, 4);

    expect(after).toBeGreaterThan(before);
  });

  it('bevorzugt nach Score-Update statistisch schwächere Karten in der Queue', () => {
    const weak = card('weak', 80);
    const strong = card('strong', 80);

    weak.knowledgeScore = updateKnowledgeScore(weak.knowledgeScore, 1);
    weak.reviewCount += 1;
    strong.knowledgeScore = updateKnowledgeScore(strong.knowledgeScore, 5);
    strong.reviewCount += 1;

    let weakFirst = 0;
    const runs = 200;
    for (let i = 0; i < runs; i++) {
      const queue = buildWeightedStudyQueue([weak, strong]);
      if (queue[0].id === 'weak') weakFirst += 1;
    }
    expect(weakFirst).toBeGreaterThan(runs * 0.55);
  });
});
