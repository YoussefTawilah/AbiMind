import type { StudyTimeStats, UniversityEvent } from '../types';
import {
  getAllDecks,
  getAllReviewLogs,
  getAllStudySessions,
  getUpcomingUniversityEvents,
} from './repository';
import { computeStreakFromReviewLogs, type StreakStats } from './streak';

export function formatStudyDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} Sek.`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} Min.`;
  const hours = seconds / 3600;
  return `${hours.toFixed(1)} Std.`;
}

export function formatStudyHours(seconds: number): string {
  return `${(seconds / 3600).toFixed(1)} Std.`;
}

/** Tage bis zum Event (0 = heute, negativ = vergangen) */
export function daysUntilEvent(eventDate: string, today = new Date()): number {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const target = new Date(`${eventDate}T00:00:00`);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export function formatCountdown(eventDate: string): string {
  const days = daysUntilEvent(eventDate);
  if (days < 0) return `Vor ${Math.abs(days)} Tag${Math.abs(days) === 1 ? '' : 'en'}`;
  if (days === 0) return 'Heute';
  if (days === 1) return 'Noch 1 Tag';
  return `Noch ${days} Tage`;
}

export async function getStudyTimeStats(): Promise<StudyTimeStats> {
  const [sessions, decks] = await Promise.all([getAllStudySessions(), getAllDecks()]);
  const deckNames = Object.fromEntries(decks.map((d) => [d.id, d.name]));
  const byDeckMap = new Map<string, number>();
  let totalSeconds = 0;

  for (const session of sessions) {
    totalSeconds += session.durationSeconds;
    byDeckMap.set(
      session.deckId,
      (byDeckMap.get(session.deckId) ?? 0) + session.durationSeconds,
    );
  }

  return {
    totalSeconds,
    byDeck: [...byDeckMap.entries()]
      .map(([deckId, seconds]) => ({
        deckId,
        deckName: deckNames[deckId] ?? 'Unbekanntes Deck',
        seconds,
      }))
      .sort((a, b) => b.seconds - a.seconds),
  };
}

export async function getExamPlannerEvents(): Promise<UniversityEvent[]> {
  return getUpcomingUniversityEvents();
}

export async function getStudyStreakStats(): Promise<StreakStats> {
  const logs = await getAllReviewLogs();
  return computeStreakFromReviewLogs(logs);
}

export type { StreakStats } from './streak';
