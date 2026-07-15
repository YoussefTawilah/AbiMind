/**
 * Abimind – zentrale TypeScript-Typen
 *
 * Diese Datei definiert das Datenmodell für Phase 1.
 * Spätere Phasen (Login, Cloud-Sync, KI) können hier erweitert werden,
 * ohne bestehende Felder zu brechen.
 */

/** Ein Ordner zur Gruppierung von Decks */
export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** Ein Deck (Karteikarten-Stapel) */
export interface Deck {
  id: string;
  name: string;
  /** Optional: Zuordnung zu einem Ordner; fehlt/null = oberste Ebene */
  folderId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Eine einzelne Karteikarte.
 *
 * Kenntnis-Score (aktuelles System):
 * - knowledgeScore: 0–100, wie gut die Karte sitzt (niedrig = öfter üben)
 * - reviewCount: Anzahl Lernmodus-Bewertungen (0 = nie gelernt → hohe Priorität)
 *
 * SM-2-Felder (veraltet, nur noch für CSV/Legacy-Kompatibilität):
 * - easinessFactor, interval, repetitions, dueDate
 */
export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  /** KI-generiertes Tag/Kategorie, optional für ältere Karten */
  tag?: string;
  /** Kenntnis-Score 0–100 (Standard: 50) */
  knowledgeScore: number;
  /** Anzahl SM-2-Lernmodus-Bewertungen */
  reviewCount: number;
  /** @deprecated SM-2 – nicht mehr für Kartenauswahl */
  easinessFactor: number;
  /** @deprecated SM-2 */
  interval: number;
  /** @deprecated SM-2 */
  repetitions: number;
  /** @deprecated SM-2 */
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

/** Bewertungsskala im Lernmodus: 1 = vergessen … 5 = perfekt */
export type ReviewQuality = 1 | 2 | 3 | 4 | 5;

/** Lernmodus-Kennzeichnung in ReviewLogs; practice nur noch für ältere Einträge */
export type StudyMode = 'sm2' | 'practice';

/**
 * Protokoll einer einzelnen Lern-Bewertung.
 * Wird für Statistiken und spätere Analysen gespeichert.
 */
export interface ReviewLog {
  id: string;
  cardId: string;
  deckId: string;
  quality: ReviewQuality;
  /** sm2 = Lernmodus (aktualisiert Kenntnis-Score); practice = nur Protokoll */
  mode: StudyMode;
  /** Score vor der Bewertung */
  previousKnowledgeScore: number;
  /** Score nach der Bewertung (bei practice = unverändert) */
  newKnowledgeScore: number;
  /** @deprecated SM-2 – nur noch für ältere Logs */
  previousEasinessFactor: number;
  /** @deprecated SM-2 */
  newEasinessFactor: number;
  /** @deprecated SM-2 */
  previousInterval: number;
  /** @deprecated SM-2 */
  newInterval: number;
  reviewedAt: string; // ISO-8601
}

/** Ergebnis einer SM-2-Berechnung – wird auf eine Karte angewendet */
export interface Sm2Result {
  easinessFactor: number;
  interval: number;
  repetitions: number;
  dueDate: string;
}

/** Aggregierte Deck-Statistiken fürs Dashboard */
export interface DeckStats {
  deckId: string;
  totalCards: number;
  /** Durchschnittlicher Kenntnis-Score 0–100 */
  averageKnowledgeScore: number;
  /** Karten mit mindestens einer Lernmodus-Bewertung */
  reviewedCards: number;
}

/** Zeile im CSV-Export/-Import */
export interface CsvCardRow {
  front: string;
  back: string;
  dueDate: string;
  easinessFactor: number;
  interval: number;
}

/** Hauptnavigation (Header-Tabs) */
export type MainNavSection = 'learn' | 'exam-planner' | 'analytics';

/** App-Ansichten (einfaches View-Routing ohne react-router) */
export type AppView =
  | { type: 'dashboard' }
  | { type: 'exam-planner' }
  | { type: 'analytics' }
  | { type: 'deck'; deckId: string }
  | { type: 'study'; deckId: string }
  | { type: 'ai-generate'; deckId: string }
  | { type: 'auth' };

/** Von der KI generierte Karte (noch nicht gespeichert) */
export interface GeneratedCard {
  front: string;
  back: string;
  tag: string;
}

/** Klausur, Abgabe oder anderes Uni-Event */
export interface UniversityEvent {
  id: string;
  title: string;
  /** Datum im Format YYYY-MM-DD */
  eventDate: string;
  /** Optional: Fach oder Kurs */
  subject?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** Protokoll einer abgeschlossenen Lernsession (Zeittracking) */
export interface StudySessionLog {
  id: string;
  deckId: string;
  /** Verbrachte Zeit in Sekunden */
  durationSeconds: number;
  /** Zeitpunkt des Session-Endes (ISO-8601) */
  endedAt: string;
  createdAt: string;
}

/** Aggregierte Lernzeit für Analytics */
export interface StudyTimeStats {
  totalSeconds: number;
  byDeck: { deckId: string; deckName: string; seconds: number }[];
}

/** Kenntnis-Box für PieChart (Leitner-ähnliche Einteilung) */
export interface KnowledgeBoxSlice {
  name: string;
  value: number;
  fill: string;
}

/** Persönliche Abitur-Angaben für Countdown & Prüfungsplaner-Sync */
export interface UserProfile {
  id: string;
  bundesland?: string;
  abiturYear?: number;
  /** Datum der ersten schriftlichen Prüfung (YYYY-MM-DD) */
  firstWrittenExamDate?: string;
  /** Verknüpfter Eintrag im Prüfungsplaner */
  linkedUniversityEventId?: string;
  /** true nach Speichern oder Überspringen des Onboardings */
  onboardingDismissed: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Die 16 deutschen Bundesländer */
export const GERMAN_STATES = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
] as const;
