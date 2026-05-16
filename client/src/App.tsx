import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNavigation } from "@/hooks/useNavigation";
import { useElevenLabs } from "@/hooks/useElevenLabs";
import { warmAudioCache } from "@/services/elevenlabsService";
import { getSocket, disconnectSocket } from "@/services/socketService";
import { VOICE_SCRIPTS } from "@/constants/voiceScripts";
import AIAssistant from "@/components/AIAssistant";
import NavigationEngine from "@/components/NavigationEngine";
import StatusDisplay from "@/components/StatusDisplay";
import ManualControls from "@/components/ManualControls";
import EmergencyStop from "@/components/EmergencyStop";
import MapView from "@/components/MapView";
import {
  IconLogo,
  IconMic,
  IconNavigation,
  IconPin,
  IconWifi,
  IconWifiOff,
} from "@/components/icons";

const ObstacleDetector = lazy(() => import("@/components/ObstacleDetector"));

const Header = (): JSX.Element => {
  const online = useAppStore((s) => s.online);
  const socketConnected = useAppStore((s) => s.socketConnected);
  const navState = useAppStore((s) => s.navState);

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-ink-bg/70 border-b border-ink-border">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-accent-gradient shadow-glow text-black">
            <IconLogo size={24} />
          </span>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight leading-none">
              <span className="text-accent">Blind</span>Vision
            </h1>
            <p className="hidden md:block text-xs text-text-muted mt-0.5">
              AI-powered, voice-first mobility assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`chip ${
              online ? "chip-active" : "chip-warning"
            }`}
            aria-label={online ? "Online" : "Offline"}
          >
            {online ? <IconWifi size={14} /> : <IconWifiOff size={14} />}
            <span className="hidden sm:inline">
              {online ? "Online" : "Offline"}
              {online && socketConnected ? " · live" : ""}
            </span>
          </span>
          {navState === "NAVIGATING" && (
            <span className="chip chip-active animate-fade-in">
              <IconNavigation size={14} />
              <span className="hidden sm:inline">Navigating</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

const App = (): JSX.Element => {
  const language = useAppStore((s) => s.language);
  const cameraOn = useAppStore((s) => s.cameraOn);
  const muted = useAppStore((s) => s.muted);
  const appMode = useAppStore((s) => s.appMode);
  const setOnline = useAppStore((s) => s.setOnline);
  const setSocketConnected = useAppStore((s) => s.setSocketConnected);
  const setLanguage = useAppStore((s) => s.setLanguage);

  const { speak, speakHigh } = useElevenLabs();
  const navigationApi = useNavigation();
  useGeolocation({});

  const [destinationInput, setDestinationInput] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  useEffect(() => {
    const supported = (
      import.meta.env.VITE_SUPPORTED_LANGUAGES ?? "en"
    )
      .split(",")
      .map((s) => s.trim());
    const nav = (navigator.language ?? "en").slice(0, 2);
    if (supported.includes(nav)) setLanguage(nav);
  }, [setLanguage]);

  useEffect(() => {
    const onOnline = (): void => {
      setOnline(true);
      speak(VOICE_SCRIPTS.connectionRestored, { priority: "LOW" });
    };
    const onOffline = (): void => {
      setOnline(false);
      speakHigh(VOICE_SCRIPTS.connectionLost);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [setOnline, speak, speakHigh]);

  useEffect(() => {
    const sock = getSocket();
    sock.on("connect", () => setSocketConnected(true));
    sock.on("disconnect", () => setSocketConnected(false));
    return () => {
      sock.off("connect");
      sock.off("disconnect");
      disconnectSocket();
    };
  }, [setSocketConnected]);

  useEffect(() => {
    void warmAudioCache(language);
  }, [language]);

  const [detectionFps, setDetectionFps] = useState(5);
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navAny = navigator as any;
    if (typeof navAny.getBattery !== "function") return;
    let cancelled = false;
    navAny
      .getBattery()
      .then(
        (battery: {
          level: number;
          addEventListener: (e: string, cb: () => void) => void;
        }) => {
          const apply = (): void => {
            if (cancelled) return;
            setDetectionFps(battery.level < 0.2 ? 2 : 5);
          };
          apply();
          battery.addEventListener("levelchange", apply);
        },
      );
    return () => {
      cancelled = true;
    };
  }, []);

  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    const handler = (): void =>
      setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const enableVoice = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        },
      });
      setVoiceEnabled(true);
    } catch {
      speakHigh(VOICE_SCRIPTS.micDenied);
    }
  }, [speakHigh]);

  const handleStartNavigation = (): void => {
    if (!destinationInput.trim()) {
      speak("Please type or say a destination.");
      return;
    }
    void navigationApi.startNavigation(
      destinationInput.trim(),
      destinationInput.trim(),
    );
  };

  const handleStopNavigation = (): void => {
    navigationApi.stopNavigation(true);
  };

  const handleSos = (): void => {
    speakHigh(VOICE_SCRIPTS.callingHelp);
    const contact = import.meta.env.VITE_EMERGENCY_CONTACT;
    if (contact) window.location.href = `tel:${contact}`;
    const pos = useAppStore.getState().position;
    if (pos && navigator.share) {
      void navigator
        .share({
          title: "Emergency: my location",
          text: `I need help. https://maps.google.com/?q=${pos.lat},${pos.lng}`,
        })
        .catch(() => undefined);
    }
  };

  const detectionEnabled =
    cameraOn && tabVisible && appMode !== "EMERGENCY";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 px-4 md:px-6 py-6 md:py-10 max-w-7xl mx-auto w-full">
        {!voiceEnabled && (
          <div
            className="panel panel-accent mb-8 animate-fade-in flex flex-col md:flex-row md:items-center gap-5"
            role="region"
            aria-label="Microphone permission required"
          >
            <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/15 text-accent flex-shrink-0">
              <IconMic size={26} />
            </span>
            <div className="flex-1">
              <p className="kicker mb-1">First-time setup</p>
              <p className="text-lg font-semibold">
                Enable voice control to begin
              </p>
              <p className="text-sm text-text-muted mt-1">
                Tap below — your microphone is only used for wake-word
                detection and active commands. Audio never leaves your device
                until you trigger one.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void enableVoice()}
              className="btn-primary"
              aria-label="Enable voice control"
            >
              <IconMic size={20} />
              Enable Voice
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-7">
          <div className="lg:col-span-2 space-y-6 lg:space-y-7">
            <AIAssistant
              voiceEnabled={voiceEnabled && !muted}
              navigationApi={navigationApi}
              onSos={handleSos}
            />

            <NavigationEngine />

            <section
              className="panel"
              aria-label="Quick destination entry"
              role="region"
            >
              <p className="kicker mb-2">Quick destination</p>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <IconPin size={22} className="text-accent" />
                Type a place
              </h2>
              <label className="sr-only" htmlFor="destination-input">
                Destination
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="destination-input"
                  type="text"
                  value={destinationInput}
                  onChange={(e) => setDestinationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleStartNavigation();
                  }}
                  placeholder="e.g. Galle Face Beach, central station"
                  className="flex-1 p-4 rounded-2xl bg-ink-card-2/80 border-2 border-ink-border focus:border-accent text-lg placeholder:text-text-subtle"
                  aria-label="Type a destination name or address"
                />
                <button
                  type="button"
                  onClick={handleStartNavigation}
                  className="btn-primary sm:min-w-[180px]"
                  aria-label="Start navigation to typed destination"
                >
                  <IconNavigation size={20} />
                  Navigate
                </button>
              </div>
              <p className="text-sm text-text-muted mt-3">
                Or say: <em className="text-text">"Assistant, take me to Galle Face Beach."</em>
              </p>
            </section>

            <Suspense
              fallback={
                <div className="panel" aria-busy="true">
                  <p className="kicker mb-2">Vision</p>
                  <p className="text-text-muted">Loading vision model…</p>
                </div>
              }
            >
              <ObstacleDetector
                enabled={detectionEnabled}
                fps={detectionFps}
              />
            </Suspense>

            <MapView />
          </div>

          <aside className="space-y-6 lg:space-y-7 lg:sticky lg:top-24 self-start">
            <StatusDisplay />
            <ManualControls
              onStartNavigation={handleStartNavigation}
              onStopNavigation={handleStopNavigation}
              onSos={handleSos}
            />
            <EmergencyStop />
          </aside>
        </div>
      </main>

      <footer className="px-6 py-6 text-sm text-text-subtle text-center border-t border-ink-border mt-10">
        <p>
          Built for accessibility · WCAG AAA contrast ·{" "}
          <span className="text-accent">Voice-first design</span>
        </p>
      </footer>
    </div>
  );
};

export default App;
