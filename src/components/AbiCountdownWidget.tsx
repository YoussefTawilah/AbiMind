import type { UserProfile } from '../types';
import { formatAbiContext } from '../lib/abiProfile';
import { formatCountdown } from '../lib/analytics';

interface AbiCountdownWidgetProps {
  profile: UserProfile;
}

export function AbiCountdownWidget({ profile }: AbiCountdownWidgetProps) {
  if (!profile.firstWrittenExamDate) return null;

  const context = formatAbiContext(profile);
  const countdown = formatCountdown(profile.firstWrittenExamDate);

  return (
    <section className="panel border-accent/30 bg-gradient-to-br from-surface-elevated to-surface-overlay">
      <p className="text-caption font-medium uppercase tracking-wide text-accent">
        Abi-Countdown
      </p>
      <p className="stat-value mt-2">{countdown}</p>
      <p className="mt-1 text-subheading">bis zur ersten schriftlichen Abiturprüfung</p>
      {context && <p className="mt-2 text-body">{context}</p>}
      <p className="mt-1 text-caption text-text-tertiary">{profile.firstWrittenExamDate}</p>
    </section>
  );
}
