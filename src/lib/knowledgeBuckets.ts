import type { Card, KnowledgeBoxSlice } from '../types';
import { KNOWLEDGE_BOX_COLORS } from './designTokens';

/** Kenntnis-Status für Donut-Chart (3 Kategorien) */
export const KNOWLEDGE_STATUS_COLORS = KNOWLEDGE_BOX_COLORS;

const MASTERED_SCORE_THRESHOLD = 85;

export function buildKnowledgeBoxSlices(cards: Card[]): KnowledgeBoxSlice[] {
  const buckets: KnowledgeBoxSlice[] = [
    { name: 'Neu', value: 0, fill: KNOWLEDGE_STATUS_COLORS.neu },
    { name: 'Aktiv', value: 0, fill: KNOWLEDGE_STATUS_COLORS.aktiv },
    { name: 'Beherrscht', value: 0, fill: KNOWLEDGE_STATUS_COLORS.beherrscht },
  ];

  for (const card of cards) {
    if (card.reviewCount === 0) {
      buckets[0].value += 1;
    } else if (card.knowledgeScore >= MASTERED_SCORE_THRESHOLD) {
      buckets[2].value += 1;
    } else {
      buckets[1].value += 1;
    }
  }

  return buckets.filter((b) => b.value > 0);
}

export function totalCardsInSlices(slices: KnowledgeBoxSlice[]): number {
  return slices.reduce((sum, slice) => sum + slice.value, 0);
}
