import { describe, it, expect } from 'vitest';
import {
  calculateEasinessFactor,
  calculateSm2,
  isDue,
  addDays,
  DEFAULT_EASINESS_FACTOR,
  MIN_EASINESS_FACTOR,
} from './sm2';

const TODAY = '2026-07-13';

describe('calculateEasinessFactor', () => {
  it('erhöht EF bei perfekter Antwort (5)', () => {
    expect(calculateEasinessFactor(2.5, 5)).toBe(2.6);
  });

  it('bleibt neutral bei Antwort 4', () => {
    expect(calculateEasinessFactor(2.5, 4)).toBe(2.5);
  });

  it('senkt EF bei schwacher Antwort (1)', () => {
    const ef = calculateEasinessFactor(2.5, 1);
    expect(ef).toBeLessThan(2.5);
  });

  it('respektiert Minimum 1.3', () => {
    expect(calculateEasinessFactor(1.3, 1)).toBe(MIN_EASINESS_FACTOR);
  });
});

describe('calculateSm2 – Erfolgssequenz', () => {
  const base = {
    easinessFactor: DEFAULT_EASINESS_FACTOR,
    interval: 0,
    repetitions: 0,
  };

  it('1. erfolgreiche Wiederholung → Intervall 1 Tag', () => {
    const result = calculateSm2(base, 4, TODAY);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
    expect(result.dueDate).toBe(addDays(TODAY, 1));
  });

  it('2. erfolgreiche Wiederholung → Intervall 6 Tage', () => {
    const result = calculateSm2(
      { easinessFactor: 2.5, interval: 1, repetitions: 1 },
      4,
      TODAY,
    );
    expect(result.interval).toBe(6);
    expect(result.repetitions).toBe(2);
    expect(result.dueDate).toBe(addDays(TODAY, 6));
  });

  it('3. erfolgreiche Wiederholung → Intervall = vorheriges × EF', () => {
    const result = calculateSm2(
      { easinessFactor: 2.5, interval: 6, repetitions: 2 },
      5,
      TODAY,
    );
    // EF steigt auf 2.6, Intervall = round(6 * 2.6) = 16
    expect(result.easinessFactor).toBe(2.6);
    expect(result.interval).toBe(16);
    expect(result.repetitions).toBe(3);
  });
});

describe('calculateSm2 – Fehlschlag', () => {
  it('setzt repetitions auf 0 und Intervall auf 1 zurück', () => {
    const result = calculateSm2(
      { easinessFactor: 2.5, interval: 16, repetitions: 3 },
      1,
      TODAY,
    );
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
    expect(result.dueDate).toBe(addDays(TODAY, 1));
  });

  it('Bewertung 2 gilt ebenfalls als nicht bestanden', () => {
    const result = calculateSm2(
      { easinessFactor: 2.5, interval: 6, repetitions: 2 },
      2,
      TODAY,
    );
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
  });
});

describe('isDue', () => {
  it('Karte mit dueDate heute ist fällig', () => {
    expect(isDue({ dueDate: TODAY }, TODAY)).toBe(true);
  });

  it('Karte mit dueDate in der Vergangenheit ist fällig', () => {
    expect(isDue({ dueDate: '2026-07-10' }, TODAY)).toBe(true);
  });

  it('Karte mit dueDate in der Zukunft ist nicht fällig', () => {
    expect(isDue({ dueDate: '2026-07-20' }, TODAY)).toBe(false);
  });
});
