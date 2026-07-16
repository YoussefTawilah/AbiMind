import { useCallback, useEffect, useRef, useState } from 'react';
import { CardTextContent } from './CardTextContent';
import type { Card, Deck, ReviewQuality } from '../types';
import {
  getDeck,
  getStudyQueue,
  getDeckStudyStatus,
  reviewCard,
  logStudySession,
} from '../lib/repository';
import {
  buildNextSessionBatch,
  countSeenInSession,
  formatSessionBatchLabel,
  initDeckSession,
  recordSessionRating,
  type DeckSessionState,
} from '../lib/sessionBatch';

interface StudySessionProps {
  deckId: string;
  onBack: () => void;
  onFinish: () => void;
}

const QUALITY_LABELS: Record<ReviewQuality, string> = {
  1: '1 – Vergessen',
  2: '2 – Schwer',
  3: '3 – Mühsam',
  4: '4 – Gut',
  5: '5 – Perfekt',
};

const QUALITY_BUTTON_COLORS: Record<ReviewQuality, string> = {
  1: 'bg-score-1 hover:bg-score-1-hover',
  2: 'bg-score-2 hover:bg-score-2-hover',
  3: 'bg-score-3 hover:bg-score-3-hover text-text-inverse',
  4: 'bg-score-4 hover:bg-score-4-hover text-text-inverse',
  5: 'bg-score-5 hover:bg-score-5-hover',
};

const DOT_COLORS: Record<ReviewQuality, string> = {
  1: 'bg-score-1',
  2: 'bg-score-2',
  3: 'bg-score-3',
  4: 'bg-score-4',
  5: 'bg-score-5',
};

const LEARN_HINT =
  'Lernmodus: Jede Bewertung aktualisiert deinen Kenntnis-Score. 7 Karten pro Stapel – danach geht es automatisch weiter.';

interface BatchProgressDotsProps {
  cards: Card[];
  ratings: Record<string, ReviewQuality>;
  currentCardId: string | undefined;
}

function BatchProgressDots({ cards, ratings, currentCardId }: BatchProgressDotsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 px-2">
      {cards.map((card) => {
        const rating = ratings[card.id];
        const isCurrent = card.id === currentCardId;
        const color = rating ? DOT_COLORS[rating] : 'bg-score-neutral';

        return (
          <div
            key={card.id}
            className={`h-3.5 w-3.5 rounded-full transition-all ${color} ${
              isCurrent
                ? 'scale-125 ring-2 ring-surface-raised ring-offset-2 ring-offset-surface-base'
                : ''
            }`}
            title={
              rating
                ? `Letzte Bewertung in dieser Session: ${rating}`
                : 'In diesem Stapel noch nicht bewertet'
            }
          />
        );
      })}
    </div>
  );
}

export function StudySession({ deckId, onBack, onFinish }: StudySessionProps) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [batchCards, setBatchCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionAverageScore, setSessionAverageScore] = useState(0);
  const [loading, setLoading] = useState(true);

  const [sessionRatings, setSessionRatings] = useState<Record<string, ReviewQuality>>({});
  const [sessionComplete, setSessionComplete] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  const sessionStateRef = useRef<DeckSessionState | null>(null);
  const batchCardsRef = useRef<Card[]>([]);
  const studyStartRef = useRef<number | null>(null);
  const studyTimeLoggedRef = useRef(false);

  const flushStudyTime = useCallback(async () => {
    if (studyTimeLoggedRef.current || studyStartRef.current === null) return;
    const seconds = Math.round((Date.now() - studyStartRef.current) / 1000);
    if (seconds < 1) return;
    studyTimeLoggedRef.current = true;
    try {
      await logStudySession(deckId, seconds);
    } catch (err) {
      console.warn('[AbiMind] Lernzeit konnte nicht gespeichert werden', err);
    }
  }, [deckId]);

  useEffect(() => {
    studyStartRef.current = Date.now();
    studyTimeLoggedRef.current = false;
    return () => {
      void flushStudyTime();
    };
  }, [flushStudyTime]);

  const leaveSession = useCallback(
    async (go: () => void) => {
      await flushStudyTime();
      go();
    },
    [flushStudyTime],
  );

  const [deckTotalCards, setDeckTotalCards] = useState(0);
  const [batchLabel, setBatchLabel] = useState('');

  const startNextBatch = useCallback((state: DeckSessionState) => {
    const result = buildNextSessionBatch(state);
    sessionStateRef.current = result.state;

    if (!result.batch) {
      setSessionComplete(true);
      setDone(true);
      return;
    }

    batchCardsRef.current = result.batch;
    setBatchCards(result.batch);
    setCurrentIndex(0);
    setFlipped(false);
    setRateError(null);
    setBatchLabel(
      formatSessionBatchLabel(
        result.state.batchNumber,
        countSeenInSession(result.state),
        result.state.orderedDeck.length,
        result.batch.length,
      ),
    );
  }, []);

  const beginBatchSession = useCallback((orderedDeck: Card[]) => {
    setDeckTotalCards(orderedDeck.length);
    setSessionComplete(false);
    setSessionRatings({});
    const state = initDeckSession(orderedDeck);
    sessionStateRef.current = state;

    const first = buildNextSessionBatch(state);
    sessionStateRef.current = first.state;

    if (!first.batch) {
      setBatchCards([]);
      setDone(orderedDeck.length === 0);
      return;
    }

    batchCardsRef.current = first.batch;
    setBatchCards(first.batch);
    setCurrentIndex(0);
    setFlipped(false);
    setRateError(null);
    setBatchLabel(
      formatSessionBatchLabel(
        first.state.batchNumber,
        countSeenInSession(first.state),
        orderedDeck.length,
        first.batch.length,
      ),
    );
    setDone(false);
  }, []);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    const d = await getDeck(deckId);
    setDeck(d ?? null);

    const [orderedDeck, status] = await Promise.all([
      getStudyQueue(deckId),
      getDeckStudyStatus(deckId),
    ]);
    beginBatchSession(orderedDeck);
    setSessionAverageScore(status.averageKnowledgeScore);
    setReviewedCount(0);
    setLoading(false);
  }, [deckId, beginBatchSession]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const current = batchCards[currentIndex];

  async function handleRate(quality: ReviewQuality) {
    if (!current || !sessionStateRef.current) return;

    try {
      await reviewCard(current.id, quality);
    } catch (err) {
      console.error('[AbiMind] Bewertung fehlgeschlagen', err);
      setRateError(
        err instanceof Error ? err.message : 'Bewertung konnte nicht gespeichert werden.',
      );
      return;
    }

    setRateError(null);
    setSessionRatings((prev) => ({ ...prev, [current.id]: quality }));
    setReviewedCount((n) => n + 1);
    setFlipped(false);

    sessionStateRef.current = recordSessionRating(
      sessionStateRef.current,
      current,
      quality,
    );

    const atEndOfBatch = currentIndex + 1 >= batchCardsRef.current.length;

    if (!atEndOfBatch) {
      setCurrentIndex((i) => i + 1);
      return;
    }

    const status = await getDeckStudyStatus(deckId);
    setSessionAverageScore(status.averageKnowledgeScore);
    startNextBatch(sessionStateRef.current);
  }

  if (loading || !deck) {
    return <p className="text-body">Wird geladen …</p>;
  }

  if (done) {
    const wasEmptyFromStart = reviewedCount === 0 && batchCards.length === 0;

    return (
      <div className="flex flex-col items-center gap-5 py-12 text-center">
        <p className="text-display text-2xl">
          {wasEmptyFromStart
            ? 'Keine Karten in diesem Deck'
            : sessionComplete
              ? 'Lernsession abgeschlossen!'
              : 'Session beendet!'}
        </p>

        {wasEmptyFromStart ? (
          <p className="text-body">Füge zuerst Karten hinzu, bevor du lernen kannst.</p>
        ) : (
          <p className="max-w-md text-body">
            {sessionComplete ? (
              <>
                Alle {deckTotalCards} Karte{deckTotalCards === 1 ? '' : 'n'} waren mindestens einmal
                dran
                {sessionAverageScore > 0 && (
                  <> · Deck-Durchschnitt jetzt: {sessionAverageScore}%</>
                )}
              </>
            ) : (
              <>
                Du hast {reviewedCount} Karte{reviewedCount === 1 ? '' : 'n'} bewertet.
              </>
            )}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => void leaveSession(onBack)} className="btn-secondary">
            Zurück zum Deck
          </button>
          <button type="button" onClick={() => void leaveSession(onFinish)} className="btn-primary">
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2 gap-y-1">
        <button type="button" onClick={() => void leaveSession(onBack)} className="link-back shrink-0">
          ← Abbrechen
        </button>
        <span className="min-w-0 text-right text-xs text-body sm:text-sm">
          {`${batchLabel} · ${currentIndex + 1}/${batchCards.length} im Stapel`}
        </span>
      </div>

      {batchCards.length > 0 && (
        <>
          <BatchProgressDots
            cards={batchCards}
            ratings={sessionRatings}
            currentCardId={current?.id}
          />
          {rateError && <p className="alert-error text-center">{rateError}</p>}
          <p className="rounded-lg border border-accent/20 bg-accent-subtle px-4 py-2.5 text-center text-sm text-accent">
            {LEARN_HINT}
          </p>
        </>
      )}

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="panel mx-auto flex min-h-56 w-full max-w-lg cursor-pointer flex-col items-center justify-center rounded-2xl p-5 transition-colors hover:border-border-default hover:bg-surface-overlay sm:min-h-72 sm:p-8"
      >
        <p className="mb-3 text-caption uppercase tracking-wide">
          {flipped ? 'Rückseite' : 'Vorderseite'} · Klicken zum Umdrehen
        </p>
        <CardTextContent
          text={flipped ? current?.back ?? '' : current?.front ?? ''}
          className={`text-xl font-medium leading-relaxed text-text-primary ${
            flipped ? 'text-left' : 'text-center'
          }`}
        />
      </button>

      {flipped && (
        <div className="mx-auto max-w-lg space-y-3">
          <p className="text-center text-body text-text-secondary">
            Wie gut hast du die Antwort gewusst?
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {([1, 2, 3, 4, 5] as ReviewQuality[]).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleRate(q)}
                className={`rounded-lg px-2 py-2.5 text-[10px] font-medium leading-tight text-white transition-colors sm:py-3 sm:text-xs ${QUALITY_BUTTON_COLORS[q]}`}
              >
                {QUALITY_LABELS[q]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
