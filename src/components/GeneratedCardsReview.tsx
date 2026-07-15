import { useMemo, useState } from 'react';
import type { GeneratedCard } from '../types';
import { findDuplicatesForCards, type DuplicateMatch } from '../lib/duplicate-check';
import { CardTextContent } from './CardTextContent';

interface GeneratedCardsReviewProps {
  cards: GeneratedCard[];
  existingFronts: string[];
  onChange: (cards: GeneratedCard[]) => void;
  onSave: (cards: GeneratedCard[]) => void;
  onCancel: () => void;
  saving?: boolean;
}

function DuplicateWarning({ match }: { match: DuplicateMatch }) {
  const label =
    match.similarity === 'exact'
      ? 'Gleiche Karte existiert bereits'
      : 'Ähnliche Karte existiert bereits';

  return (
    <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <span className="font-medium">{label}:</span>{' '}
      <span className="text-amber-800">„{match.existingFront}"</span>
    </div>
  );
}

export function GeneratedCardsReview({
  cards,
  existingFronts,
  onChange,
  onSave,
  onCancel,
  saving,
}: GeneratedCardsReviewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<GeneratedCard | null>(null);

  const duplicateMatches = useMemo(
    () => findDuplicatesForCards(
      cards.map((c) => c.front),
      existingFronts,
    ),
    [cards, existingFronts],
  );

  const duplicateCount = duplicateMatches.filter(Boolean).length;

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditDraft({ ...cards[index] });
  }

  function saveEdit() {
    if (editingIndex === null || !editDraft) return;
    const updated = [...cards];
    updated[editingIndex] = editDraft;
    onChange(updated);
    setEditingIndex(null);
    setEditDraft(null);
  }

  function removeCard(index: number) {
    onChange(cards.filter((_, i) => i !== index));
    setEditingIndex(null);
  }

  const tags = [...new Set(cards.map((c) => c.tag))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            {cards.length} Karten zur Überprüfung
          </h3>
          <p className="text-sm text-slate-500">
            Bearbeite oder lösche Karten, bevor du sie speicherst.
          </p>
          {duplicateCount > 0 && (
            <p className="mt-1 text-sm font-medium text-amber-700">
              {duplicateCount} mögliche Duplikat{duplicateCount === 1 ? '' : 'e'} erkannt – bitte
              prüfen
            </p>
          )}
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Verwerfen
          </button>
          <button
            type="button"
            onClick={() => onSave(cards)}
            disabled={saving || cards.length === 0}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Speichern …' : `${cards.length} Karten übernehmen`}
          </button>
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-slate-500">Alle Karten wurden entfernt.</p>
      ) : (
        <ul className="space-y-2">
          {cards.map((card, index) => {
            const dup = duplicateMatches[index];

            return (
              <li
                key={index}
                className={`rounded-xl p-4 shadow-sm ring-1 ${
                  dup
                    ? 'bg-amber-50/50 ring-amber-300'
                    : 'bg-white ring-slate-200'
                }`}
              >
                {editingIndex === index && editDraft ? (
                  <div className="space-y-2">
                    <input
                      value={editDraft.front}
                      onChange={(e) => setEditDraft({ ...editDraft, front: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Vorderseite"
                    />
                    <textarea
                      value={editDraft.back}
                      onChange={(e) => setEditDraft({ ...editDraft, back: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Rückseite"
                    />
                    <input
                      value={editDraft.tag}
                      onChange={(e) => setEditDraft({ ...editDraft, tag: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Tag"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingIndex(null)}
                        className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between gap-4">
                    <div className="flex-1 text-left">
                      <span className="mb-1 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                        {card.tag}
                      </span>
                      <p className="font-medium text-slate-800">{card.front}</p>
                      <CardTextContent text={card.back} className="mt-1 text-sm text-slate-600" />
                      {dup && <DuplicateWarning match={dup} />}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(index)}
                        className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                      >
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCard(index)}
                        className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        Entfernen
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
