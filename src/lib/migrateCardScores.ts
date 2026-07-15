import type { Card, ReviewLog, ReviewQuality } from '../types';
import {
  computeScoreFromHistory,
  createDefaultKnowledgeState,
  DEFAULT_KNOWLEDGE_SCORE,
} from './knowledgeScore';
import { createDefaultSm2State } from './sm2';

/** Stellt fehlende knowledgeScore/reviewCount und Legacy-SM-2-Felder sicher */
export function normalizeCard(card: Card): Card {
  const knowledge = defaultKnowledgeFields();
  const legacy = createDefaultSm2State();
  return {
    ...legacy,
    ...card,
    knowledgeScore:
      typeof card.knowledgeScore === 'number' && !Number.isNaN(card.knowledgeScore)
        ? card.knowledgeScore
        : knowledge.knowledgeScore,
    reviewCount:
      typeof card.reviewCount === 'number' && !Number.isNaN(card.reviewCount)
        ? card.reviewCount
        : 0,
    easinessFactor:
      typeof card.easinessFactor === 'number' ? card.easinessFactor : legacy.easinessFactor,
    interval: typeof card.interval === 'number' ? card.interval : legacy.interval,
    repetitions: typeof card.repetitions === 'number' ? card.repetitions : legacy.repetitions,
    dueDate: card.dueDate ?? legacy.dueDate,
  };
}

/** Nur SM-2-Lernmodus-Bewertungen zählen für den Kenntnis-Score */
export function sm2QualitiesFromLogs(logs: ReviewLog[], cardId: string): ReviewQuality[] {
  return logs
    .filter((log) => log.cardId === cardId && log.mode === 'sm2')
    .sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt))
    .map((log) => log.quality);
}

/** Berechnet knowledgeScore + reviewCount aus der ReviewLog-Historie */
export function deriveKnowledgeFromLogs(
  logs: ReviewLog[],
  cardId: string,
): { knowledgeScore: number; reviewCount: number } {
  const qualities = sm2QualitiesFromLogs(logs, cardId);
  return {
    knowledgeScore:
      qualities.length > 0
        ? computeScoreFromHistory(qualities)
        : DEFAULT_KNOWLEDGE_SCORE,
    reviewCount: qualities.length,
  };
}

/** Wendet Score-Felder auf eine Karte an (bestehende Felder bleiben erhalten) */
export function applyKnowledgeToCard(
  card: Card,
  knowledgeScore: number,
  reviewCount: number,
): Card {
  return { ...card, knowledgeScore, reviewCount };
}

/** Score-Felder für eine brandneue Karte */
export function defaultKnowledgeFields(): {
  knowledgeScore: number;
  reviewCount: number;
} {
  return createDefaultKnowledgeState();
}
