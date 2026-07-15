import type { Card, CsvCardRow } from '../types';
import { DEFAULT_KNOWLEDGE_SCORE } from './knowledgeScore';
import { DEFAULT_EASINESS_FACTOR } from './sm2';

const CSV_HEADER = 'Vorderseite,Rückseite,nächste Fälligkeit,EF,Intervall';

/** Escaped CSV-Feld (Anführungszeichen verdoppeln) */
function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Parst ein CSV-Feld (entfernt Anführungszeichen) */
function parseCsvField(field: string): string {
  const trimmed = field.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed;
}

/**
 * Einfacher CSV-Zeilen-Parser.
 * Unterstützt Felder in Anführungszeichen mit Kommas darin.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map(parseCsvField);
}

/** Exportiert Karten eines Decks als CSV-String */
export function exportDeckToCsv(cards: Card[]): string {
  const rows = cards.map((c) =>
    [
      escapeCsvField(c.front),
      escapeCsvField(c.back),
      escapeCsvField(c.dueDate),
      escapeCsvField(c.easinessFactor),
      escapeCsvField(c.interval),
    ].join(','),
  );
  return [CSV_HEADER, ...rows].join('\n');
}

/** Löst einen CSV-Download im Browser aus */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export interface ParsedCsvResult {
  rows: CsvCardRow[];
  errors: string[];
}

/** Parst CSV-Text und gibt Kartenzeilen zurück */
export function parseCsvImport(text: string): ParsedCsvResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const errors: string[] = [];
  const rows: CsvCardRow[] = [];

  if (lines.length === 0) {
    return { rows, errors: ['CSV-Datei ist leer.'] };
  }

  let startIndex = 0;
  const firstFields = parseCsvLine(lines[0]);
  const isHeader =
    firstFields[0]?.toLowerCase().includes('vorderseite') ||
    firstFields[0]?.toLowerCase() === 'front';
  if (isHeader) startIndex = 1;

  for (let i = startIndex; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length < 2) {
      errors.push(`Zeile ${i + 1}: mindestens Vorderseite und Rückseite erforderlich.`);
      continue;
    }

    const [front, back, dueDate, efStr, intervalStr] = fields;
    if (!front || !back) {
      errors.push(`Zeile ${i + 1}: Vorderseite und Rückseite dürfen nicht leer sein.`);
      continue;
    }

    rows.push({
      front,
      back,
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
      easinessFactor: efStr ? parseFloat(efStr) : DEFAULT_EASINESS_FACTOR,
      interval: intervalStr ? parseInt(intervalStr, 10) : 0,
    });
  }

  return { rows, errors };
}

/** Wandelt CSV-Zeilen in Card-Objekte (ohne id/deckId) um */
export function csvRowsToCards(
  rows: CsvCardRow[],
): Omit<Card, 'id' | 'deckId' | 'createdAt' | 'updatedAt'>[] {
  return rows.map((r) => ({
    front: r.front,
    back: r.back,
    knowledgeScore: DEFAULT_KNOWLEDGE_SCORE,
    reviewCount: 0,
    dueDate: r.dueDate,
    easinessFactor: r.easinessFactor,
    interval: r.interval,
    repetitions: r.interval > 0 ? 1 : 0,
  }));
}
