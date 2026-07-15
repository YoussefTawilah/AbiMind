import { describe, it, expect } from 'vitest';
import { parseGeneratedCards, AiParseError } from './parse-response';

describe('parseGeneratedCards', () => {
  it('parst gültiges JSON-Objekt mit cards-Array', () => {
    const raw = JSON.stringify({
      cards: [
        { front: 'Was ist SM-2?', back: 'Spaced-Repetition-Algorithmus', tag: 'Informatik' },
      ],
    });
    const result = parseGeneratedCards(raw);
    expect(result).toHaveLength(1);
    expect(result[0].tag).toBe('Informatik');
  });

  it('parst JSON in Markdown-Codeblock', () => {
    const raw = '```json\n{"cards":[{"front":"Q","back":"A","tag":"Test"}]}\n```';
    expect(parseGeneratedCards(raw)).toHaveLength(1);
  });

  it('wirft bei leerer Antwort', () => {
    expect(() => parseGeneratedCards('')).toThrow(AiParseError);
  });

  it('wirft bei ungültigem JSON', () => {
    expect(() => parseGeneratedCards('kein json')).toThrow(AiParseError);
  });

  it('wirft bei fehlendem cards-Array', () => {
    expect(() => parseGeneratedCards('{"foo":[]}')).toThrow(AiParseError);
  });

  it('filtert Karten ohne front/back', () => {
    const raw = JSON.stringify({
      cards: [
        { front: 'OK', back: 'Ja', tag: 'X' },
        { front: '', back: 'Nein', tag: 'X' },
      ],
    });
    expect(parseGeneratedCards(raw)).toHaveLength(1);
  });
});
