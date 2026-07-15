/** Absatz oder Aufzählung aus Karten-Text */
export type CardTextBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

/** Zeilen mit Aufzählungszeichen am Zeilenanfang */
const BULLET_LINE =
  /^\s*(?:[-•*–—]\s+|\d+[.)]\s+)(.+)$/;

/**
 * Wandelt Text mit Bullet-Präfixen (-, •, *, nummeriert) in Absätze und Listen um.
 * Fortsetzungszeilen ohne Bullet werden dem vorherigen Listeneintrag angehängt.
 */
export function parseCardText(text: string): CardTextBlock[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines = text.split(/\r?\n/);
  const blocks: CardTextBlock[] = [];
  let currentList: string[] | null = null;
  let currentParagraph: string[] = [];

  function flushParagraph() {
    if (currentParagraph.length === 0) return;
    blocks.push({ type: 'paragraph', text: currentParagraph.join('\n').trim() });
    currentParagraph = [];
  }

  function flushList() {
    if (!currentList || currentList.length === 0) return;
    blocks.push({ type: 'list', items: currentList });
    currentList = null;
  }

  for (const line of lines) {
    const bulletMatch = line.match(BULLET_LINE);
    if (bulletMatch) {
      flushParagraph();
      if (!currentList) currentList = [];
      currentList.push(bulletMatch[1].trimEnd());
      continue;
    }

    if (line.trim() === '') {
      flushList();
      flushParagraph();
      continue;
    }

    if (currentList && currentList.length > 0) {
      const lastIndex = currentList.length - 1;
      currentList[lastIndex] = `${currentList[lastIndex]}\n${line.trimEnd()}`;
      continue;
    }

    flushList();
    currentParagraph.push(line);
  }

  flushList();
  flushParagraph();
  return blocks;
}

export function cardTextHasList(text: string): boolean {
  return parseCardText(text).some((block) => block.type === 'list');
}
