import { describe, expect, it } from 'vitest';
import type { Card, ReviewLog } from '../types';
import { computeScoreFromHistory } from './knowledgeScore';
import { deriveKnowledgeFromLogs, normalizeCard } from './migrateCardScores';

describe('normalizeCard', () => {
  it('füllt fehlende knowledgeScore-Felder auf', () => {
    const partial = {
      id: '1',
      deckId: 'd1',
      front: 'Q',
      back: 'A',
      easinessFactor: 2.5,
      interval: 0,
      repetitions: 0,
      dueDate: '2026-07-14',
      createdAt: '2026-07-14T10:00:00.000Z',
      updatedAt: '2026-07-14T10:00:00.000Z',
    } as Card;

    const normalized = normalizeCard(partial);
    expect(normalized.knowledgeScore).toBe(50);
    expect(normalized.reviewCount).toBe(0);
  });
});

describe('deriveKnowledgeFromLogs', () => {
  const cardId = 'card-1';

  it('gibt 50/0 ohne Historie zurück', () => {
    expect(deriveKnowledgeFromLogs([], cardId)).toEqual({
      knowledgeScore: 50,
      reviewCount: 0,
    });
  });

  it('ignoriert practice-Logs', () => {
    const logs: ReviewLog[] = [
      {
        id: '1',
        cardId,
        deckId: 'deck-1',
        quality: 5,
        mode: 'practice',
        previousKnowledgeScore: 50,
        newKnowledgeScore: 50,
        previousEasinessFactor: 2.5,
        newEasinessFactor: 2.5,
        previousInterval: 0,
        newInterval: 0,
        reviewedAt: '2026-07-14T10:00:00.000Z',
      },
    ];
    expect(deriveKnowledgeFromLogs(logs, cardId).reviewCount).toBe(0);
  });

  it('berechnet Score aus SM-2-Historie chronologisch', () => {
    const logs: ReviewLog[] = [
      {
        id: '1',
        cardId,
        deckId: 'deck-1',
        quality: 5,
        mode: 'sm2',
        previousKnowledgeScore: 50,
        newKnowledgeScore: 70,
        previousEasinessFactor: 2.5,
        newEasinessFactor: 2.5,
        previousInterval: 0,
        newInterval: 0,
        reviewedAt: '2026-07-14T10:00:00.000Z',
      },
      {
        id: '2',
        cardId,
        deckId: 'deck-1',
        quality: 1,
        mode: 'sm2',
        previousKnowledgeScore: 70,
        newKnowledgeScore: 30,
        previousEasinessFactor: 2.5,
        newEasinessFactor: 2.5,
        previousInterval: 0,
        newInterval: 0,
        reviewedAt: '2026-07-14T11:00:00.000Z',
      },
    ];
    const result = deriveKnowledgeFromLogs(logs, cardId);
    expect(result.reviewCount).toBe(2);
    expect(result.knowledgeScore).toBe(computeScoreFromHistory([5, 1]));
  });
});
