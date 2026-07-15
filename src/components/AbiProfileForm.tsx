import { useState } from 'react';
import { GERMAN_STATES, type UserProfile } from '../types';
import { getAbiturYearOptions } from '../lib/abiProfile';
import { toDateString } from '../lib/sm2';
import type { AbiProfileInput } from '../lib/abiProfile';
import { DateInput } from './DateInput';

interface AbiProfileFormProps {
  initialProfile: UserProfile | null;
  onSubmit: (input: AbiProfileInput, options?: { keepOpen?: boolean }) => Promise<void>;
  onSkip?: () => void;
  submitLabel?: string;
  showSkip?: boolean;
  skipLabel?: string;
  /** Felder sofort speichern (Bearbeiten-Modus) */
  persistOnChange?: boolean;
}

export function AbiProfileForm({
  initialProfile,
  onSubmit,
  onSkip,
  submitLabel = 'Speichern',
  showSkip = true,
  skipLabel = 'Überspringen',
  persistOnChange = false,
}: AbiProfileFormProps) {
  const yearOptions = getAbiturYearOptions();
  const [bundesland, setBundesland] = useState(initialProfile?.bundesland ?? '');
  const [abiturYear, setAbiturYear] = useState<string>(
    initialProfile?.abiturYear?.toString() ?? yearOptions[0].toString(),
  );
  const [firstWrittenExamDate, setFirstWrittenExamDate] = useState(
    initialProfile?.firstWrittenExamDate ?? toDateString(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildInput(overrides: Partial<AbiProfileInput> = {}): AbiProfileInput {
    return {
      bundesland: (overrides.bundesland ?? bundesland) || undefined,
      abiturYear:
        overrides.abiturYear ??
        (abiturYear ? Number(abiturYear) : undefined),
      firstWrittenExamDate:
        (overrides.firstWrittenExamDate ?? firstWrittenExamDate) || undefined,
      onboardingDismissed: true,
    };
  }

  async function persistIfEditing(overrides: Partial<AbiProfileInput> = {}) {
    if (!persistOnChange || !initialProfile?.onboardingDismissed) return;

    setSaving(true);
    setError(null);
    try {
      await onSubmit(buildInput(overrides), { keepOpen: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Änderung konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(buildInput());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-caption text-text-secondary">Bundesland</span>
        <select
          value={bundesland}
          onChange={(e) => {
            const value = e.target.value;
            setBundesland(value);
            void persistIfEditing({ bundesland: value });
          }}
          className="input-field mt-1 w-full"
        >
          <option value="">Bitte wählen …</option>
          {GERMAN_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-caption text-text-secondary">Abitur-Jahr</span>
        <select
          value={abiturYear}
          onChange={(e) => {
            const value = e.target.value;
            setAbiturYear(value);
            void persistIfEditing({ abiturYear: value ? Number(value) : undefined });
          }}
          className="input-field mt-1 w-full"
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-caption text-text-secondary">
          Datum der ersten schriftlichen Abiturprüfung
        </span>
        <DateInput
          value={firstWrittenExamDate}
          onChange={(e) => {
            const value = e.target.value;
            setFirstWrittenExamDate(value);
            void persistIfEditing({ firstWrittenExamDate: value });
          }}
          className="mt-1 w-full"
        />
        <p className="mt-1.5 text-caption text-text-tertiary">
          Findest du z. B. auf der Website deines Kultusministeriums oder von deiner Schule.
        </p>
      </label>

      {error && <p className="alert-error">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
          {saving ? 'Wird gespeichert …' : submitLabel}
        </button>
        {showSkip && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={saving}
            className="btn-secondary flex-1 disabled:opacity-50"
          >
            {skipLabel}
          </button>
        )}
      </div>
    </form>
  );
}
