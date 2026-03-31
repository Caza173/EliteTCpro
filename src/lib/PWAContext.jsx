import React, { createContext, useContext, useEffect, useState } from "react";

const PWAContext = createContext(null);

export function PWAProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true
  );
  const [isIOS] = useState(() => /iphone|ipad|ipod/i.test(navigator.userAgent));
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
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

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
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
      console.log("User installed app");
    } else {
      console.log("User dismissed install");
    }
    setDeferredPrompt(null);
    window.deferredPrompt = null;
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
    }}>
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  return useContext(PWAContext);
}