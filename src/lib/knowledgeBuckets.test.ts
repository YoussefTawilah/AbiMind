import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
import { buildKnowledgeBoxSlices, totalCardsInSlices } from './knowledgeBuckets';

function card(score: number, reviewCount: number): Card {
  return {
    id: '1',
    deckId: 'd',
    front: 'Q',
    back: 'A',
    knowledgeScore: score,
    reviewCount,
    easinessFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: '2026-07-14',
    createdAt: '2026-07-14',
    updatedAt: '2026-07-14',
  };
}

describe('buildKnowledgeBoxSlices', () => {
  it('verteilt Karten auf Neu, Aktiv und Beherrscht', () => {
    const slices = buildKnowledgeBoxSlices([
      card(50, 0),
      card(60, 2),
      card(90, 5),
    ]);
    expect(slices.find((s) => s.name === 'Neu')?.value).toBe(1);
    expect(slices.find((s) => s.name === 'Aktiv')?.value).toBe(1);
    expect(slices.find((s) => s.name === 'Beherrscht')?.value).toBe(1);
    expect(slices.find((s) => s.name === 'Neu')?.fill).toBe('#f97316');
    expect(slices.find((s) => s.name === 'Aktiv')?.fill).toBe('#facc15');
    expect(slices.find((s) => s.name === 'Beherrscht')?.fill).toBe('#22c55e');
  });

  it('summiert die Gesamtzahl der Karten', () => {
    const slices = buildKnowledgeBoxSlices([card(50, 0), card(90, 3)]);
    expect(totalCardsInSlices(slices)).toBe(2);
  });
});
