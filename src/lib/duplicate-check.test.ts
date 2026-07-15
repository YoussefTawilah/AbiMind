import { describe, it, expect } from 'vitest';
import {
  normalizeCardText,
  wordJaccardSimilarity,
  findDuplicateMatch,
} from './duplicate-check';

describe('normalizeCardText', () => {
  it('normalisiert Groß/Klein und Satzzeichen', () => {
    expect(normalizeCardText('  Was ist SM-2?  ')).toBe('was ist sm-2');
  });
});

describe('findDuplicateMatch', () => {
  const existing = ['Was ist Photosynthese?', 'Definition: Mitose'];

  it('erkennt exakte Duplikate nach Normalisierung', () => {
    const match = findDuplicateMatch('was ist photosynthese', existing);
    expect(match?.similarity).toBe('exact');
  });

  it('erkennt ähnliche Formulierungen (gleiche Wörter, andere Reihenfolge)', () => {
    const match = findDuplicateMatch('Mitose Definition', ['Definition Mitose']);
    expect(match?.similarity).toBe('similar');
  });

  it('findet kein Duplikat bei distinctem Inhalt', () => {
    expect(findDuplicateMatch('Was ist Osmose?', existing)).toBeNull();
  });
});

describe('wordJaccardSimilarity', () => {
  it('gibt 1 bei identischen Wortmengen', () => {
    expect(wordJaccardSimilarity('a b c', 'a b c')).toBe(1);
  });
});
