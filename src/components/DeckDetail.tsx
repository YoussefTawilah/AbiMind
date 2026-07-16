import { useCallback, useEffect, useRef, useState } from 'react';
import type { Card, Deck } from '../types';
import {
  createCard,
  deleteCard,
  getCardsByDeck,
  getDeck,
  getDeckStudyStatus,
  importCards,
  updateCard,
} from '../lib/repository';
import {
  csvRowsToCards,
  downloadCsv,
  exportDeckToCsv,
  parseCsvImport,
} from '../lib/csv';
import { CardTextContent } from './CardTextContent';

interface DeckDetailProps {
  deckId: string;
  onBack: () => void;
  onStartStudy: () => void;
  onAiGenerate: () => void;
}

export function DeckDetail({ deckId, onBack, onStartStudy, onAiGenerate }: DeckDetailProps) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [averageScore, setAverageScore] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [d, c, status] = await Promise.all([
        getDeck(deckId),
        getCardsByDeck(deckId),
        getDeckStudyStatus(deckId),
      ]);
      if (!d) {
        setLoadError('Deck nicht gefunden.');
        setDeck(null);
        setCards([]);
        return;
      }
      setDeck(d);
      setCards(c);
      setAverageScore(status.averageKnowledgeScore);
    } catch {
      setLoadError('Deck konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    await createCard(deckId, front, back);
    setFront('');
    setBack('');
    await refresh();
  }

  async function handleUpdate(cardId: string) {
    if (!editFront.trim() || !editBack.trim()) return;
    await updateCard(cardId, { front: editFront, back: editBack });
    setEditingId(null);
    await refresh();
  }

  async function handleDelete(cardId: string) {
    if (!confirm('Karte wirklich löschen?')) return;
    await deleteCard(cardId);
    await refresh();
  }

  function handleExport() {
    if (!deck) return;
    const csv = exportDeckToCsv(cards);
    downloadCsv(`${deck.name.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_')}.csv`, csv);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const { rows, errors } = parseCsvImport(text);
    setImportErrors(errors);

    if (rows.length > 0) {
      const cardData = csvRowsToCards(rows);
      await importCards(deckId, cardData);
      await refresh();
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  if (loading) {
    return <p className="text-body">Deck wird geladen …</p>;
  }

  if (loadError || !deck) {
    return (
      <div className="space-y-4">
        <p className="text-danger">{loadError ?? 'Deck nicht gefunden.'}</p>
        <button type="button" onClick={onBack} className="btn-secondary">
          ← Zurück zum Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 space-y-6 md:space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button type="button" onClick={onBack} className="link-back mb-3">
            ← Zurück zum Dashboard
          </button>
          <h2 className="text-display">{deck.name}</h2>
          <p className="mt-1 text-body">
            {cards.length} Karten · Ø Kenntnis: <span className="text-accent">{averageScore}%</span>
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onAiGenerate} className="btn-primary">
              KI Generator
            </button>
            <button
              type="button"
              onClick={onStartStudy}
              disabled={cards.length === 0}
              className="btn-success"
            >
              Lernen
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={cards.length === 0}
              className="btn-secondary"
            >
              Deck herunterladen
            </button>
            <label className="btn-secondary cursor-pointer">
              Datei importieren
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-caption text-text-secondary">
            Kompatibel mit Excel, Anki und anderen Karteikarten-Apps
          </p>
        </div>
      </div>

      {importErrors.length > 0 && (
        <div className="alert-warning">
          {importErrors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}

      <form onSubmit={handleCreate} className="panel border-accent/20">
        <h3 className="text-heading">Karte hinzufügen</h3>
        <p className="mb-5 mt-1 text-body">Vorderseite und Rückseite eingeben</p>
        <div className="space-y-4">
          <div>
            <label htmlFor="card-front" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Vorderseite
            </label>
            <input
              id="card-front"
              type="text"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Frage oder Begriff …"
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="card-back" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Rückseite
            </label>
            <textarea
              id="card-back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Antwort oder Definition …"
              rows={3}
              className="input-field"
            />
          </div>
          <button type="submit" disabled={!front.trim() || !back.trim()} className="btn-primary px-5 py-2.5">
            Karte hinzufügen
          </button>
        </div>
      </form>

      <section>
        <h3 className="text-heading mb-4">Karten in diesem Deck ({cards.length})</h3>
        {cards.length === 0 ? (
          <p className="text-body">
            Noch keine Karten. Füge oben manuell eine Karte hinzu oder nutze den KI Generator.
          </p>
        ) : (
          <ul className="space-y-3">
            {cards.map((card) => (
              <li key={card.id} className="panel">
                {editingId === card.id ? (
                  <div className="space-y-3">
                    <input
                      value={editFront}
                      onChange={(e) => setEditFront(e.target.value)}
                      className="input-field"
                    />
                    <textarea
                      value={editBack}
                      onChange={(e) => setEditBack(e.target.value)}
                      rows={2}
                      className="input-field"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleUpdate(card.id)} className="btn-primary">
                        Speichern
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="btn-ghost">
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-subheading">{card.front}</p>
                      <CardTextContent
                        text={card.back}
                        className="mt-1.5 text-body text-text-primary/80"
                      />
                      {card.tag && (
                        <span className="mt-2 inline-block rounded-full bg-accent-muted px-2.5 py-0.5 text-xs text-accent">
                          {card.tag}
                        </span>
                      )}
                      <p className="mt-2 text-caption">
                        Kenntnis-Score: {card.knowledgeScore}% · Bewertungen: {card.reviewCount}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(card.id);
                          setEditFront(card.front);
                          setEditBack(card.back);
                        }}
                        className="btn-ghost"
                      >
                        Bearbeiten
                      </button>
                      <button type="button" onClick={() => handleDelete(card.id)} className="btn-danger">
                        Löschen
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
