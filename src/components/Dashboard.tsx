import { useCallback, useEffect, useState } from 'react';
import type { Deck, DeckStats, Folder } from '../types';
import {
  createDeck,
  createFolder,
  deleteDeck,
  deleteFolder,
  FOLDER_MIGRATION_HINT,
  getAllDecks,
  getAllFolders,
  isFolderSchemaReady,
  renameDeck,
  renameFolder,
  setDeckFolder,
} from '../lib/repository';
import { getDeckStatsList, getGlobalAverageKnowledgeScore } from '../lib/stats';
import { isDataReady, useAuth } from '../contexts/AuthContext';
import { useAbiProfile } from '../contexts/AbiProfileContext';
import { ProgressBar } from './ProgressBar';
import { AbiCountdownWidget } from './AbiCountdownWidget';

interface DashboardProps {
  onOpenDeck: (deckId: string) => void;
  onStartStudy: (deckId: string) => void;
  refreshKey?: number;
}

export function Dashboard({ onOpenDeck, onStartStudy, refreshKey = 0 }: DashboardProps) {
  const { status, syncState } = useAuth();
  const { profile, refresh: refreshAbiProfile } = useAbiProfile();
  const dataReady = isDataReady(status, syncState);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [stats, setStats] = useState<DeckStats[]>([]);
  const [globalAverage, setGlobalAverage] = useState(0);
  const [newDeckName, setNewDeckName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [editDeckName, setEditDeckName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [foldersNeedMigration, setFoldersNeedMigration] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setActionError(null);
      const [folderList, deckList, statsList, avg, folderReady] = await Promise.all([
        getAllFolders(),
        getAllDecks(),
        getDeckStatsList(),
        getGlobalAverageKnowledgeScore(),
        isFolderSchemaReady(),
      ]);
      setFolders(folderList);
      setDecks(deckList);
      setStats(statsList);
      setGlobalAverage(avg);
      setFoldersNeedMigration(!folderReady);
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        for (const folder of folderList) next.add(folder.id);
        return next;
      });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Daten konnten nicht geladen werden.',
      );
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && !dataReady) {
      setFolders([]);
      setDecks([]);
      setStats([]);
      setGlobalAverage(0);
      return;
    }
    if (!dataReady) return;
    refresh();
    void refreshAbiProfile();
  }, [refresh, refreshAbiProfile, refreshKey, dataReady, status]);

  const statsMap = Object.fromEntries(stats.map((s) => [s.deckId, s]));
  const rootDecks = decks.filter((d) => !d.folderId);

  function decksInFolder(folderId: string): Deck[] {
    return decks.filter((d) => d.folderId === folderId);
  }

  function toggleFolder(folderId: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }

  async function handleCreateDeck(e: React.FormEvent) {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    try {
      await createDeck(newDeckName);
      setNewDeckName('');
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Deck konnte nicht erstellt werden.');
    }
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName);
      setNewFolderName('');
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ordner konnte nicht erstellt werden.');
    }
  }

  async function handleRenameDeck(deckId: string) {
    if (!editDeckName.trim()) return;
    try {
      await renameDeck(deckId, editDeckName);
      setEditingDeckId(null);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Deck konnte nicht umbenannt werden.');
    }
  }

  async function handleRenameFolder(folderId: string) {
    if (!editFolderName.trim()) return;
    try {
      await renameFolder(folderId, editFolderName);
      setEditingFolderId(null);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ordner konnte nicht umbenannt werden.');
    }
  }

  async function handleDeleteDeck(deckId: string, name: string) {
    if (!confirm(`Deck „${name}" wirklich löschen? Alle Karten gehen verloren.`)) return;
    try {
      await deleteDeck(deckId);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Deck konnte nicht gelöscht werden.');
    }
  }

  async function handleDeleteFolder(folder: Folder) {
    const count = decksInFolder(folder.id).length;
    const msg =
      count > 0
        ? `Ordner „${folder.name}" löschen? Die ${count} Deck(s) darin bleiben erhalten und erscheinen auf der obersten Ebene.`
        : `Ordner „${folder.name}" wirklich löschen?`;
    if (!confirm(msg)) return;
    try {
      await deleteFolder(folder.id);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ordner konnte nicht gelöscht werden.');
    }
  }

  async function handleDeckFolderChange(deckId: string, folderId: string) {
    try {
      await setDeckFolder(deckId, folderId || null);
      await refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Ordner-Zuordnung konnte nicht gespeichert werden.',
      );
    }
  }

  function renderDeckItem(deck: Deck) {
    const s = statsMap[deck.id] ?? {
      totalCards: 0,
      averageKnowledgeScore: 0,
      reviewedCards: 0,
    };

    return (
      <li key={deck.id} className="panel">
        {editingDeckId === deck.id ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={editDeckName}
              onChange={(e) => setEditDeckName(e.target.value)}
              className="input-field"
              autoFocus
            />
            <button type="button" onClick={() => handleRenameDeck(deck.id)} className="btn-primary">
              Speichern
            </button>
            <button type="button" onClick={() => setEditingDeckId(null)} className="btn-ghost">
              Abbrechen
            </button>
          </div>
        ) : (
          <div
            className="flex cursor-pointer items-start justify-between gap-4 rounded-lg transition-colors hover:bg-accent-subtle"
            onClick={() => onOpenDeck(deck.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenDeck(deck.id);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Deck ${deck.name} öffnen`}
          >
            <div className="flex-1 text-left">
              <p className="text-subheading">{deck.name}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body">
                <span>{s.totalCards} Karten</span>
                <span>Ø Kenntnis: {s.averageKnowledgeScore}%</span>
                <span>{s.reviewedCards} bewertet</span>
              </div>
              <div className="mt-4">
                <ProgressBar learned={s.averageKnowledgeScore} total={100} label="Kenntnis-Score" />
              </div>
            </div>
            <div
              className="flex shrink-0 flex-col gap-1.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <label className="text-caption text-text-tertiary">
                Ordner
                <select
                  value={deck.folderId ?? ''}
                  onChange={(e) => handleDeckFolderChange(deck.id, e.target.value)}
                  className="input-field mt-1"
                >
                  <option value="">Kein Ordner</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={() => onOpenDeck(deck.id)} className="btn-primary">
                Öffnen
              </button>
              <button
                type="button"
                onClick={() => onStartStudy(deck.id)}
                disabled={s.totalCards === 0}
                className="btn-success"
              >
                Lernen
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingDeckId(deck.id);
                  setEditDeckName(deck.name);
                }}
                className="btn-ghost"
              >
                Umbenennen
              </button>
              <button
                type="button"
                onClick={() => handleDeleteDeck(deck.id, deck.name)}
                className="btn-danger"
              >
                Löschen
              </button>
            </div>
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-8 text-left">
      {!dataReady && <p className="text-body">Cloud-Daten werden geladen …</p>}
      {actionError && <div className="alert-error">{actionError}</div>}
      {foldersNeedMigration && <div className="alert-warning">{FOLDER_MIGRATION_HINT}</div>}

      {profile?.firstWrittenExamDate && <AbiCountdownWidget profile={profile} />}

      <section className="panel">
        <h2 className="text-heading">Durchschnittlicher Kenntnis-Score</h2>
        <p className="stat-value mt-3">{globalAverage}%</p>
        <p className="text-body">Über alle Decks und Karten</p>
        <div className="mt-5">
          <ProgressBar learned={globalAverage} total={100} label="Gesamt" />
        </div>
      </section>

      <section>
        <h2 className="text-heading mb-4">Ordner</h2>
        <form onSubmit={handleCreateFolder} className="mb-5 flex gap-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Neuer Ordner …"
            className="input-field"
          />
          <button type="submit" className="btn-primary shrink-0">
            Erstellen
          </button>
        </form>

        {folders.length === 0 ? (
          <p className="mb-6 text-body">
            Noch keine Ordner. Erstelle z. B. „Mathe" oder „Physik" zum Sortieren.
          </p>
        ) : (
          <div className="mb-8 space-y-3">
            {folders.map((folder) => {
              const expanded = expandedFolders.has(folder.id);
              const folderDecks = decksInFolder(folder.id);

              return (
                <div key={folder.id} className="panel-nested">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {editingFolderId === folder.id ? (
                      <div className="flex flex-1 gap-2">
                        <input
                          type="text"
                          value={editFolderName}
                          onChange={(e) => setEditFolderName(e.target.value)}
                          className="input-field"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameFolder(folder.id)}
                          className="btn-primary"
                        >
                          Speichern
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingFolderId(null)}
                          className="btn-ghost"
                        >
                          Abbrechen
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleFolder(folder.id)}
                          className="flex items-center gap-2 text-left text-subheading transition-colors hover:text-accent"
                        >
                          <span className="text-caption">{expanded ? '▼' : '▶'}</span>
                          {folder.name}
                          <span className="text-body font-normal">
                            ({folderDecks.length} Deck{folderDecks.length === 1 ? '' : 's'})
                          </span>
                        </button>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFolderId(folder.id);
                              setEditFolderName(folder.name);
                            }}
                            className="btn-ghost px-3 py-1"
                          >
                            Umbenennen
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFolder(folder)}
                            className="btn-danger px-3 py-1"
                          >
                            Löschen
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {expanded && (
                    <ul className="mt-4 space-y-3">
                      {folderDecks.length === 0 ? (
                        <li className="rounded-lg border border-border-subtle bg-surface-raised px-4 py-3 text-body">
                          Keine Decks in diesem Ordner. Wähle bei einem Deck „Ordner" aus.
                        </li>
                      ) : (
                        folderDecks.map((deck) => renderDeckItem(deck))
                      )}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <h2 className="text-heading mb-4">Decks</h2>

        <form onSubmit={handleCreateDeck} className="mb-5 flex gap-2">
          <input
            type="text"
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            placeholder="Neues Deck …"
            className="input-field"
          />
          <button type="submit" className="btn-primary shrink-0">
            Erstellen
          </button>
        </form>

        {decks.length === 0 ? (
          <p className="text-body">Noch keine Decks. Erstelle dein erstes Deck oben.</p>
        ) : rootDecks.length === 0 ? (
          <p className="text-body">
            Alle Decks sind in Ordnern einsortiert. Neue Decks erscheinen hier.
          </p>
        ) : (
          <ul className="space-y-3">{rootDecks.map((deck) => renderDeckItem(deck))}</ul>
        )}
      </section>
    </div>
  );
}
