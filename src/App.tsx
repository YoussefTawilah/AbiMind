import { useEffect, useState } from 'react';
import type { AppView, MainNavSection } from './types';
import { Dashboard } from './components/Dashboard';
import { DeckDetail } from './components/DeckDetail';
import { StudySession } from './components/StudySession';
import { AiGenerator } from './components/AiGenerator';
import { AuthScreen } from './components/AuthScreen';
import { AppHeader } from './components/AppHeader';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ExamPlannerDashboard } from './components/ExamPlannerDashboard';
import { ImportPromptModal } from './components/ImportPromptModal';
import { AbiOnboardingModal } from './components/AbiOnboardingModal';
import { InstallPrompt } from './components/InstallPrompt';
import { useAuth } from './contexts/AuthContext';

function getActiveNavSection(view: AppView): MainNavSection | null {
  switch (view.type) {
    case 'dashboard':
    case 'deck':
    case 'study':
    case 'ai-generate':
      return 'learn';
    case 'exam-planner':
      return 'exam-planner';
    case 'analytics':
      return 'analytics';
    case 'auth':
      return null;
  }
}

function App() {
  const [view, setView] = useState<AppView>({ type: 'dashboard' });
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const { syncState } = useAuth();

  useEffect(() => {
    if (syncState === 'ready') {
      setDashboardRefreshKey((k) => k + 1);
    }
  }, [syncState]);

  function goToDashboard() {
    setDashboardRefreshKey((k) => k + 1);
    setView({ type: 'dashboard' });
  }

  function navigateToSection(section: MainNavSection) {
    switch (section) {
      case 'learn':
        goToDashboard();
        break;
      case 'exam-planner':
        setView({ type: 'exam-planner' });
        break;
      case 'analytics':
        setView({ type: 'analytics' });
        break;
    }
  }

  const activeSection = getActiveNavSection(view);
  const showNav = view.type !== 'auth';

  return (
    <div className="min-h-screen bg-surface-base">
      <AppHeader
        activeSection={activeSection}
        showNav={showNav}
        streakRefreshKey={dashboardRefreshKey}
        onNavigate={navigateToSection}
        onGoHome={goToDashboard}
        onOpenAuth={() => setView({ type: 'auth' })}
      />

      <main className="mx-auto max-w-content px-4 py-8 text-left">
        {view.type === 'auth' && (
          <AuthScreen onGuestContinue={goToDashboard} />
        )}

        {view.type === 'dashboard' && (
          <Dashboard
            refreshKey={dashboardRefreshKey}
            onOpenDeck={(deckId) => setView({ type: 'deck', deckId })}
            onStartStudy={(deckId) => setView({ type: 'study', deckId })}
          />
        )}

        {view.type === 'exam-planner' && <ExamPlannerDashboard />}

        {view.type === 'analytics' && <AnalyticsDashboard />}

        {view.type === 'deck' && (
          <DeckDetail
            deckId={view.deckId}
            onBack={goToDashboard}
            onStartStudy={() => setView({ type: 'study', deckId: view.deckId })}
            onAiGenerate={() => setView({ type: 'ai-generate', deckId: view.deckId })}
          />
        )}

        {view.type === 'ai-generate' && (
          <AiGenerator
            deckId={view.deckId}
            onBack={() => setView({ type: 'deck', deckId: view.deckId })}
            onSaved={() => setView({ type: 'deck', deckId: view.deckId })}
          />
        )}

        {view.type === 'study' && (
          <StudySession
            key={`study-${view.deckId}`}
            deckId={view.deckId}
            onBack={() => setView({ type: 'deck', deckId: view.deckId })}
            onFinish={goToDashboard}
          />
        )}
      </main>

      <ImportPromptModal />
      <AbiOnboardingModal />
      <InstallPrompt />
    </div>
  );
}

export default App;
