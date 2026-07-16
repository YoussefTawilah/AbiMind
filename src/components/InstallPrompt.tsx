import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'abimind-pwa-install-dismissed';

function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay() || localStorage.getItem(DISMISS_KEY) === '1') return;

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    function handleInstalled() {
      setVisible(false);
      setDeferredPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setVisible(false);
    setDeferredPrompt(null);
    if (choice.outcome === 'dismissed') {
      localStorage.setItem(DISMISS_KEY, '1');
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto w-auto max-w-content rounded-xl border border-border-subtle bg-surface-elevated p-4 shadow-[0_8px_32px_#00000060] sm:left-auto sm:right-4 md:right-8"
      role="dialog"
      aria-labelledby="pwa-install-title"
    >
      <p id="pwa-install-title" className="text-subheading">
        AbiMind zum Homescreen hinzufügen
      </p>
      <p className="mt-1 text-body">
        Installiere die App für schnelleren Zugriff und Offline-Nutzung deiner Karteikarten.
      </p>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => void handleInstall()} className="btn-primary flex-1">
          Installieren
        </button>
        <button type="button" onClick={handleDismiss} className="btn-secondary flex-1">
          Später
        </button>
      </div>
    </div>
  );
}
