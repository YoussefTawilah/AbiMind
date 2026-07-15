import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { UserProfile } from '../types';
import {
  loadUserProfile,
  saveAbiProfile,
  shouldShowAbiOnboarding,
  type AbiProfileInput,
} from '../lib/abiProfile';
import { isDataReady, useAuth } from './AuthContext';

interface SaveProfileOptions {
  keepOpen?: boolean;
}

interface AbiProfileContextValue {
  profile: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  saveProfile: (input: AbiProfileInput, options?: SaveProfileOptions) => Promise<void>;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  shouldShowOnboarding: boolean;
}

const AbiProfileContext = createContext<AbiProfileContextValue | null>(null);

export function AbiProfileProvider({ children }: { children: React.ReactNode }) {
  const { status, syncState } = useAuth();
  const dataReady = isDataReady(status, syncState);
  const importBlocking = syncState === 'prompt_import' || syncState === 'importing';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await loadUserProfile();
      setProfile(loaded);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!dataReady) {
      setLoading(true);
      return;
    }
    void refresh();
  }, [dataReady, refresh, syncState]);

  const saveProfile = useCallback(async (input: AbiProfileInput, options?: SaveProfileOptions) => {
    const saved = await saveAbiProfile(input);
    setProfile(saved);
    if (!options?.keepOpen) {
      setManualOpen(false);
      setIsModalOpen(false);
    }
  }, []);

  const shouldShowOnboarding =
    dataReady &&
    !importBlocking &&
    !loading &&
    !manualOpen &&
    shouldShowAbiOnboarding(profile);

  useEffect(() => {
    if (shouldShowOnboarding) {
      setIsModalOpen(true);
    } else if (!manualOpen) {
      setIsModalOpen(false);
    }
  }, [shouldShowOnboarding, manualOpen]);

  const value = useMemo(
    () => ({
      profile,
      loading,
      refresh,
      saveProfile,
      isModalOpen,
      openModal: () => {
        setManualOpen(true);
        setIsModalOpen(true);
      },
      closeModal: () => {
        setManualOpen(false);
        setIsModalOpen(false);
      },
      shouldShowOnboarding,
    }),
    [profile, loading, refresh, saveProfile, isModalOpen, shouldShowOnboarding],
  );

  return <AbiProfileContext.Provider value={value}>{children}</AbiProfileContext.Provider>;
}

export function useAbiProfile(): AbiProfileContextValue {
  const ctx = useContext(AbiProfileContext);
  if (!ctx) {
    throw new Error('useAbiProfile must be used within AbiProfileProvider');
  }
  return ctx;
}
