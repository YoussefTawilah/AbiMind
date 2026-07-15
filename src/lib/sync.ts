import type { Card, Deck, Folder, ReviewLog, StudySessionLog, UniversityEvent, UserProfile } from '../types';
import { importAllLocalData, userHasCloudData } from './cloudDb';
import { db, getUserProfile } from './db';

/** Zusammenfassung lokaler Daten für den Import-Dialog */
export interface LocalImportSummary {
  decks: number;
  universityEvents: number;
  studySessions: number;
  total: number;
}

/** Liest alle lokalen IndexedDB-Daten (unabhängig vom aktuellen Modus) */
export async function readAllLocalData(): Promise<{
  folders: Folder[];
  decks: Deck[];
  cards: Card[];
  reviewLogs: ReviewLog[];
  universityEvents: UniversityEvent[];
  studySessions: StudySessionLog[];
  userProfile: UserProfile | null;
}> {
  const [folders, decks, cards, reviewLogs, universityEvents, studySessions, userProfile] =
    await Promise.all([
      db.folders.toArray(),
      db.decks.toArray(),
      db.cards.toArray(),
      db.reviewLogs.toArray(),
      db.universityEvents.toArray(),
      db.studySessions.toArray(),
      getUserProfile(),
    ]);
  return { folders, decks, cards, reviewLogs, universityEvents, studySessions, userProfile };
}

export async function getLocalDeckCount(): Promise<number> {
  return db.decks.count();
}

export async function getLocalImportSummary(): Promise<LocalImportSummary> {
  const [decks, universityEvents, studySessions] = await Promise.all([
    db.decks.count(),
    db.universityEvents.count(),
    db.studySessions.count(),
  ]);
  return {
    decks,
    universityEvents,
    studySessions,
    total: decks + universityEvents + studySessions,
  };
}

export { userHasCloudData, importAllLocalData };
