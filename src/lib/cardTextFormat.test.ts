import { describe, expect, it } from 'vitest';
import { parseCardText } from './cardTextFormat';

describe('parseCardText', () => {
  it('lässt normalen Text als Absatz', () => {
    expect(parseCardText('Einfache Antwort')).toEqual([
      { type: 'paragraph', text: 'Einfache Antwort' },
    ]);
  });

  it('erkennt Bullet-Zeilen mit - und •', () => {
    expect(parseCardText('- Erster Punkt\n• Zweiter Punkt')).toEqual([
      { type: 'list', items: ['Erster Punkt', 'Zweiter Punkt'] },
    ]);
  });

  it('hängt Fortsetzungszeilen an den vorherigen Punkt an', () => {
    expect(parseCardText('- Erster Punkt mit\n  zweiter Zeile\n- Zweiter Punkt')).toEqual([
      {
        type: 'list',
        items: ['Erster Punkt mit\n  zweiter Zeile', 'Zweiter Punkt'],
      },
    ]);
  });

  it('trennt Absatz und Liste', () => {
    expect(parseCardText('Einleitung\n\n- Punkt A\n- Punkt B')).toEqual([
      { type: 'paragraph', text: 'Einleitung' },
      { type: 'list', items: ['Punkt A', 'Punkt B'] },
    ]);
  });

  it('erkennt nummerierte Listen', () => {
    expect(parseCardText('1. Erster\n2) Zweiter')).toEqual([
      { type: 'list', items: ['Erster', 'Zweiter'] },
    ]);
  });
});
