import { useCallback, useEffect, useState } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { Deck } from '../types';
import { getAllDecks, getCardsByDeck } from '../lib/repository';
import {
  formatStudyDuration,
  formatStudyHours,
  getStudyStreakStats,
  getStudyTimeStats,
  type StreakStats,
} from '../lib/analytics';
import { buildKnowledgeBoxSlices, totalCardsInSlices } from '../lib/knowledgeBuckets';
import {
  CHART_LEGEND_STYLE,
  CHART_TOOLTIP_STYLE,
  SURFACE_BASE,
} from '../lib/designTokens';
import { isDataReady, useAuth } from '../contexts/AuthContext';

export function AnalyticsDashboard() {
  const { status, syncState } = useAuth();
  const dataReady = isDataReady(status, syncState);

  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [byDeck, setByDeck] = useState<{ deckId: string; deckName: string; seconds: number }[]>([]);
  const [pieData, setPieData] = useState<{ name: string; value: number; fill: string }[]>([]);
  const [streak, setStreak] = useState<StreakStats>({
    currentStreak: 0,
    longestStreak: 0,
    studiedToday: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalCards = totalCardsInSlices(pieData);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [deckList, timeStats, streakStats] = await Promise.all([
        getAllDecks(),
        getStudyTimeStats(),
        getStudyStreakStats(),
      ]);
      setDecks(deckList);
      setTotalSeconds(timeStats.totalSeconds);
      setByDeck(timeStats.byDeck);
      setStreak(streakStats);
      setSelectedDeckId((prev) => prev || deckList[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analytics konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!dataReady) return;
    void refresh();
  }, [refresh, dataReady]);

  useEffect(() => {
    if (!selectedDeckId || !dataReady) {
      setPieData([]);
      return;
    }
    void getCardsByDeck(selectedDeckId)
      .then((cards) => setPieData(buildKnowledgeBoxSlices(cards)))
      .catch(() => setPieData([]));
  }, [selectedDeckId, dataReady]);

  if (!dataReady) {
    return <p className="text-body">Cloud-Daten werden geladen …</p>;
  }

  if (loading) {
    return <p className="text-body">Analytics werden geladen …</p>;
  }

  return (
    <div className="mx-auto w-full min-w-0 space-y-6 md:space-y-8">
      <div>
        <h2 className="text-display">Analytics</h2>
        <p className="mt-2 text-body">Lernzeit und Wissensstand auf einen Blick.</p>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <section className="panel">
        <h3 className="text-heading">Lern-Streak</h3>
        <p className="stat-value mt-3">
          {streak.currentStreak > 0 ? (
            <>
              <span aria-hidden>🔥 </span>
              {streak.currentStreak} Tag{streak.currentStreak === 1 ? '' : 'e'} in Folge
            </>
          ) : (
            'Noch keine Serie'
          )}
        </p>
        <p className="text-body">
          Beste Serie: {streak.longestStreak} Tag{streak.longestStreak === 1 ? '' : 'e'}
        </p>
      </section>

      <section className="panel">
        <h3 className="text-heading">Lernzeit</h3>
        <p className="stat-value mt-3">{formatStudyHours(totalSeconds)}</p>
        <p className="text-body">Gesamt im Lernmodus getrackt</p>
        {byDeck.length > 0 ? (
          <ul className="mt-5 space-y-2">
            {byDeck.map((row) => (
              <li
                key={row.deckId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-overlay px-3 py-2.5 text-sm"
              >
                <span className="min-w-0 truncate font-medium text-text-primary">{row.deckName}</span>
                <span className="tabular-nums text-text-secondary">
                  {formatStudyDuration(row.seconds)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-body">Noch keine Lernzeit erfasst.</p>
        )}
      </section>

      <section className="panel">
        <h3 className="text-heading">Wissensstand</h3>
        {decks.length === 0 ? (
          <p className="mt-4 text-body">Erstelle zuerst ein Deck mit Karten.</p>
        ) : (
          <>
            <label className="mt-4 block text-body">
              Deck auswählen
              <select
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
                className="input-field mt-1.5"
              >
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
            </label>

            {pieData.length === 0 ? (
              <p className="mt-4 text-body">Keine Karten in diesem Deck.</p>
            ) : (
              <div className="relative mt-5 h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="58%"
                      outerRadius="82%"
                      paddingAngle={3}
                      stroke={SURFACE_BASE}
                      strokeWidth={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      itemStyle={{ color: CHART_TOOLTIP_STYLE.color }}
                      labelStyle={{ color: CHART_TOOLTIP_STYLE.color }}
                    />
                    <Legend verticalAlign="bottom" wrapperStyle={CHART_LEGEND_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8">
                  <span className="text-4xl font-bold tabular-nums text-text-primary">
                    {totalCards}
                  </span>
                  <span className="mt-0.5 text-sm text-text-secondary">
                    Karte{totalCards === 1 ? '' : 'n'}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

