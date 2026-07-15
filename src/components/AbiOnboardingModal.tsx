import { useEffect, useState } from 'react';
import { AbiProfileForm } from './AbiProfileForm';
import { useAbiProfile } from '../contexts/AbiProfileContext';
import { saveAbiProfile } from '../lib/abiProfile';
import { saveUserProfile } from '../lib/repository';

export function AbiOnboardingModal() {
  const { profile, isModalOpen, closeModal, saveProfile, refresh, shouldShowOnboarding } =
    useAbiProfile();
  const [formSession, setFormSession] = useState(0);

  useEffect(() => {
    if (isModalOpen) setFormSession((n) => n + 1);
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  const isFirstRun = shouldShowOnboarding;

  async function handleSkip() {
    const timestamp = new Date().toISOString();
    if (profile) {
      await saveUserProfile({
        ...profile,
        onboardingDismissed: true,
        updatedAt: timestamp,
      });
    } else {
      await saveAbiProfile({
        onboardingDismissed: true,
      });
    }
    await refresh();
    closeModal();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="abi-onboarding-title"
    >
      <div className="panel w-full max-w-md shadow-[0_8px_32px_#00000060]">
        <h2 id="abi-onboarding-title" className="text-heading">
          {isFirstRun ? 'Dein Abi-Feeling' : 'Abitur-Infos bearbeiten'}
        </h2>
        <p className="mt-3 text-body">
          {isFirstRun
            ? 'Trage dein Abitur-Jahr und das Datum der ersten schriftlichen Prüfung ein — wir zeigen dir einen Countdown auf dem Dashboard und legen den Termin automatisch im Prüfungsplaner an.'
            : 'Passe Bundesland, Abitur-Jahr oder Prüfungsdatum an. Änderungen werden automatisch gespeichert und mit dem Prüfungsplaner synchronisiert.'}
        </p>

        <div className="mt-5">
          <AbiProfileForm
            key={formSession}
            initialProfile={profile}
            onSubmit={saveProfile}
            onSkip={isFirstRun ? () => void handleSkip() : closeModal}
            submitLabel="Speichern"
            skipLabel={isFirstRun ? 'Überspringen' : 'Abbrechen'}
            persistOnChange={!isFirstRun}
          />
        </div>
      </div>
    </div>
  );
}
