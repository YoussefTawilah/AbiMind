import type { UserProfile } from '../types';
import { getCloudUserId, isCloudMode } from './dataSource';
import { getLocalUserProfile } from './db';
import {
  createUniversityEvent,
  deleteUniversityEvent,
  getUserProfile,
  saveUserProfile,
  updateUniversityEvent,
} from './repository';

export const ABI_EXAM_EVENT_TITLE = 'Erste schriftliche Abiturprüfung';

const LOCAL_PROFILE_ID = 'default';

export interface AbiProfileInput {
  bundesland?: string;
  abiturYear?: number;
  firstWrittenExamDate?: string;
  onboardingDismissed: boolean;
}

export function formatAbiContext(profile: Pick<UserProfile, 'abiturYear' | 'bundesland'>): string {
  const parts: string[] = [];
  if (profile.abiturYear) parts.push(`Abitur ${profile.abiturYear}`);
  if (profile.bundesland) parts.push(profile.bundesland);
  return parts.join(' · ');
}

export function getAbiturYearOptions(): number[] {
  const current = new Date().getFullYear();
  return [current, current + 1, current + 2, current + 3];
}

function now(): string {
  return new Date().toISOString();
}

function buildSubject(input: AbiProfileInput): string | undefined {
  const label = formatAbiContext(input);
  return label || undefined;
}

/** Speichert Profil und synchronisiert den verknüpften Prüfungsplaner-Eintrag. */
export async function saveAbiProfile(input: AbiProfileInput): Promise<UserProfile> {
  const existing = await getUserProfile();
  const timestamp = now();
  const subject = buildSubject(input);

  let linkedUniversityEventId = existing?.linkedUniversityEventId;
  const examDate = input.firstWrittenExamDate ?? existing?.firstWrittenExamDate;

  if (examDate) {
    if (linkedUniversityEventId) {
      await updateUniversityEvent(linkedUniversityEventId, {
        title: ABI_EXAM_EVENT_TITLE,
        eventDate: examDate,
        subject,
      });
    } else {
      const event = await createUniversityEvent({
        title: ABI_EXAM_EVENT_TITLE,
        eventDate: examDate,
        subject,
      });
      linkedUniversityEventId = event.id;
    }
  } else if (linkedUniversityEventId) {
    await deleteUniversityEvent(linkedUniversityEventId);
    linkedUniversityEventId = undefined;
  }

  const profile: UserProfile = {
    id: existing?.id ?? LOCAL_PROFILE_ID,
    bundesland: input.bundesland?.trim() || undefined,
    abiturYear: input.abiturYear,
    firstWrittenExamDate: input.firstWrittenExamDate ?? existing?.firstWrittenExamDate,
    linkedUniversityEventId,
    onboardingDismissed: input.onboardingDismissed,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  await saveUserProfile(profile);
  return profile;
}

/** Profil-Datum aktualisieren, wenn der verknüpfte Termin im Prüfungsplaner geändert wurde. */
export async function syncProfileFromLinkedEvent(
  eventId: string,
  eventDate: string,
): Promise<void> {
  const profile = await getUserProfile();
  if (!profile?.linkedUniversityEventId || profile.linkedUniversityEventId !== eventId) return;

  if (profile.firstWrittenExamDate === eventDate) return;

  await saveUserProfile({
    ...profile,
    firstWrittenExamDate: eventDate,
    updatedAt: now(),
  });
}

/** Profil leeren, wenn der verknüpfte Termin im Prüfungsplaner gelöscht wurde. */
export async function clearProfileAfterLinkedEventDeleted(eventId: string): Promise<void> {
  const profile = await getUserProfile();
  if (!profile?.linkedUniversityEventId || profile.linkedUniversityEventId !== eventId) return;

  await saveUserProfile({
    ...profile,
    firstWrittenExamDate: undefined,
    linkedUniversityEventId: undefined,
    updatedAt: now(),
  });
}

export function shouldShowAbiOnboarding(profile: UserProfile | null): boolean {
  if (!profile) return true;
  if (profile.onboardingDismissed) return false;
  return !profile.firstWrittenExamDate;
}

/** Profil laden; in Cloud-Modus lokales Profil hochladen, falls Cloud leer ist. */
export async function loadUserProfile(): Promise<UserProfile | null> {
  let profile = await getUserProfile();
  if (profile || !isCloudMode()) return profile;

  const local = await getLocalUserProfile();
  if (!local) return null;

  const userId = getCloudUserId();
  if (!userId) return null;

  await saveUserProfile({ ...local, id: userId });
  profile = await getUserProfile();
  return profile;
}
