import { useEffect, useState } from 'react';
import { getStudyStreakStats } from '../lib/analytics';
import type { StreakStats } from '../lib/streak';
import { isDataReady, useAuth } from '../contexts/AuthContext';

interface StreakBadgeProps {
  refreshKey?: number;
}

/** Kompakte Streak-Anzeige für den Header (🔥 + Zahl) */
export function StreakBadge({ refreshKey = 0 }: StreakBadgeProps) {
  const { status, syncState } = useAuth();
  const dataReady = isDataReady(status, syncState);
  const [streak, setStreak] = useState<StreakStats | null>(null);

  useEffect(() => {
    if (!dataReady) {
      setStreak(null);
      return;
    }
    void getStudyStreakStats()
      .then(setStreak)
      .catch(() => setStreak(null));
  }, [dataReady, syncState, refreshKey]);

  if (!streak || streak.currentStreak === 0) return null;

  const label = `${streak.currentStreak} Tag${streak.currentStreak === 1 ? '' : 'e'} in Folge gelernt`;

  return (
    <span
      title={label}
      aria-label={label}
      className="mt-1 inline-flex shrink-0 items-center gap-0.5 text-caption text-text-secondary"
    >
      <span aria-hidden>🔥</span>
      <span className="tabular-nums font-medium">{streak.currentStreak}</span>
    </span>
  );
}
