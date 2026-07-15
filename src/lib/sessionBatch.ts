import type { Card, ReviewQuality } from '../types';
import { pickWeightedRandom } from './studySelection';

/** Karten pro Stapel (Lern- und Übungsmodus) */
export const SESSION_BATCH_SIZE = 7;

/** Bewertungen 1–3 gelten als „schlecht" und können spätere Stapel auffüllen */
export const POOR_RATING_THRESHOLD = 4;

export interface DeckSessionState {
  /** Gesamtes Deck in gewichteter Prioritätsreihenfolge */
  orderedDeck: Card[];
  /** Noch nicht in einem Stapel verteilte „neue" Karten */
  remainingNew: Card[];
  /** Karten mit Bewertung < 4 aus früheren Stapeln (Wiederholungs-Pool) */
  fillPool: Card[];
  batchNumber: number;
}

export function initDeckSession(orderedDeck: Card[]): DeckSessionState {
  return {
    orderedDeck,
    remainingNew: [...orderedDeck],
    fillPool: [],
    batchNumber: 0,
  };
}

export function isPoorRating(quality: ReviewQuality): boolean {
  return quality < POOR_RATING_THRESHOLD;
}

/** Nach jeder Bewertung: schlechte Karten in die Wiederholungs-Warteschlange */
export function recordSessionRating(
  state: DeckSessionState,
  card: Card,
  rating: ReviewQuality,
): DeckSessionState {
  const fillPool = state.fillPool.filter((c) => c.id !== card.id);
  return {
    ...state,
    fillPool: isPoorRating(rating) ? [...fillPool, card] : fillPool,
  };
}

/** Anzahl Karten, die bereits mindestens einmal in einem Stapel waren */
export function countSeenInSession(state: DeckSessionState): number {
  return state.orderedDeck.length - state.remainingNew.length;
}

function removeFromPool(pool: Card[], cardId: string): Card[] {
  return pool.filter((c) => c.id !== cardId);
}

/**
 * Stapel 1: nur neue Karten (erste 7 aus der gewichteten Reihenfolge).
 * Ab Stapel 2: gewichtete Mischung aus remainingNew + fillPool (ein Pool,
 * Auswahl per selectionWeight wie in buildWeightedStudyQueue).
 */
export function buildNextSessionBatch(
  state: DeckSessionState,
): { batch: Card[]; state: DeckSessionState } | { batch: null; state: DeckSessionState } {
  const batch: Card[] = [];
  let remainingNew = [...state.remainingNew];
  let fillPool = [...state.fillPool];
  const isFirstBatch = state.batchNumber === 0;

  if (isFirstBatch) {
    while (batch.length < SESSION_BATCH_SIZE && remainingNew.length > 0) {
      batch.push(remainingNew.shift()!);
    }
  } else {
    while (
      batch.length < SESSION_BATCH_SIZE &&
      (remainingNew.length > 0 || fillPool.length > 0)
    ) {
      const pool = [...remainingNew, ...fillPool];
      const { picked } = pickWeightedRandom(pool);
      batch.push(picked);
      remainingNew = removeFromPool(remainingNew, picked.id);
      fillPool = removeFromPool(fillPool, picked.id);
    }
  }

  if (batch.length === 0) {
    return { batch: null, state };
  }

  return {
    batch,
    state: {
      ...state,
      remainingNew,
      fillPool,
      batchNumber: state.batchNumber + 1,
    },
  };
}

/** Label z. B. „Stapel 2 · 8/10 Karten vom Deck" */
export function formatSessionBatchLabel(
  batchNumber: number,
  seenCount: number,
  totalDeckCards: number,
  batchSize: number,
): string {
  if (totalDeckCards === 0) return '';
  return `Stapel ${batchNumber} · ${seenCount}/${totalDeckCards} vom Deck · ${batchSize} Karten im Stapel`;
}
