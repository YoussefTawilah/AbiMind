import type { MainNavSection } from '../types';
import { UserProfileDropdown } from './UserProfileDropdown';
import { StreakBadge } from './StreakBadge';

const NAV_ITEMS: { id: MainNavSection; label: string }[] = [
  { id: 'learn', label: 'Lernen' },
  { id: 'exam-planner', label: 'Prüfungsplaner' },
  { id: 'analytics', label: 'Analytics' },
];

interface AppHeaderProps {
  activeSection: MainNavSection | null;
  showNav: boolean;
  streakRefreshKey?: number;
  onNavigate: (section: MainNavSection) => void;
  onGoHome: () => void;
  onOpenAuth: () => void;
}

export function AppHeader({
  activeSection,
  showNav,
  streakRefreshKey = 0,
  onNavigate,
  onGoHome,
  onOpenAuth,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-raised/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-3">
        <div className="flex shrink-0 items-start gap-2">
          <button
            type="button"
            onClick={onGoHome}
            className="text-left transition-opacity hover:opacity-90"
          >
            <span className="block text-lg font-semibold text-accent">AbiMind</span>
            <span className="block text-xs text-text-secondary">
              Lerne smarter, nicht länger.
            </span>
          </button>
          {showNav && <StreakBadge refreshKey={streakRefreshKey} />}
        </div>

        {showNav && (
          <nav
            className="flex flex-1 items-center justify-center gap-1 sm:gap-2"
            aria-label="Hauptnavigation"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 sm:py-2 ${
                    isActive
                      ? 'bg-accent-subtle text-accent'
                      : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}

        <div className="shrink-0">
          <UserProfileDropdown onOpenAuth={onOpenAuth} />
        </div>
      </div>
    </header>
  );
}
