import type { DeckStats } from '../types';
import {
  getAllDecks,
  getAverageKnowledgeScoreByDeck,
  getCardCountByDeck,
  getCardsByDeck,
  getGlobalAverageKnowledgeScore,
} from './repository';

export async function getDeckStatsList(): Promise<DeckStats[]> {
  const decks = await getAllDecks();
  const stats: DeckStats[] = [];

  for (const deck of decks) {
    const [totalCards, averageKnowledgeScore, cards] = await Promise.all([
      getCardCountByDeck(deck.id),
      getAverageKnowledgeScoreByDeck(deck.id),
      getCardsByDeck(deck.id),
    ]);
    const reviewedCards = cards.filter((c) => c.reviewCount > 0).length;
    stats.push({ deckId: deck.id, totalCards, averageKnowledgeScore, reviewedCards });
  }

  return stats;
}

export { getGlobalAverageKnowledgeScore };
