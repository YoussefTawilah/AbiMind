import type { ReviewLog } from '../types';

export interface StreakStats {
  /** Aufeinanderfolgende Lerntage (heute oder bis gestern, wenn heute noch offen) */
  currentStreak: number;
  /** Längste je erreichte Serie */
  longestStreak: number;
  /** Mindestens eine Lernmodus-Bewertung heute (lokaler Kalendertag) */
  studiedToday: boolean;
}

/** ISO-Zeitstempel → lokaler Kalendertag (YYYY-MM-DD, Browser-Zeitzone) */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Verschiebt ein lokales Datum um `delta` Tage */
export function addLocalDays(dateKey: string, delta: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + delta);
  return toLocalDateKey(date);
}

function isConsecutiveDay(previous: string, next: string): boolean {
  return addLocalDays(previous, 1) === next;
}

/** Einzigartige Lerntage aus ReviewLogs (nur Lernmodus-Bewertungen) */
export function extractStudyDayKeys(logs: ReviewLog[]): string[] {
  const days = new Set<string>();
  for (const log of logs) {
    if (log.mode !== 'sm2') continue;
    days.add(toLocalDateKey(new Date(log.reviewedAt)));
  }
  return [...days];
}

export function computeStreakStats(studyDays: string[], today = toLocalDateKey(new Date())): StreakStats {
  const daySet = new Set(studyDays);
  const sorted = [...daySet].sort();

  let longestStreak = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    if (previous && isConsecutiveDay(previous, day)) {
      run += 1;
    } else {
      run = 1;
    }
    longestStreak = Math.max(longestStreak, run);
    previous = day;
  }

  const studiedToday = daySet.has(today);
  const yesterday = addLocalDays(today, -1);
  const anchor = studiedToday ? today : daySet.has(yesterday) ? yesterday : null;

  let currentStreak = 0;
  if (anchor) {
    let cursor = anchor;
    while (daySet.has(cursor)) {
      currentStreak += 1;
      cursor = addLocalDays(cursor, -1);
    }
  }

  return { currentStreak, longestStreak, studiedToday };
}

export function computeStreakFromReviewLogs(
  logs: ReviewLog[],
  today = toLocalDateKey(new Date()),
): StreakStats {
  return computeStreakStats(extractStudyDayKeys(logs), today);
}
