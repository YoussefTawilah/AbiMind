import type { Card, Deck, Folder, ReviewLog, StudySessionLog, UniversityEvent, UserProfile } from '../types';
import { DEFAULT_KNOWLEDGE_SCORE } from './knowledgeScore';
import { normalizeCard } from './migrateCardScores';

/** Postgres-Zeilen (snake_case) ↔ App-Typen (camelCase) */

export interface FolderRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface DeckRow {
  id: string;
  user_id: string;
  name: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardRow {
  id: string;
  user_id: string;
  deck_id: string;
  front: string;
  back: string;
  tag: string | null;
  knowledge_score: number;
  review_count: number;
  easiness_factor: number;
  interval: number;
  repetitions: number;
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewLogRow {
  id: string;
  user_id: string;
  card_id: string;
  deck_id: string;
  quality: number;
  mode: string;
  previous_knowledge_score: number;
  new_knowledge_score: number;
  previous_easiness_factor: number;
  new_easiness_factor: number;
  previous_interval: number;
  new_interval: number;
  reviewed_at: string;
}

export interface UniversityEventRow {
  id: string;
  user_id: string;
  title: string;
  event_date: string;
  subject: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudySessionRow {
  id: string;
  user_id: string;
  deck_id: string;
  duration_seconds: number;
  ended_at: string;
  created_at: string;
}

export interface UserProfileRow {
  user_id: string;
  bundesland: string | null;
  abitur_year: number | null;
  first_written_exam_date: string | null;
  linked_university_event_id: string | null;
  onboarding_dismissed: boolean;
  created_at: string;
  updated_at: string;
}

export function folderFromRow(row: FolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function folderToRow(folder: Folder, userId: string): FolderRow {
  return {
    id: folder.id,
    user_id: userId,
    name: folder.name,
    created_at: folder.createdAt,
    updated_at: folder.updatedAt,
  };
}

export function deckFromRow(row: DeckRow): Deck {
  return {
    id: row.id,
    name: row.name,
    folderId: row.folder_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function deckToRow(deck: Deck, userId: string): DeckRow {
  return {
    id: deck.id,
    user_id: userId,
    name: deck.name,
    folder_id: deck.folderId ?? null,
    created_at: deck.createdAt,
    updated_at: deck.updatedAt,
  };
}

export function cardFromRow(row: CardRow): Card {
  return normalizeCard({
    id: row.id,
    deckId: row.deck_id,
    front: row.front,
    back: row.back,
    tag: row.tag ?? undefined,
    knowledgeScore: row.knowledge_score ?? DEFAULT_KNOWLEDGE_SCORE,
    reviewCount: row.review_count ?? 0,
    easinessFactor: row.easiness_factor,
    interval: row.interval,
    repetitions: row.repetitions,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function cardToRow(card: Card, userId: string): CardRow {
  return {
    id: card.id,
    user_id: userId,
    deck_id: card.deckId,
    front: card.front,
    back: card.back,
    tag: card.tag ?? null,
    knowledge_score: card.knowledgeScore,
    review_count: card.reviewCount,
    easiness_factor: card.easinessFactor,
    interval: card.interval,
    repetitions: card.repetitions,
    due_date: card.dueDate,
    created_at: card.createdAt,
    updated_at: card.updatedAt,
  };
}

export function reviewLogFromRow(row: ReviewLogRow): ReviewLog {
  return {
    id: row.id,
    cardId: row.card_id,
    deckId: row.deck_id,
    quality: row.quality as ReviewLog['quality'],
    mode: row.mode as ReviewLog['mode'],
    previousKnowledgeScore: row.previous_knowledge_score ?? DEFAULT_KNOWLEDGE_SCORE,
    newKnowledgeScore: row.new_knowledge_score ?? DEFAULT_KNOWLEDGE_SCORE,
    previousEasinessFactor: row.previous_easiness_factor,
    newEasinessFactor: row.new_easiness_factor,
    previousInterval: row.previous_interval,
    newInterval: row.new_interval,
    reviewedAt: row.reviewed_at,
  };
}

export function reviewLogToRow(log: ReviewLog, userId: string): ReviewLogRow {
  return {
    id: log.id,
    user_id: userId,
    card_id: log.cardId,
    deck_id: log.deckId,
    quality: log.quality,
    mode: log.mode,
    previous_knowledge_score: log.previousKnowledgeScore,
    new_knowledge_score: log.newKnowledgeScore,
    previous_easiness_factor: log.previousEasinessFactor,
    new_easiness_factor: log.newEasinessFactor,
    previous_interval: log.previousInterval,
    new_interval: log.newInterval,
    reviewed_at: log.reviewedAt,
  };
}

export function universityEventFromRow(row: UniversityEventRow): UniversityEvent {
  return {
    id: row.id,
    title: row.title,
    eventDate: row.event_date,
    subject: row.subject ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function universityEventToRow(event: UniversityEvent, userId: string): UniversityEventRow {
  return {
    id: event.id,
    user_id: userId,
    title: event.title,
    event_date: event.eventDate,
    subject: event.subject ?? null,
    notes: event.notes ?? null,
    created_at: event.createdAt,
    updated_at: event.updatedAt,
  };
}

export function studySessionFromRow(row: StudySessionRow): StudySessionLog {
  return {
    id: row.id,
    deckId: row.deck_id,
    durationSeconds: row.duration_seconds,
    endedAt: row.ended_at,
    createdAt: row.created_at,
  };
}

export function studySessionToRow(session: StudySessionLog, userId: string): StudySessionRow {
  return {
    id: session.id,
    user_id: userId,
    deck_id: session.deckId,
    duration_seconds: session.durationSeconds,
    ended_at: session.endedAt,
    created_at: session.createdAt,
  };
}

export function userProfileFromRow(row: UserProfileRow): UserProfile {
  return {
    id: row.user_id,
    bundesland: row.bundesland ?? undefined,
    abiturYear: row.abitur_year ?? undefined,
    firstWrittenExamDate: row.first_written_exam_date ?? undefined,
    linkedUniversityEventId: row.linked_university_event_id ?? undefined,
    onboardingDismissed: row.onboarding_dismissed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function userProfileToRow(profile: UserProfile, userId: string): UserProfileRow {
  return {
    user_id: userId,
    bundesland: profile.bundesland ?? null,
    abitur_year: profile.abiturYear ?? null,
    first_written_exam_date: profile.firstWrittenExamDate ?? null,
    linked_university_event_id: profile.linkedUniversityEventId ?? null,
    onboarding_dismissed: profile.onboardingDismissed,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}
