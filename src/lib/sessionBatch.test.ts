import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
import {
  buildNextSessionBatch,
  formatSessionBatchLabel,
  initDeckSession,
  recordSessionRating,
  SESSION_BATCH_SIZE,
} from './sessionBatch';

function card(id: string, score = 50, reviewCount = 0): Card {
  return {
    id,
    deckId: 'd1',
    front: `Q-${id}`,
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

describe('sessionBatch', () => {
  const deck = Array.from({ length: 10 }, (_, i) => card(String(i + 1)));

  it('Stapel 1 enthält 7 neue Karten in Reihenfolge', () => {
    const state = initDeckSession(deck);
    const { batch, state: next } = buildNextSessionBatch(state);
    expect(batch).toHaveLength(7);
    expect(batch!.map((c) => c.id)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(next.remainingNew).toHaveLength(3);
    expect(next.batchNumber).toBe(1);
  });

  it('Stapel 2 mischt neue und schlecht bewertete Karten', () => {
    let state = initDeckSession(deck);
    const first = buildNextSessionBatch(state);
    state = first.state;

    for (const c of first.batch!) {
      state = recordSessionRating(state, c, 2);
    }

    const second = buildNextSessionBatch(state);
    expect(second.batch).toHaveLength(7);

    const ids = second.batch!.map((c) => c.id);
    const newInBatch = ids.filter((id) => ['8', '9', '10'].includes(id));
    const repeats = ids.filter((id) => ['1', '2', '3', '4', '5', '6', '7'].includes(id));

    expect(newInBatch.length).toBeGreaterThan(0);
    expect(repeats.length).toBeGreaterThan(0);
    expect(newInBatch.length + repeats.length).toBe(7);
  });

  it('schwache Wiederholungs-Karten werden eher früh in gemischten Stapeln gezogen', () => {
    const weak = card('weak', 5, 1);
    const strong = card('strong', 95, 1);
    const extra = card('new', 50, 0);

    let state = initDeckSession([weak, strong]);
    const first = buildNextSessionBatch(state);
    state = recordSessionRating(first.state, weak, 1);
    state = recordSessionRating(state, strong, 5);

    const second = buildNextSessionBatch(state);
    expect(second.batch!.map((c) => c.id)).toContain('weak');

    state = initDeckSession([weak, strong, extra]);
    const batch1 = buildNextSessionBatch(state);
    state = batch1.state;
    for (const c of batch1.batch!) {
      state = recordSessionRating(state, c, 1);
    }

    let weakInEarlyBatch = 0;
    for (let i = 0; i < 30; i++) {
      const s = initDeckSession([weak, strong, extra]);
      let st = buildNextSessionBatch(s).state;
      for (const c of s.orderedDeck.slice(0, 2)) {
        st = recordSessionRating(st, c, 1);
      }
      const b2 = buildNextSessionBatch(st);
      if (b2.batch!.some((c) => c.id === 'weak')) weakInEarlyBatch += 1;
    }
    expect(weakInEarlyBatch).toBeGreaterThan(15);
  });

  it('Session endet wenn alle gesehen und keine schlechten Karten übrig', () => {
    let state = initDeckSession([card('a'), card('b')]);
    const first = buildNextSessionBatch(state);
    state = first.state;
    for (const c of first.batch!) {
      state = recordSessionRating(state, c, 5);
    }
    const done = buildNextSessionBatch(state);
    expect(done.batch).toBeNull();
  });

  it('schlecht bewertete Karten kommen in weiteren Stapeln wieder', () => {
    let state = initDeckSession([card('a')]);
    const first = buildNextSessionBatch(state);
    state = recordSessionRating(first.state, first.batch![0], 1);
    const retry = buildNextSessionBatch(state);
    expect(retry.batch).toHaveLength(1);
    expect(retry.batch![0].id).toBe('a');
    state = recordSessionRating(retry.state, retry.batch![0], 5);
    const done = buildNextSessionBatch(state);
    expect(done.batch).toBeNull();
  });

  it('formatiert Stapel-Label', () => {
    expect(formatSessionBatchLabel(2, 8, 10, SESSION_BATCH_SIZE)).toContain('Stapel 2');
    expect(formatSessionBatchLabel(2, 8, 10, SESSION_BATCH_SIZE)).toContain('8/10');
  });
});
