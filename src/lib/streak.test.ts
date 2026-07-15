import { describe, expect, it } from 'vitest';
import type { ReviewLog } from '../types';
import {
  addLocalDays,
  computeStreakFromReviewLogs,
  computeStreakStats,
  extractStudyDayKeys,
} from './streak';

function log(reviewedAt: string, mode: ReviewLog['mode'] = 'sm2'): ReviewLog {
  return {
    id: '1',
    cardId: 'c',
    deckId: 'd',
    quality: 4,
    mode,
    previousKnowledgeScore: 50,
    newKnowledgeScore: 60,
    previousEasinessFactor: 2.5,
    newEasinessFactor: 2.5,
    previousInterval: 0,
    newInterval: 1,
    reviewedAt,
  };
}

describe('extractStudyDayKeys', () => {
  it('ignoriert practice-Modus', () => {
    const days = extractStudyDayKeys([
      log('2026-07-14T22:00:00.000Z', 'practice'),
      log('2026-07-14T10:00:00.000Z', 'sm2'),
    ]);
    expect(days).toHaveLength(1);
  });
});

describe('computeStreakStats', () => {
  it('zählt aktuelle Serie bis heute', () => {
    const stats = computeStreakStats(
      ['2026-07-12', '2026-07-13', '2026-07-14'],
      '2026-07-14',
    );
    expect(stats.currentStreak).toBe(3);
    expect(stats.longestStreak).toBe(3);
    expect(stats.studiedToday).toBe(true);
  });

  it('zählt Serie bis gestern, wenn heute noch nicht gelernt wurde', () => {
    const stats = computeStreakStats(
      ['2026-07-12', '2026-07-13', '2026-07-14'],
      '2026-07-15',
    );
    expect(stats.currentStreak).toBe(3);
    expect(stats.studiedToday).toBe(false);
  });

  it('bricht Serie, wenn gestern ausgelassen wurde', () => {
    const stats = computeStreakStats(['2026-07-12', '2026-07-13'], '2026-07-15');
    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(2);
  });

  it('findet längste Serie in der Historie', () => {
    const stats = computeStreakStats(
      ['2026-07-01', '2026-07-02', '2026-07-10', '2026-07-11', '2026-07-12'],
      '2026-07-15',
    );
    expect(stats.longestStreak).toBe(3);
    expect(stats.currentStreak).toBe(0);
  });
});

describe('addLocalDays', () => {
  it('verschiebt lokale Datumsstrings', () => {
    expect(addLocalDays('2026-07-14', -1)).toBe('2026-07-13');
  });
});

describe('computeStreakFromReviewLogs', () => {
  it('gruppiert Bewertungen nach lokalem Tag', () => {
    const stats = computeStreakFromReviewLogs(
      [
        log('2026-07-14T08:00:00.000Z'),
        log('2026-07-14T20:00:00.000Z'),
        log('2026-07-13T15:00:00.000Z'),
      ],
      '2026-07-14',
    );
    expect(stats.currentStreak).toBe(2);
  });
});
