import { useAuth } from '../contexts/AuthContext';
import type { LocalImportSummary } from '../lib/sync';

function formatImportParts(summary: LocalImportSummary): string {
  const parts: string[] = [];
  if (summary.decks > 0) {
    parts.push(`${summary.decks} Deck${summary.decks === 1 ? '' : 's'}`);
  }
  if (summary.universityEvents > 0) {
    parts.push(`${summary.universityEvents} Termin${summary.universityEvents === 1 ? '' : 'e'}`);
  }
  if (summary.studySessions > 0) {
    parts.push(`${summary.studySessions} Lernsession${summary.studySessions === 1 ? '' : 's'}`);
  }
  return parts.join(', ');
}

export function ImportPromptModal() {
  const { syncState, localImportSummary, syncError, confirmImport, declineImport } = useAuth();

  if (syncState !== 'prompt_import' && syncState !== 'importing') return null;
  if (!localImportSummary) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-prompt-title"
    >
      <div className="panel w-full max-w-md shadow-[0_8px_32px_#00000060]">
        <h2 id="import-prompt-title" className="text-heading">
          Lokale Daten übernehmen?
        </h2>
        <p className="mt-3 text-body">
          Du hast lokale Daten auf diesem Gerät: {formatImportParts(localImportSummary)}. Möchtest
          du alles in dein Konto hochladen? Danach sind deine Daten in der Cloud gespeichert.
        </p>
        <p className="mt-2 text-caption">
          Bei „Nein" startest du mit einem leeren Konto. Die lokalen Daten bleiben im Browser und
          sind wieder verfügbar, wenn du dich abmeldest.
        </p>

        {syncError && <p className="alert-error mt-4">{syncError}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => void confirmImport()}
            disabled={syncState === 'importing'}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {syncState === 'importing' ? 'Wird hochgeladen …' : 'Ja, übernehmen'}
          </button>
          <button
            type="button"
            onClick={declineImport}
            disabled={syncState === 'importing'}
            className="btn-secondary flex-1 disabled:opacity-50"
          >
            Nein
          </button>
        </div>
      </div>
    </div>
  );
}
