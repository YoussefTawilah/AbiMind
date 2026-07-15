import type { Card } from '../types';
import { selectionWeight } from './knowledgeScore';

type WeightedCard = Pick<Card, 'id' | 'knowledgeScore' | 'reviewCount'>;

/** Einmalige gewichtete Zufallsauswahl aus einem Pool (ohne Zurücklegen). */
export function pickWeightedRandom<T extends WeightedCard>(
  pool: T[],
): { picked: T; rest: T[] } {
  if (pool.length === 0) {
    throw new Error('pickWeightedRandom: leerer Pool');
  }
  if (pool.length === 1) {
    return { picked: pool[0], rest: [] };
  }

  const weights = pool.map((c) => selectionWeight(c.knowledgeScore, c.reviewCount));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let pick = Math.random() * total;
  let chosenIndex = pool.length - 1;

  for (let i = 0; i < pool.length; i++) {
    pick -= weights[i];
    if (pick <= 0) {
      chosenIndex = i;
      break;
    }
  }

  const picked = pool[chosenIndex];
  const rest = [...pool.slice(0, chosenIndex), ...pool.slice(chosenIndex + 1)];
  return { picked, rest };
}

/**
 * Erstellt eine Lern-Warteschlange per gewichteter Zufallsauswahl ohne Zurücklegen.
 * Karten mit niedrigem knowledgeScore (oder reviewCount === 0) erscheinen eher früh.
 */
export function buildWeightedStudyQueue(cards: Card[]): Card[] {
  const weightDebug = cards.map((c) => ({
    id: c.id,
    front: c.front.slice(0, 24),
    knowledgeScore: c.knowledgeScore,
    reviewCount: c.reviewCount,
    weight: selectionWeight(c.knowledgeScore, c.reviewCount),
  }));
  console.log('[Abimind] buildWeightedStudyQueue – Gewichte vor Auswahl:', weightDebug);

  const pool = [...cards];
  const queue: Card[] = [];

  while (pool.length > 0) {
    const { picked, rest } = pickWeightedRandom(pool);
    queue.push(picked);
    pool.length = 0;
    pool.push(...rest);
  }

  console.log(
    '[Abimind] buildWeightedStudyQueue – Reihenfolge (IDs):',
    queue.map((c) => c.id),
  );

  return queue;
}

/** Durchschnittlicher Kenntnis-Score (0–100), 0 wenn keine Karten */
export function averageKnowledgeScore(cards: Card[]): number {
  if (cards.length === 0) return 0;
  const sum = cards.reduce((acc, c) => acc + c.knowledgeScore, 0);
  return Math.round(sum / cards.length);
}
