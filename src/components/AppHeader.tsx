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
    <header className="sticky top-0 z-40 w-full max-w-full overflow-x-hidden border-b border-border-subtle bg-surface-raised/90 backdrop-blur-md">
      <div
        className={`mx-auto w-full max-w-content px-4 md:px-8 ${
          showNav
            ? 'grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-3 gap-y-2 py-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:grid-rows-1 md:gap-x-4'
            : 'flex items-center justify-between gap-3 py-3'
        }`}
      >
        <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onGoHome}
            className="flex min-w-0 items-center gap-2.5 text-left transition-opacity hover:opacity-90 sm:gap-3"
          >
            <img
              src="/logo-neu.png"
              alt="AbiMind"
              className="h-10 w-10 shrink-0 rounded-xl object-contain sm:h-12 sm:w-12"
            />
            <span className="min-w-0">
              <span className="block text-base font-semibold text-accent sm:text-lg">AbiMind</span>
              <span className="block text-[11px] leading-snug text-text-secondary sm:text-xs">
                Lerne smarter, nicht länger.
              </span>
            </span>
          </button>
          {showNav && <StreakBadge refreshKey={streakRefreshKey} />}
        </div>

        {showNav && (
          <nav
            className="col-span-2 row-start-2 flex w-full min-w-0 items-stretch gap-0.5 md:col-span-1 md:col-start-2 md:row-start-1 md:justify-center md:gap-1"
            aria-label="Hauptnavigation"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`min-w-0 flex-1 rounded-lg px-1.5 py-1.5 text-center text-[11px] font-medium leading-tight transition-colors sm:text-xs md:flex-none md:px-4 md:py-2 md:text-sm ${
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

        <div className={`shrink-0 ${showNav ? 'col-start-2 row-start-1 justify-self-end md:col-start-3' : ''}`}>
          <UserProfileDropdown onOpenAuth={onOpenAuth} />
        </div>
      </div>
    </header>
  );
}
