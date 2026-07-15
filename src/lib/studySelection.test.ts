import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
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

describe('buildWeightedStudyQueue', () => {
  it('enthält jede Karte genau einmal', () => {
    const cards = [card('a', 10), card('b', 90), card('c', 50, 0)];
    const queue = buildWeightedStudyQueue(cards);
    expect(queue.map((c) => c.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('bevorzugt statistisch schwache Karten am Anfang', () => {
    const cards = [card('weak', 5), card('strong', 95)];
    let weakFirst = 0;
    const runs = 200;
    for (let i = 0; i < runs; i++) {
      const queue = buildWeightedStudyQueue(cards);
      if (queue[0].id === 'weak') weakFirst += 1;
    }
    expect(weakFirst).toBeGreaterThan(runs * 0.55);
  });
});

describe('averageKnowledgeScore', () => {
  it('berechnet den Durchschnitt', () => {
    expect(averageKnowledgeScore([card('a', 40), card('b', 60)])).toBe(50);
  });

  it('gibt 0 für leeres Deck zurück', () => {
    expect(averageKnowledgeScore([])).toBe(0);
  });
});
