import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateCardsFromText, AiClientError } from './ai';

describe('generateCardsFromText', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gibt Karten bei erfolgreicher API-Antwort zurück', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          cards: [{ front: 'Q', back: 'A', tag: 'Test' }],
        }),
      }),
    );

    const cards = await generateCardsFromText('Beispieltext');
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe('Q');
  });

  it('wirft bei leerem Text', async () => {
    await expect(generateCardsFromText('  ')).rejects.toMatchObject({
      code: 'empty',
    });
  });

  it('wirft bei Serverfehler', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Gemini-Fehler' }),
      }),
    );

    await expect(generateCardsFromText('Text')).rejects.toMatchObject({
      code: 'server',
    });
  });

  it('wirft bei leerer Kartenliste', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ cards: [] }),
      }),
    );

    await expect(generateCardsFromText('Text')).rejects.toBeInstanceOf(AiClientError);
  });
});
