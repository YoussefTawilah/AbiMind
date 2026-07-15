import { useCallback, useEffect, useState } from 'react';
import type { UniversityEvent } from '../types';
import {
  createUniversityEvent,
  deleteUniversityEvent,
  getUserProfile,
  updateUniversityEvent,
} from '../lib/repository';
import {
  ABI_EXAM_EVENT_TITLE,
  clearProfileAfterLinkedEventDeleted,
  syncProfileFromLinkedEvent,
} from '../lib/abiProfile';
import { formatCountdown, getExamPlannerEvents } from '../lib/analytics';
import { isDataReady, useAuth } from '../contexts/AuthContext';
import { useAbiProfile } from '../contexts/AbiProfileContext';
import { toDateString } from '../lib/sm2';
import { DateInput } from './DateInput';

export function ExamPlannerDashboard() {
  const { status, syncState } = useAuth();
  const { refresh: refreshAbiProfile } = useAbiProfile();
  const dataReady = isDataReady(status, syncState);

  const [events, setEvents] = useState<UniversityEvent[]>([]);
  const [linkedEventId, setLinkedEventId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(toDateString());
  const [newSubject, setNewSubject] = useState('');

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [upcoming, profile] = await Promise.all([getExamPlannerEvents(), getUserProfile()]);
      setEvents(upcoming);
      setLinkedEventId(profile?.linkedUniversityEventId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Termine konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!dataReady) return;
    void refresh();
  }, [refresh, dataReady]);

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await createUniversityEvent({
        title: newTitle,
        eventDate: newDate,
        subject: newSubject || undefined,
      });
      setNewTitle('');
      setNewSubject('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Termin konnte nicht gespeichert werden.');
    }
  }

  async function handleDeleteEvent(id: string) {
    const isLinked = id === linkedEventId;
    if (
      isLinked &&
      !window.confirm(
        'Das ist dein Abitur-Termin. Beim Löschen wird auch der Countdown entfernt. Fortfahren?',
      )
    ) {
      return;
    }
    try {
      await deleteUniversityEvent(id);
      if (isLinked) {
        await clearProfileAfterLinkedEventDeleted(id);
        await refreshAbiProfile();
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Termin konnte nicht gelöscht werden.');
    }
  }

  async function handleDateChange(id: string, eventDate: string) {
    const previousEvents = events;
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, eventDate } : e)));

    try {
      await updateUniversityEvent(id, { eventDate });
      if (id === linkedEventId) {
        await syncProfileFromLinkedEvent(id, eventDate);
        await refreshAbiProfile();
      }
    } catch (err) {
      setEvents(previousEvents);
      setError(err instanceof Error ? err.message : 'Datum konnte nicht gespeichert werden.');
    }
  }

  if (!dataReady) {
    return <p className="text-body">Cloud-Daten werden geladen …</p>;
  }

  if (loading) {
    return <p className="text-body">Prüfungsplaner wird geladen …</p>;
  }

  return (
    <div className="space-y-8 text-left">
      <div>
        <h2 className="text-display">Prüfungsplaner</h2>
        <p className="mt-2 text-body">Klausuren, Abgaben und wichtige Uni-Termine im Blick behalten.</p>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <section className="panel">
        <h3 className="text-heading">Neuer Termin</h3>
        <form onSubmit={handleAddEvent} className="mt-5 grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Klausur / Abgabe …"
            className="input-field sm:col-span-2"
          />
          <DateInput
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Fach (optional)"
            className="input-field"
          />
          <button type="submit" className="btn-primary sm:col-span-2">
            Termin hinzufügen
          </button>
        </form>
      </section>

      <section className="panel">
        <h3 className="text-heading">Anstehende Termine</h3>
        {events.length === 0 ? (
          <p className="mt-5 text-body">Keine anstehenden Termine. Lege oben deine erste Klausur an.</p>
        ) : (
          <ul className="mt-5 space-y-2">
            {events.map((event) => {
              const isLinkedAbi = event.id === linkedEventId;
              return (
                <li
                  key={event.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border-subtle bg-surface-overlay px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-subheading">{event.title}</p>
                      {isLinkedAbi && (
                        <span className="rounded-md bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
                          Abi-Countdown
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <DateInput
                        value={event.eventDate}
                        onChange={(e) => void handleDateChange(event.id, e.target.value)}
                        wrapperClassName="w-auto"
                        className="w-auto py-1 text-sm"
                        aria-label={`Datum für ${event.title}`}
                      />
                      {event.subject ? <span className="text-body">· {event.subject}</span> : null}
                    </div>
                    {isLinkedAbi && (
                      <p className="mt-1 text-caption text-text-tertiary">
                        Mit dem Dashboard-Countdown synchronisiert
                        {event.title === ABI_EXAM_EVENT_TITLE ? '' : ` (${ABI_EXAM_EVENT_TITLE})`}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-medium text-accent">
                      {formatCountdown(event.eventDate)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(event.id)}
                    className="btn-danger shrink-0 px-2 py-1"
                  >
                    Löschen
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
