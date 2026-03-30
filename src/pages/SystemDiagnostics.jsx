import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Wifi, HardDrive, Download } from "lucide-react";

export default function SystemDiagnostics() {
  const [pwa, setPwa] = useState({});
  const [connection, setConnection] = useState({});
  const [cacheList, setCacheList] = useState([]);
  const [installAvailable, setInstallAvailable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      setInstallAvailable(true);
    };

    runDiagnostics();

    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const runDiagnostics = async () => {
    const pwaStatus = await getPWAStatus();
    const conn = getConnectionStatus();
    const caches = await getCacheInfo();

    setPwa(pwaStatus);
    setConnection(conn);
    setCacheList(caches);
  };

  const getPWAStatus = async () => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    const hasServiceWorker = "serviceWorker" in navigator;

    let swState = "Not Supported";

    if (hasServiceWorker) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) swState = "Not Registered";
      else if (registration.active) swState = "Active";
      else if (registration.installing) swState = "Installing";
      else if (registration.waiting) swState = "Waiting";
      else swState = "Unknown";
    }

    return {
      isStandalone,
      hasServiceWorker,
      swState,
      pwaReady: isStandalone || (hasServiceWorker && swState === "Active"),
    };
  };

  const getConnectionStatus = () => {
    return {
      online: navigator.onLine,
      connectionType:
        (navigator.connection?.effectiveType || "unknown").toUpperCase(),
    };
  };

  const updateConnection = () => {
    setConnection(getConnectionStatus());
  };

  const getCacheInfo = async () => {
    if (!("caches" in window)) return [];
    const cacheNames = await caches.keys();
    return cacheNames;
  };

  const getStatusColor = (status) => {
    if (status === "Yes" || status === "Active" || status === "Online") return "text-green-600";
    if (status === "No" || status === "Not Supported" || status === "Not Registered" || status === "Offline") return "text-red-600";
    if (status === "Installing" || status === "Waiting" || status === "Unknown") return "text-amber-600";
    return "text-gray-500";
  };

  const getStatusIcon = (status) => {
    if (status === "Yes" || status === "Active" || status === "Online") return <CheckCircle2 className="w-5 h-5" />;
    if (status === "No" || status === "Not Supported" || status === "Not Registered" || status === "Offline") return <XCircle className="w-5 h-5" />;
    return <Wifi className="w-5 h-5 text-amber-600" />;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>System Diagnostics</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Real-time status of PWA features, network connectivity, and cache usage.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PWA STATUS */}
        <Card className="theme-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>PWA Status</CardTitle>
            <div className={getStatusColor(pwa.pwaReady ? "Yes" : "No")}>
              {getStatusIcon(pwa.pwaReady ? "Yes" : "No")}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
              <span>Installed (Standalone):</span>
              <span className={`font-semibold ${getStatusColor(pwa.isStandalone ? "Yes" : "No")}`}>{pwa.isStandalone ? "Yes" : "No"}</span>
            </div>
            <div className="flex items-center justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
              <span>Service Worker:</span>
              <span className={`font-semibold ${getStatusColor(pwa.swState)}`}>{pwa.swState}</span>
            </div>
            <div className="flex items-center justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
              <span>PWA Ready:</span>
              <span className={`font-semibold ${getStatusColor(pwa.pwaReady ? "Yes" : "No")}`}>{pwa.pwaReady ? "Yes" : "No"}</span>
            </div>
          </CardContent>
        </Card>

        {/* CONNECTION */}
        <Card className="theme-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Connectivity</CardTitle>
            <div className={getStatusColor(connection.online ? "Online" : "Offline")}>
              <Wifi className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
              <span>Online:</span>
              <span className={`font-semibold ${getStatusColor(connection.online ? "Online" : "Offline")}`}>{connection.online ? "Yes" : "No"}</span>
            </div>
            <div className="flex items-center justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
              <span>Connection Type:</span>
              <span className={`font-semibold ${getStatusColor(connection.connectionType)}`}>{connection.connectionType}</span>
            </div>
          </CardContent>
        </Card>

        {/* CACHE */}
        <Card className="theme-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Cache</CardTitle>
            <HardDrive className="w-5 h-5 text-gray-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
              <span>Total Caches:</span>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{cacheList.length}</span>
            </div>
            {cacheList.length > 0 && (
              <div className="space-y-1 text-sm pt-2">
                <span className="font-medium" style={{ color: "var(--text-muted)" }}>Cache Names:</span>
                <ul className="list-disc list-inside text-sm max-h-24 overflow-y-auto" style={{ color: "var(--text-secondary)" }}>
                  {cacheList.map((c) => (
                    <li key={c} className="truncate">{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* INSTALL */}
        <Card className="theme-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Install</CardTitle>
            <div className={getStatusColor(installAvailable ? "Yes" : "No")}>
              <Download className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
              <span>Install Prompt Available:</span>
              <span className={`font-semibold ${getStatusColor(installAvailable ? "Yes" : "No")}`}>{installAvailable ? "Yes" : "No"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}