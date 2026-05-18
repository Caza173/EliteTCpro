import React, { createContext, useContext, useEffect, useState } from "react";

const PWAContext = createContext(null);

export function PWAProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
  const [isIOS] = useState(() => /iphone|ipad|ipod/i.test(navigator.userAgent));
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Install prompt (Android/Desktop Chrome)
    const handler = (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setDeferredPrompt(e);
    };
    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.deferredPrompt = null;
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    // SW update detection
    const updateHandler = () => setUpdateAvailable(true);
    window.addEventListener("pwa-update-available", updateHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
      window.removeEventListener("pwa-update-available", updateHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }
    const prompt = deferredPrompt || window.deferredPrompt;
    if (!prompt) return;
    prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    window.deferredPrompt = null;
  };

  const applyUpdate = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage("SKIP_WAITING");
        } else {
          window.location.reload();
        }
      });
    } else {
      window.location.reload();
    }
    setUpdateAvailable(false);
  };

  const canInstall = !isInstalled && (!!deferredPrompt || isIOS);

  return (
    <PWAContext.Provider value={{
      deferredPrompt,
      isInstalled,
      isIOS,
      showIOSInstructions,
      setShowIOSInstructions,
      handleInstallClick,
      canInstall,
      updateAvailable,
      applyUpdate,
    }}>
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  return useContext(PWAContext);
}