import { describe, expect, it } from 'vitest';
import type { Card, Deck, ReviewLog } from '../types';
import {
  cardFromRow,
  cardToRow,
  deckFromRow,
  deckToRow,
  reviewLogFromRow,
  reviewLogToRow,
} from './cloudRows';

const USER_ID = '11111111-1111-1111-1111-111111111111';

describe('cloudRows mapping', () => {
  const deck: Deck = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Bio',
    createdAt: '2026-07-14T10:00:00.000Z',
    updatedAt: '2026-07-14T11:00:00.000Z',
  };

  const card: Card = {
    id: '33333333-3333-3333-3333-333333333333',
    deckId: deck.id,
    front: 'Frage',
    back: 'Antwort',
    tag: 'Kapitel 1',
    knowledgeScore: 62,
    reviewCount: 3,
    easinessFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: '2026-07-14',
    createdAt: '2026-07-14T10:00:00.000Z',
    updatedAt: '2026-07-14T10:00:00.000Z',
  };

  const log: ReviewLog = {
    id: '44444444-4444-4444-4444-444444444444',
    cardId: card.id,
    deckId: deck.id,
    quality: 4,
    mode: 'sm2',
    previousKnowledgeScore: 55,
    newKnowledgeScore: 62,
    previousEasinessFactor: 2.5,
    newEasinessFactor: 2.6,
    previousInterval: 0,
    newInterval: 1,
    reviewedAt: '2026-07-14T12:00:00.000Z',
  };

  it('roundtrips deck rows', () => {
    const row = deckToRow(deck, USER_ID);
    expect(row.user_id).toBe(USER_ID);
    expect(deckFromRow(row)).toEqual(deck);
  });

  it('roundtrips card rows with optional tag', () => {
    const row = cardToRow(card, USER_ID);
    expect(row.tag).toBe('Kapitel 1');
    expect(cardFromRow(row)).toEqual(card);

    const withoutTag = cardToRow({ ...card, tag: undefined }, USER_ID);
    expect(withoutTag.tag).toBeNull();
    expect(cardFromRow(withoutTag).tag).toBeUndefined();
  });

  it('roundtrips review log rows', () => {
    const row = reviewLogToRow(log, USER_ID);
    expect(reviewLogFromRow(row)).toEqual(log);
  });
});
