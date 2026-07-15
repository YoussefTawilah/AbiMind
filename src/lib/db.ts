import Dexie, { type Table } from 'dexie';
import type { Card, Deck, Folder, ReviewLog, ReviewQuality, StudySessionLog, UniversityEvent, UserProfile } from '../types';
import { DEFAULT_KNOWLEDGE_SCORE, updateKnowledgeScore } from './knowledgeScore';
import { deriveKnowledgeFromLogs, defaultKnowledgeFields, normalizeCard } from './migrateCardScores';
import { averageKnowledgeScore, buildWeightedStudyQueue } from './studySelection';
import { createDefaultSm2State, isDue, toDateString } from './sm2';

/** Dexie-Datenbank: lokale IndexedDB-Speicherung */
class AbimindDatabase extends Dexie {
  folders!: Table<Folder, string>;
  decks!: Table<Deck, string>;
  cards!: Table<Card, string>;
  reviewLogs!: Table<ReviewLog, string>;
  universityEvents!: Table<UniversityEvent, string>;
  studySessions!: Table<StudySessionLog, string>;
  userProfiles!: Table<UserProfile, string>;

  constructor() {
    super('abimind');

    this.version(1).stores({
      decks: 'id, name, createdAt',
      cards: 'id, deckId, dueDate, [deckId+dueDate]',
      reviewLogs: 'id, cardId, deckId, reviewedAt',
    });

    this.version(2).stores({
      decks: 'id, name, createdAt',
      cards: 'id, deckId, dueDate, tag, [deckId+dueDate]',
      reviewLogs: 'id, cardId, deckId, reviewedAt',
    });

    this.version(3).stores({
      decks: 'id, name, createdAt',
      cards: 'id, deckId, dueDate, tag, [deckId+dueDate]',
      reviewLogs: 'id, cardId, deckId, reviewedAt, mode',
    }).upgrade((tx) => {
      return tx
        .table('reviewLogs')
        .toCollection()
        .modify((log: ReviewLog) => {
          if (!log.mode) log.mode = 'sm2';
        });
    });

    // Kenntnis-Score statt SM-2 für Lernplanung
    this.version(4).stores({
      decks: 'id, name, createdAt',
      cards: 'id, deckId, dueDate, knowledgeScore, tag, [deckId+dueDate]',
      reviewLogs: 'id, cardId, deckId, reviewedAt, mode',
    }).upgrade(async (tx) => {
      const cards = await tx.table('cards').toArray() as Card[];
      const logs = await tx.table('reviewLogs').toArray() as ReviewLog[];

      for (const card of cards) {
        if (typeof card.knowledgeScore === 'number' && typeof card.reviewCount === 'number') {
          continue;
        }
        const derived = deriveKnowledgeFromLogs(logs, card.id);
        await tx.table('cards').update(card.id, derived);
      }

      // Alte ReviewLogs: fehlende Score-Felder nachrüsten
      for (const log of logs) {
        if (
          typeof log.previousKnowledgeScore === 'number' &&
          typeof log.newKnowledgeScore === 'number'
        ) {
          continue;
        }
        await tx.table('reviewLogs').update(log.id, {
          previousKnowledgeScore: log.previousKnowledgeScore ?? DEFAULT_KNOWLEDGE_SCORE,
          newKnowledgeScore: log.newKnowledgeScore ?? DEFAULT_KNOWLEDGE_SCORE,
        });
      }
    });

    // Ordner für Deck-Organisation
    this.version(5).stores({
      folders: 'id, name, createdAt',
      decks: 'id, name, folderId, createdAt',
      cards: 'id, deckId, dueDate, knowledgeScore, tag, [deckId+dueDate]',
      reviewLogs: 'id, cardId, deckId, reviewedAt, mode',
    });

    // Uni-Events + Lernzeit-Tracking
    this.version(6).stores({
      folders: 'id, name, createdAt',
      decks: 'id, name, folderId, createdAt',
      cards: 'id, deckId, dueDate, knowledgeScore, tag, [deckId+dueDate]',
      reviewLogs: 'id, cardId, deckId, reviewedAt, mode',
      universityEvents: 'id, eventDate, createdAt',
      studySessions: 'id, deckId, endedAt, createdAt',
    });

    // Abitur-Profil (Singleton-Zeile mit id = 'default')
    this.version(7).stores({
      folders: 'id, name, createdAt',
      decks: 'id, name, folderId, createdAt',
      cards: 'id, deckId, dueDate, knowledgeScore, tag, [deckId+dueDate]',
      reviewLogs: 'id, cardId, deckId, reviewedAt, mode',
      universityEvents: 'id, eventDate, createdAt',
      studySessions: 'id, deckId, endedAt, createdAt',
      userProfiles: 'id',
    });
  }
}

export const db = new AbimindDatabase();

function newId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function legacySm2Fields() {
  return createDefaultSm2State();
}

// ── Ordner ───────────────────────────────────────────────────────

export async function getAllFolders(): Promise<Folder[]> {
  return db.folders.orderBy('name').toArray();
}

export async function createFolder(name: string): Promise<Folder> {
  const timestamp = now();
  const folder: Folder = {
    id: newId(),
    name: name.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.folders.add(folder);
  return folder;
}

export async function renameFolder(id: string, name: string): Promise<void> {
  await db.folders.update(id, { name: name.trim(), updatedAt: now() });
}

export async function deleteFolder(id: string): Promise<void> {
  await db.transaction('rw', db.folders, db.decks, async () => {
    const decksInFolder = await db.decks.where('folderId').equals(id).toArray();
    for (const deck of decksInFolder) {
      await db.decks.update(deck.id, { folderId: undefined, updatedAt: now() });
    }
    await db.folders.delete(id);
  });
}

export async function setDeckFolder(deckId: string, folderId: string | null): Promise<void> {
  await db.decks.update(deckId, {
    folderId: folderId ?? undefined,
    updatedAt: now(),
  });
}

// ── Decks ────────────────────────────────────────────────────────

export async function getAllDecks(): Promise<Deck[]> {
  return db.decks.orderBy('name').toArray();
}

export async function getDeck(id: string): Promise<Deck | undefined> {
  return db.decks.get(id);
}

export async function createDeck(name: string): Promise<Deck> {
  const timestamp = now();
  const deck: Deck = {
    id: newId(),
    name: name.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.decks.add(deck);
  return deck;
}

export async function renameDeck(id: string, name: string): Promise<void> {
  await db.decks.update(id, { name: name.trim(), updatedAt: now() });
}

export async function deleteDeck(id: string): Promise<void> {
  await db.transaction('rw', db.decks, db.cards, db.reviewLogs, async () => {
    await db.cards.where('deckId').equals(id).delete();
    await db.reviewLogs.where('deckId').equals(id).delete();
    await db.decks.delete(id);
  });
}

// ── Karten ───────────────────────────────────────────────────────

export async function getCardsByDeck(deckId: string): Promise<Card[]> {
  const cards = await db.cards.where('deckId').equals(deckId).toArray();
  return cards.map((c) => normalizeCard(c));
}

export async function getCard(id: string): Promise<Card | undefined> {
  const card = await db.cards.get(id);
  return card ? normalizeCard(card) : undefined;
}

export async function getDueCards(deckId: string, today = toDateString()): Promise<Card[]> {
  const cards = await getCardsByDeck(deckId);
  return cards.filter((c) => isDue(c, today));
}

/** Lernmodus: gewichtete Zufallsreihenfolge aller Deck-Karten */
export async function getStudyQueue(deckId: string): Promise<Card[]> {
  const cards = await getCardsByDeck(deckId);
  return buildWeightedStudyQueue(cards);
}

export async function getAverageKnowledgeScoreByDeck(deckId: string): Promise<number> {
  const cards = await getCardsByDeck(deckId);
  return averageKnowledgeScore(cards);
}

export async function getGlobalAverageKnowledgeScore(): Promise<number> {
  const cards = await getAllCards();
  return averageKnowledgeScore(cards);
}

export async function createCard(
  deckId: string,
  front: string,
  back: string,
  tag?: string,
): Promise<Card> {
  const timestamp = now();
  const knowledge = defaultKnowledgeFields();
  const legacy = legacySm2Fields();
  const card: Card = {
    id: newId(),
    deckId,
    front: front.trim(),
    back: back.trim(),
    tag: tag?.trim() || undefined,
    ...knowledge,
    ...legacy,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.cards.add(card);
  await db.decks.update(deckId, { updatedAt: timestamp });
  return card;
}

export async function updateCard(
  id: string,
  data: Pick<Card, 'front' | 'back'> & { tag?: string },
): Promise<void> {
  await db.cards.update(id, {
    front: data.front.trim(),
    back: data.back.trim(),
    ...(data.tag !== undefined ? { tag: data.tag.trim() || undefined } : {}),
    updatedAt: now(),
  });
}

/** Speichert mehrere KI-generierte Karten auf einmal */
export async function createCardsBulk(
  deckId: string,
  items: { front: string; back: string; tag?: string }[],
): Promise<number> {
  const timestamp = now();
  const knowledge = defaultKnowledgeFields();
  const legacy = legacySm2Fields();
  const toInsert: Card[] = items.map((item) => ({
    id: newId(),
    deckId,
    front: item.front.trim(),
    back: item.back.trim(),
    tag: item.tag?.trim() || undefined,
    ...knowledge,
    ...legacy,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
  await db.cards.bulkAdd(toInsert);
  await db.decks.update(deckId, { updatedAt: timestamp });
  return toInsert.length;
}

export async function deleteCard(id: string): Promise<void> {
  const card = await db.cards.get(id);
  if (!card) return;
  await db.transaction('rw', db.cards, db.reviewLogs, async () => {
    await db.reviewLogs.where('cardId').equals(id).delete();
    await db.cards.delete(id);
  });
  await db.decks.update(card.deckId, { updatedAt: now() });
}

export async function getAllReviewLogs(): Promise<ReviewLog[]> {
  return db.reviewLogs.orderBy('reviewedAt').toArray();
}

/** Bewertet eine Karte und speichert SM-2-Ergebnis + ReviewLog */
export async function reviewCard(
  cardId: string,
  quality: ReviewQuality,
  _today = toDateString(),
): Promise<Card> {
  const card = await db.cards.get(cardId);
  if (!card) throw new Error(`Karte ${cardId} nicht gefunden`);
  const normalized = normalizeCard(card);

  const newScore = updateKnowledgeScore(normalized.knowledgeScore, quality);
  const timestamp = now();

  const log: ReviewLog = {
    id: newId(),
    cardId: normalized.id,
    deckId: normalized.deckId,
    quality,
    mode: 'sm2',
    previousKnowledgeScore: normalized.knowledgeScore,
    newKnowledgeScore: newScore,
    previousEasinessFactor: normalized.easinessFactor,
    newEasinessFactor: normalized.easinessFactor,
    previousInterval: normalized.interval,
    newInterval: normalized.interval,
    reviewedAt: timestamp,
  };

  const updated: Card = {
    ...normalized,
    knowledgeScore: newScore,
    reviewCount: normalized.reviewCount + 1,
    updatedAt: timestamp,
  };

  await db.transaction('rw', db.cards, db.reviewLogs, async () => {
    await db.cards.put(updated);
    await db.reviewLogs.add(log);
  });

  return updated;
}

/** Importiert Karten in ein Deck (CSV-Import) */
export async function importCards(deckId: string, cards: Omit<Card, 'id' | 'deckId' | 'createdAt' | 'updatedAt'>[]): Promise<number> {
  const timestamp = now();
  const toInsert: Card[] = cards.map((c) => ({
    ...c,
    id: newId(),
    deckId,
    knowledgeScore: c.knowledgeScore ?? defaultKnowledgeFields().knowledgeScore,
    reviewCount: c.reviewCount ?? 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
  await db.cards.bulkAdd(toInsert);
  await db.decks.update(deckId, { updatedAt: timestamp });
  return toInsert.length;
}

export async function getAllCards(): Promise<Card[]> {
  const cards = await db.cards.toArray();
  return cards.map((c) => normalizeCard(c));
}

export async function getCardCountByDeck(deckId: string): Promise<number> {
  return db.cards.where('deckId').equals(deckId).count();
}

export async function getDueCountByDeck(deckId: string, today = toDateString()): Promise<number> {
  const cards = await getCardsByDeck(deckId);
  return cards.filter((c) => isDue(c, today)).length;
}

export async function getLearnedCountByDeck(deckId: string): Promise<number> {
  const cards = await getCardsByDeck(deckId);
  return cards.filter((c) => c.repetitions > 0).length;
}

export async function getTotalDueToday(today = toDateString()): Promise<number> {
  const cards = await db.cards.toArray();
  return cards.filter((c) => isDue(c, today)).length;
}

/** Frühestes zukünftiges Fälligkeitsdatum in einem Deck (null = keine Karten) */
export async function getNextDueDateForDeck(
  deckId: string,
  today = toDateString(),
): Promise<string | null> {
  const cards = await getCardsByDeck(deckId);
  if (cards.length === 0) return null;

  const futureDates = cards
    .map((c) => c.dueDate)
    .filter((d) => d > today)
    .sort();

  if (futureDates.length > 0) return futureDates[0];

  // Alle Karten sind heute fällig → kein zukünftiges Datum
  return null;
}

export interface DeckStudyStatus {
  totalCards: number;
  averageKnowledgeScore: number;
}

export async function getDeckStudyStatus(deckId: string): Promise<DeckStudyStatus> {
  const cards = await getCardsByDeck(deckId);
  return {
    totalCards: cards.length,
    averageKnowledgeScore: averageKnowledgeScore(cards),
  };
}

// ── Uni-Events ───────────────────────────────────────────────────

export async function getAllUniversityEvents(): Promise<UniversityEvent[]> {
  return db.universityEvents.orderBy('eventDate').toArray();
}

export async function getUpcomingUniversityEvents(fromDate = toDateString()): Promise<UniversityEvent[]> {
  const all = await getAllUniversityEvents();
  return all.filter((e) => e.eventDate >= fromDate);
}

export async function createUniversityEvent(
  data: Pick<UniversityEvent, 'title' | 'eventDate'> & Partial<Pick<UniversityEvent, 'subject' | 'notes'>>,
): Promise<UniversityEvent> {
  const timestamp = now();
  const event: UniversityEvent = {
    id: newId(),
    title: data.title.trim(),
    eventDate: data.eventDate,
    subject: data.subject?.trim() || undefined,
    notes: data.notes?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.universityEvents.add(event);
  return event;
}

export async function updateUniversityEvent(
  id: string,
  data: Partial<Pick<UniversityEvent, 'title' | 'eventDate' | 'subject' | 'notes'>>,
): Promise<void> {
  const patch: Partial<UniversityEvent> = { updatedAt: now() };
  if (data.title !== undefined) patch.title = data.title.trim();
  if (data.eventDate !== undefined) patch.eventDate = data.eventDate;
  if (data.subject !== undefined) patch.subject = data.subject.trim() || undefined;
  if (data.notes !== undefined) patch.notes = data.notes.trim() || undefined;
  await db.universityEvents.update(id, patch);
}

export async function deleteUniversityEvent(id: string): Promise<void> {
  await db.universityEvents.delete(id);
}

// ── Lernzeit-Sessions ────────────────────────────────────────────

export async function getAllStudySessions(): Promise<StudySessionLog[]> {
  return db.studySessions.orderBy('endedAt').reverse().toArray();
}

export async function getStudySessionsByDeck(deckId: string): Promise<StudySessionLog[]> {
  return db.studySessions.where('deckId').equals(deckId).toArray();
}

export async function logStudySession(deckId: string, durationSeconds: number): Promise<StudySessionLog> {
  const timestamp = now();
  const session: StudySessionLog = {
    id: newId(),
    deckId,
    durationSeconds: Math.max(1, Math.round(durationSeconds)),
    endedAt: timestamp,
    createdAt: timestamp,
  };
  await db.studySessions.add(session);
  return session;
}

// ── Abitur-Profil ────────────────────────────────────────────────

const LOCAL_PROFILE_ID = 'default';

export async function getUserProfile(): Promise<UserProfile | null> {
  return (await db.userProfiles.get(LOCAL_PROFILE_ID)) ?? null;
}

/** Lokales Profil (IndexedDB) – unabhängig vom Cloud-Modus */
export async function getLocalUserProfile(): Promise<UserProfile | null> {
  return getUserProfile();
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await db.userProfiles.put(profile);
}
