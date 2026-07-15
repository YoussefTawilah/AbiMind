/**
 * Einheitliche Datenzugriffs-Schicht.
 * Gast → IndexedDB (db.ts), eingeloggt → Supabase (cloudDb.ts).
 */
import { isCloudMode } from './dataSource';
import * as localDb from './db';
import * as cloudDb from './cloudDb';

function store() {
  return isCloudMode() ? cloudDb : localDb;
}

export const getAllDecks = () => store().getAllDecks();
export const getDeck = (id: string) => store().getDeck(id);
export const createDeck = (name: string) => store().createDeck(name);
export const renameDeck = (id: string, name: string) => store().renameDeck(id, name);
export const deleteDeck = (id: string) => store().deleteDeck(id);
export const setDeckFolder = (deckId: string, folderId: string | null) =>
  store().setDeckFolder(deckId, folderId);

export const getAllFolders = () => store().getAllFolders();
export const createFolder = (name: string) => store().createFolder(name);
export const renameFolder = (id: string, name: string) => store().renameFolder(id, name);
export const deleteFolder = (id: string) => store().deleteFolder(id);

export const isFolderSchemaReady = () =>
  isCloudMode() ? cloudDb.isCloudFolderSchemaReady() : Promise.resolve(true);

export { FOLDER_MIGRATION_HINT, USER_PROFILE_MIGRATION_HINT } from './cloudDb';

export const getCardsByDeck = (deckId: string) => store().getCardsByDeck(deckId);
export const getCard = (id: string) => store().getCard(id);
export const getDueCards = (deckId: string, today?: string) => store().getDueCards(deckId, today);
export const getStudyQueue = (deckId: string) => store().getStudyQueue(deckId);
export const getAverageKnowledgeScoreByDeck = (deckId: string) =>
  store().getAverageKnowledgeScoreByDeck(deckId);
export const getGlobalAverageKnowledgeScore = () => store().getGlobalAverageKnowledgeScore();
export const createCard = (
  deckId: string,
  front: string,
  back: string,
  tag?: string,
) => store().createCard(deckId, front, back, tag);
export const updateCard = (
  id: string,
  data: Parameters<typeof localDb.updateCard>[1],
) => store().updateCard(id, data);
export const createCardsBulk = (
  deckId: string,
  items: { front: string; back: string; tag?: string }[],
) => store().createCardsBulk(deckId, items);
export const deleteCard = (id: string) => store().deleteCard(id);
export const getAllReviewLogs = () => store().getAllReviewLogs();
export const reviewCard = (
  cardId: string,
  quality: Parameters<typeof localDb.reviewCard>[1],
  today?: string,
) => store().reviewCard(cardId, quality, today);
export const importCards = (
  deckId: string,
  cards: Parameters<typeof localDb.importCards>[1],
) => store().importCards(deckId, cards);

export const getAllCards = () => store().getAllCards();
export const getCardCountByDeck = (deckId: string) => store().getCardCountByDeck(deckId);
export const getDueCountByDeck = (deckId: string, today?: string) =>
  store().getDueCountByDeck(deckId, today);
export const getLearnedCountByDeck = (deckId: string) => store().getLearnedCountByDeck(deckId);
export const getTotalDueToday = (today?: string) => store().getTotalDueToday(today);
export const getNextDueDateForDeck = (deckId: string, today?: string) =>
  store().getNextDueDateForDeck(deckId, today);
export const getDeckStudyStatus = (deckId: string) => store().getDeckStudyStatus(deckId);

export const getAllUniversityEvents = () => store().getAllUniversityEvents();
export const getUpcomingUniversityEvents = (fromDate?: string) =>
  store().getUpcomingUniversityEvents(fromDate);
export const createUniversityEvent = (
  data: Parameters<typeof localDb.createUniversityEvent>[0],
) => store().createUniversityEvent(data);
export const updateUniversityEvent = (
  id: string,
  data: Parameters<typeof localDb.updateUniversityEvent>[1],
) => store().updateUniversityEvent(id, data);
export const deleteUniversityEvent = (id: string) => store().deleteUniversityEvent(id);

export const getAllStudySessions = () => store().getAllStudySessions();
export const getStudySessionsByDeck = (deckId: string) => store().getStudySessionsByDeck(deckId);
export const logStudySession = (deckId: string, durationSeconds: number) =>
  store().logStudySession(deckId, durationSeconds);

export const getUserProfile = () => store().getUserProfile();
export const saveUserProfile = (profile: Parameters<typeof localDb.saveUserProfile>[0]) =>
  store().saveUserProfile(profile);

export type { DeckStudyStatus } from './db';
export type { LocalImportSummary } from './sync';
export { getLocalImportSummary } from './sync';
