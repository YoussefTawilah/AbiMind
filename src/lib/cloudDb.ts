import type { Card, Deck, Folder, ReviewLog, ReviewQuality, StudySessionLog, UniversityEvent, UserProfile } from '../types';
import { getCloudUserId, isCloudMode } from './dataSource';
import {
  cardFromRow,
  cardToRow,
  deckFromRow,
  deckToRow,
  folderFromRow,
  folderToRow,
  reviewLogFromRow,
  reviewLogToRow,
  studySessionFromRow,
  studySessionToRow,
  universityEventFromRow,
  universityEventToRow,
  userProfileFromRow,
  userProfileToRow,
  type CardRow,
  type DeckRow,
  type FolderRow,
  type ReviewLogRow,
  type StudySessionRow,
  type UniversityEventRow,
  type UserProfileRow,
} from './cloudRows';
import { updateKnowledgeScore } from './knowledgeScore';
import { deriveKnowledgeFromLogs, defaultKnowledgeFields, normalizeCard } from './migrateCardScores';
import { averageKnowledgeScore, buildWeightedStudyQueue } from './studySelection';
import { createDefaultSm2State, isDue, toDateString } from './sm2';
import { supabase } from './supabase';

const CHUNK_SIZE = 500;

/** Hinweis wenn die Ordner-Migration in Supabase noch nicht ausgeführt wurde */
export const FOLDER_MIGRATION_HINT =
  'Ordner-Migration fehlt in Supabase. Führe die Datei supabase/migrations/20260714140000_folders.sql im Supabase SQL-Editor aus.';

type PostgrestError = { code?: string; message?: string };

function isMissingRelation(error: PostgrestError): boolean {
  return error.code === '42P01' || /relation .+ does not exist/i.test(error.message ?? '');
}

function isMissingColumn(error: PostgrestError): boolean {
  return error.code === '42703' || /column .+ does not exist/i.test(error.message ?? '');
}

function isFoldersTableMissing(error: PostgrestError): boolean {
  return isMissingRelation(error) && (error.message?.includes('folders') ?? false);
}

function isFolderIdColumnMissing(error: PostgrestError): boolean {
  return isMissingColumn(error) && (error.message?.includes('folder_id') ?? false);
}

function formatCloudError(error: PostgrestError, context: string): Error {
  if (isFoldersTableMissing(error) || isFolderIdColumnMissing(error)) {
    return new Error(FOLDER_MIGRATION_HINT);
  }
  return new Error(`${context}: ${error.message ?? 'Unbekannter Fehler'}`);
}

async function insertDeckRow(
  client: ReturnType<typeof requireClient>,
  row: DeckRow,
): Promise<void> {
  const { error } = await client.from('decks').insert(row);
  if (!error) return;

  if (isFolderIdColumnMissing(error)) {
    const { folder_id: _omit, ...legacyRow } = row;
    const retry = await client.from('decks').insert(legacyRow);
    if (retry.error) throw formatCloudError(retry.error, 'Deck speichern');
    return;
  }

  throw formatCloudError(error, 'Deck speichern');
}

function requireClient() {
  if (!supabase) throw new Error('Supabase ist nicht konfiguriert.');
  return supabase;
}

function requireUserId(): string {
  const userId = getCloudUserId();
  if (!userId) throw new Error('Cloud-Operationen erfordern einen eingeloggten Nutzer.');
  return userId;
}

function newId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function defaultCardRowFields(): Pick<
  CardRow,
  | 'knowledge_score'
  | 'review_count'
  | 'easiness_factor'
  | 'interval'
  | 'repetitions'
  | 'due_date'
> {
  const knowledge = defaultKnowledgeFields();
  const legacy = createDefaultSm2State();
  return {
    knowledge_score: knowledge.knowledgeScore,
    review_count: knowledge.reviewCount,
    easiness_factor: legacy.easinessFactor,
    interval: legacy.interval,
    repetitions: legacy.repetitions,
    due_date: legacy.dueDate,
  };
}

/** Leitet Kenntnis-Scores aus ReviewLog-Historie ab (Cloud-Migration) */
export async function migrateCloudCardScores(): Promise<number> {
  const client = requireClient();
  const [{ data: cardRows, error: cardError }, { data: logRows, error: logError }] =
    await Promise.all([
      client.from('cards').select('*'),
      client.from('review_logs').select('*'),
    ]);
  if (cardError) throw cardError;
  if (logError) throw logError;

  const reviewLogs = (logRows ?? []).map((row) => reviewLogFromRow(row as ReviewLogRow));
  let updated = 0;

  for (const row of cardRows ?? []) {
    const card = cardFromRow(row as CardRow);
    const derived = deriveKnowledgeFromLogs(reviewLogs, card.id);
    if (
      typeof card.knowledgeScore === 'number' &&
      typeof card.reviewCount === 'number' &&
      card.knowledgeScore === derived.knowledgeScore &&
      card.reviewCount === derived.reviewCount
    ) {
      continue;
    }
    const { error } = await client
      .from('cards')
      .update({
        knowledge_score: derived.knowledgeScore,
        review_count: derived.reviewCount,
      })
      .eq('id', card.id);
    if (error) throw error;
    updated += 1;
  }

  return updated;
}

async function insertFolderChunk(rows: FolderRow[]): Promise<void> {
  const client = requireClient();
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const { error } = await client.from('folders').insert(rows.slice(i, i + CHUNK_SIZE));
    if (error) throw error;
  }
}

async function insertDeckChunk(rows: DeckRow[]): Promise<void> {
  const client = requireClient();
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    for (const row of rows.slice(i, i + CHUNK_SIZE)) {
      await insertDeckRow(client, row);
    }
  }
}

async function insertCardChunk(rows: CardRow[]): Promise<void> {
  const client = requireClient();
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await client.from('cards').insert(chunk);
    if (error) {
      throw new Error(
        `Supabase cards-Insert fehlgeschlagen: ${error.message} (code: ${error.code ?? 'unbekannt'})`,
      );
    }
  }
}

async function insertReviewLogChunk(rows: ReviewLogRow[]): Promise<void> {
  const client = requireClient();
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const { error } = await client.from('review_logs').insert(rows.slice(i, i + CHUNK_SIZE));
    if (error) throw error;
  }
}

async function insertUniversityEventChunk(rows: UniversityEventRow[]): Promise<void> {
  const client = requireClient();
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const { error } = await client.from('university_events').insert(rows.slice(i, i + CHUNK_SIZE));
    if (error) throw formatCloudError(error, 'Uni-Events importieren');
  }
}

async function insertStudySessionChunk(rows: StudySessionRow[]): Promise<void> {
  const client = requireClient();
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const { error } = await client.from('study_sessions').insert(rows.slice(i, i + CHUNK_SIZE));
    if (error) throw formatCloudError(error, 'Lern-Sessions importieren');
  }
}

// ── Sync-Hilfen ──────────────────────────────────────────────────

/** Prüft, ob der Nutzer bereits Daten in Supabase hat */
export async function userHasCloudData(userId: string): Promise<boolean> {
  const client = requireClient();
  const { count, error } = await client
    .from('decks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Einmaliger Upload aller lokalen Daten (IDs bleiben erhalten) */
export async function importAllLocalData(
  userId: string,
  data: {
    folders: Folder[];
    decks: Deck[];
    cards: Card[];
    reviewLogs: ReviewLog[];
    universityEvents: UniversityEvent[];
    studySessions: StudySessionLog[];
    userProfile: UserProfile | null;
  },
): Promise<void> {
  if (data.folders.length > 0) {
    await insertFolderChunk(data.folders.map((f) => folderToRow(f, userId)));
  }
  if (data.decks.length > 0) {
    await insertDeckChunk(data.decks.map((d) => deckToRow(d, userId)));
  }
  if (data.cards.length > 0) {
    await insertCardChunk(data.cards.map((c) => cardToRow(c, userId)));
  }
  if (data.reviewLogs.length > 0) {
    await insertReviewLogChunk(data.reviewLogs.map((l) => reviewLogToRow(l, userId)));
  }
  if (data.universityEvents.length > 0) {
    await insertUniversityEventChunk(
      data.universityEvents.map((e) => universityEventToRow(e, userId)),
    );
  }
  if (data.studySessions.length > 0) {
    await insertStudySessionChunk(
      data.studySessions.map((s) => studySessionToRow(s, userId)),
    );
  }
  if (data.userProfile) {
    await saveUserProfile({ ...data.userProfile, id: userId });
  }
}

// ── Ordner ───────────────────────────────────────────────────────

let folderSchemaReady: boolean | null = null;

/** Prüft ob die Supabase-Ordner-Migration ausgeführt wurde */
export async function isCloudFolderSchemaReady(): Promise<boolean> {
  if (!isCloudMode()) return true;
  if (folderSchemaReady !== null) return folderSchemaReady;

  const client = requireClient();
  const { error } = await client.from('folders').select('id').limit(1);
  folderSchemaReady = !error || !isFoldersTableMissing(error);
  return folderSchemaReady;
}

export async function getAllFolders(): Promise<Folder[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('folders')
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    if (isFoldersTableMissing(error)) {
      console.warn('[Abimind Cloud] folders-Tabelle fehlt – Ordner deaktiviert bis Migration läuft.');
      return [];
    }
    throw formatCloudError(error, 'Ordner laden');
  }
  return (data as FolderRow[]).map(folderFromRow);
}

export async function createFolder(name: string): Promise<Folder> {
  const client = requireClient();
  const userId = requireUserId();
  const timestamp = now();
  const row: FolderRow = {
    id: newId(),
    user_id: userId,
    name: name.trim(),
    created_at: timestamp,
    updated_at: timestamp,
  };
  const { error } = await client.from('folders').insert(row);
  if (error) throw formatCloudError(error, 'Ordner erstellen');
  return folderFromRow(row);
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('folders')
    .update({ name: name.trim(), updated_at: now() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteFolder(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('folders').delete().eq('id', id);
  if (error) throw formatCloudError(error, 'Ordner löschen');
}

export async function setDeckFolder(deckId: string, folderId: string | null): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('decks')
    .update({ folder_id: folderId, updated_at: now() })
    .eq('id', deckId);
  if (error) throw formatCloudError(error, 'Deck-Ordner ändern');
}

// ── Decks ────────────────────────────────────────────────────────

export async function getAllDecks(): Promise<Deck[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('decks')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data as DeckRow[]).map(deckFromRow);
}

export async function getDeck(id: string): Promise<Deck | undefined> {
  const client = requireClient();
  const { data, error } = await client.from('decks').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? deckFromRow(data as DeckRow) : undefined;
}

export async function createDeck(name: string): Promise<Deck> {
  const client = requireClient();
  const userId = requireUserId();
  const timestamp = now();
  const row: DeckRow = {
    id: newId(),
    user_id: userId,
    name: name.trim(),
    folder_id: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  const { error } = await client.from('decks').insert(row);
  if (error) {
    if (isFolderIdColumnMissing(error)) {
      const { folder_id: _omit, ...legacyRow } = row;
      const retry = await client.from('decks').insert(legacyRow);
      if (retry.error) throw formatCloudError(retry.error, 'Deck erstellen');
      return deckFromRow({ ...legacyRow, folder_id: null });
    }
    throw formatCloudError(error, 'Deck erstellen');
  }
  return deckFromRow(row);
}

export async function renameDeck(id: string, name: string): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('decks')
    .update({ name: name.trim(), updated_at: now() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteDeck(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('decks').delete().eq('id', id);
  if (error) throw formatCloudError(error, 'Deck löschen');
}

// ── Karten ───────────────────────────────────────────────────────

export async function getCardsByDeck(deckId: string): Promise<Card[]> {
  const client = requireClient();
  const { data, error } = await client.from('cards').select('*').eq('deck_id', deckId);
  if (error) throw error;
  return (data as CardRow[]).map((row) => normalizeCard(cardFromRow(row)));
}

export async function getCard(id: string): Promise<Card | undefined> {
  const client = requireClient();
  const { data, error } = await client.from('cards').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalizeCard(cardFromRow(data as CardRow)) : undefined;
}

async function requireNormalizedCard(cardId: string): Promise<Card> {
  const card = await getCard(cardId);
  if (!card) throw new Error(`Karte ${cardId} nicht gefunden`);
  return card;
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
  const client = requireClient();
  const userId = requireUserId();
  const timestamp = now();
  const defaults = defaultCardRowFields();
  const row: CardRow = {
    id: newId(),
    user_id: userId,
    deck_id: deckId,
    front: front.trim(),
    back: back.trim(),
    tag: tag?.trim() || null,
    ...defaults,
    created_at: timestamp,
    updated_at: timestamp,
  };
  const { error: cardError } = await client.from('cards').insert(row);
  if (cardError) throw cardError;
  const { error: deckError } = await client
    .from('decks')
    .update({ updated_at: timestamp })
    .eq('id', deckId);
  if (deckError) throw deckError;
  return cardFromRow(row);
}

export async function updateCard(
  id: string,
  data: Pick<Card, 'front' | 'back'> & { tag?: string },
): Promise<void> {
  const client = requireClient();
  const update: Partial<CardRow> = {
    front: data.front.trim(),
    back: data.back.trim(),
    updated_at: now(),
  };
  if (data.tag !== undefined) {
    update.tag = data.tag.trim() || null;
  }
  const { error } = await client.from('cards').update(update).eq('id', id);
  if (error) throw error;
}

export async function createCardsBulk(
  deckId: string,
  items: { front: string; back: string; tag?: string }[],
): Promise<number> {
  const client = requireClient();
  const userId = requireUserId();
  const timestamp = now();

  const deck = await getDeck(deckId);
  if (!deck) {
    throw new Error(
      `Deck ${deckId} existiert nicht in Supabase. Bitte Seite neu laden oder Deck erneut anlegen.`,
    );
  }

  const defaults = defaultCardRowFields();
  const rows: CardRow[] = items.map((item) => ({
    id: newId(),
    user_id: userId,
    deck_id: deckId,
    front: item.front.trim(),
    back: item.back.trim(),
    tag: item.tag?.trim() || null,
    ...defaults,
    created_at: timestamp,
    updated_at: timestamp,
  }));

  console.log('[Abimind Cloud] createCardsBulk', {
    deckId,
    count: rows.length,
    sample: {
      knowledge_score: rows[0]?.knowledge_score,
      review_count: rows[0]?.review_count,
    },
  });

  await insertCardChunk(rows);
  const { error } = await client.from('decks').update({ updated_at: timestamp }).eq('id', deckId);
  if (error) {
    throw new Error(`Supabase Deck-Update fehlgeschlagen: ${error.message}`);
  }
  return rows.length;
}

export async function deleteCard(id: string): Promise<void> {
  const client = requireClient();
  const card = await getCard(id);
  if (!card) return;
  const { error } = await client.from('cards').delete().eq('id', id);
  if (error) throw error;
  const { error: deckError } = await client
    .from('decks')
    .update({ updated_at: now() })
    .eq('id', card.deckId);
  if (deckError) throw deckError;
}

function isReviewLogsTableMissing(error: PostgrestError): boolean {
  return isMissingRelation(error) && (error.message?.includes('review_logs') ?? false);
}

export async function getAllReviewLogs(): Promise<ReviewLog[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('review_logs')
    .select('*')
    .order('reviewed_at', { ascending: true });
  if (error) {
    if (isReviewLogsTableMissing(error)) return [];
    throw formatCloudError(error, 'Review-Logs laden');
  }
  return (data as ReviewLogRow[]).map(reviewLogFromRow);
}

export async function reviewCard(
  cardId: string,
  quality: ReviewQuality,
  _today = toDateString(),
): Promise<Card> {
  const client = requireClient();
  const userId = requireUserId();
  const card = await requireNormalizedCard(cardId);

  const newScore = updateKnowledgeScore(card.knowledgeScore, quality);
  const timestamp = now();

  const logRow: ReviewLogRow = {
    id: newId(),
    user_id: userId,
    card_id: card.id,
    deck_id: card.deckId,
    quality,
    mode: 'sm2',
    previous_knowledge_score: card.knowledgeScore,
    new_knowledge_score: newScore,
    previous_easiness_factor: card.easinessFactor,
    new_easiness_factor: card.easinessFactor,
    previous_interval: card.interval,
    new_interval: card.interval,
    reviewed_at: timestamp,
  };

  const updatedRow: CardRow = {
    ...cardToRow(card, userId),
    knowledge_score: newScore,
    review_count: card.reviewCount + 1,
    updated_at: timestamp,
  };

  const { error: cardError } = await client.from('cards').upsert(updatedRow);
  if (cardError) {
    throw new Error(`Supabase cards-Update fehlgeschlagen: ${cardError.message}`);
  }
  const { error: logError } = await client.from('review_logs').insert(logRow);
  if (logError) {
    throw new Error(
      `Supabase review_logs-Insert fehlgeschlagen: ${logError.message} (code: ${logError.code ?? 'unbekannt'})`,
    );
  }

  return cardFromRow(updatedRow);
}

export async function importCards(
  deckId: string,
  cards: Omit<Card, 'id' | 'deckId' | 'createdAt' | 'updatedAt'>[],
): Promise<number> {
  const client = requireClient();
  const userId = requireUserId();
  const timestamp = now();
  const rows: CardRow[] = cards.map((c) => ({
    id: newId(),
    user_id: userId,
    deck_id: deckId,
    front: c.front,
    back: c.back,
    tag: c.tag ?? null,
    knowledge_score: c.knowledgeScore ?? defaultKnowledgeFields().knowledgeScore,
    review_count: c.reviewCount ?? 0,
    easiness_factor: c.easinessFactor,
    interval: c.interval,
    repetitions: c.repetitions,
    due_date: c.dueDate,
    created_at: timestamp,
    updated_at: timestamp,
  }));
  await insertCardChunk(rows);
  const { error } = await client.from('decks').update({ updated_at: timestamp }).eq('id', deckId);
  if (error) throw error;
  return rows.length;
}

export async function getAllCards(): Promise<Card[]> {
  const client = requireClient();
  const { data, error } = await client.from('cards').select('*');
  if (error) throw error;
  return (data as CardRow[]).map((row) => normalizeCard(cardFromRow(row)));
}

export async function getCardCountByDeck(deckId: string): Promise<number> {
  const client = requireClient();
  const { count, error } = await client
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('deck_id', deckId);
  if (error) throw error;
  return count ?? 0;
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
  const cards = await getAllCards();
  return cards.filter((c) => isDue(c, today)).length;
}

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

function isUniversityEventsTableMissing(error: PostgrestError): boolean {
  return isMissingRelation(error) && (error.message?.includes('university_events') ?? false);
}

function isStudySessionsTableMissing(error: PostgrestError): boolean {
  return isMissingRelation(error) && (error.message?.includes('study_sessions') ?? false);
}

export async function getAllUniversityEvents(): Promise<UniversityEvent[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('university_events')
    .select('*')
    .order('event_date', { ascending: true });
  if (error) {
    if (isUniversityEventsTableMissing(error)) return [];
    throw formatCloudError(error, 'Uni-Events laden');
  }
  return (data as UniversityEventRow[]).map(universityEventFromRow);
}

export async function getUpcomingUniversityEvents(fromDate = toDateString()): Promise<UniversityEvent[]> {
  const all = await getAllUniversityEvents();
  return all.filter((e) => e.eventDate >= fromDate);
}

export async function createUniversityEvent(
  data: Pick<UniversityEvent, 'title' | 'eventDate'> & Partial<Pick<UniversityEvent, 'subject' | 'notes'>>,
): Promise<UniversityEvent> {
  const client = requireClient();
  const userId = requireUserId();
  const timestamp = now();
  const row: UniversityEventRow = {
    id: newId(),
    user_id: userId,
    title: data.title.trim(),
    event_date: data.eventDate,
    subject: data.subject?.trim() || null,
    notes: data.notes?.trim() || null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  const { error } = await client.from('university_events').insert(row);
  if (error) throw formatCloudError(error, 'Uni-Event erstellen');
  return universityEventFromRow(row);
}

export async function updateUniversityEvent(
  id: string,
  data: Partial<Pick<UniversityEvent, 'title' | 'eventDate' | 'subject' | 'notes'>>,
): Promise<void> {
  const client = requireClient();
  const patch: Partial<UniversityEventRow> = { updated_at: now() };
  if (data.title !== undefined) patch.title = data.title.trim();
  if (data.eventDate !== undefined) patch.event_date = data.eventDate;
  if (data.subject !== undefined) patch.subject = data.subject.trim() || null;
  if (data.notes !== undefined) patch.notes = data.notes.trim() || null;
  const { error } = await client.from('university_events').update(patch).eq('id', id);
  if (error) throw formatCloudError(error, 'Uni-Event aktualisieren');
}

export async function deleteUniversityEvent(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('university_events').delete().eq('id', id);
  if (error) throw formatCloudError(error, 'Uni-Event löschen');
}

// ── Lernzeit-Sessions ────────────────────────────────────────────

export async function getAllStudySessions(): Promise<StudySessionLog[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('study_sessions')
    .select('*')
    .order('ended_at', { ascending: false });
  if (error) {
    if (isStudySessionsTableMissing(error)) return [];
    throw formatCloudError(error, 'Lern-Sessions laden');
  }
  return (data as StudySessionRow[]).map(studySessionFromRow);
}

export async function getStudySessionsByDeck(deckId: string): Promise<StudySessionLog[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('study_sessions')
    .select('*')
    .eq('deck_id', deckId)
    .order('ended_at', { ascending: false });
  if (error) {
    if (isStudySessionsTableMissing(error)) return [];
    throw formatCloudError(error, 'Lern-Sessions laden');
  }
  return (data as StudySessionRow[]).map(studySessionFromRow);
}

export async function logStudySession(deckId: string, durationSeconds: number): Promise<StudySessionLog> {
  const client = requireClient();
  const userId = requireUserId();
  const timestamp = now();
  const row: StudySessionRow = {
    id: newId(),
    user_id: userId,
    deck_id: deckId,
    duration_seconds: Math.max(1, Math.round(durationSeconds)),
    ended_at: timestamp,
    created_at: timestamp,
  };
  const { error } = await client.from('study_sessions').insert(row);
  if (error) throw formatCloudError(error, 'Lernzeit speichern');
  return studySessionFromRow(row);
}

// ── Abitur-Profil ────────────────────────────────────────────────

function isUserProfilesTableMissing(error: PostgrestError): boolean {
  return isMissingRelation(error) && (error.message?.includes('user_profiles') ?? false);
}

/** Hinweis wenn die Profil-Migration in Supabase noch nicht ausgeführt wurde */
export const USER_PROFILE_MIGRATION_HINT =
  'Profil-Migration fehlt in Supabase. Führe die Datei supabase/migrations/20260714160000_user_profiles.sql im Supabase SQL-Editor aus.';

export async function getUserProfile(): Promise<UserProfile | null> {
  const client = requireClient();
  const userId = requireUserId();
  const { data, error } = await client
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    if (isUserProfilesTableMissing(error)) return null;
    throw formatCloudError(error, 'Profil laden');
  }
  if (!data) return null;
  return userProfileFromRow(data as UserProfileRow);
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const client = requireClient();
  const userId = requireUserId();
  const row = userProfileToRow(profile, userId);
  const { error } = await client.from('user_profiles').upsert(row, { onConflict: 'user_id' });
  if (error) {
    if (isUserProfilesTableMissing(error)) {
      throw new Error(USER_PROFILE_MIGRATION_HINT);
    }
    throw formatCloudError(error, 'Profil speichern');
  }
}
