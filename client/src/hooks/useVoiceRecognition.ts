import { useCallback, useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import {
  containsWakeWord,
  createDebouncer,
  stripWakeWord,
} from "@/utils/noiseFilter";

const DEFAULT_WAKE_WORDS = (
  import.meta.env.VITE_WAKE_WORDS ?? "assistant,guide,navigator"
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

interface VoiceRecognitionOptions {
  wakeWords?: string[];
  language?: string;
  onWake?: () => void;
  onCommand: (text: string, confidence: number) => void;
  onError?: (msg: string) => void;
  enabled: boolean;
}

type SpeechRecognitionCtor = new () => SpeechRecognition;

const getRecognitionCtor = (): SpeechRecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return (w.SpeechRecognition ||
    w.webkitSpeechRecognition ||
    null) as SpeechRecognitionCtor | null;
};

/**
 * Two-phase voice recognizer:
 *
 *   PASSIVE — always-on lightweight listener that watches for wake words.
 *   ACTIVE  — after a wake word, captures the next ~8 seconds as a command,
 *             debounces accidental duplicates, and emits to onCommand.
 */
export const useVoiceRecognition = ({
  wakeWords = DEFAULT_WAKE_WORDS,
  language = "en-US",
  onWake,
  onCommand,
  onError,
  enabled,
}: VoiceRecognitionOptions): {
  startActive: () => void;
  stopActive: () => void;
  supported: boolean;
} => {
  const setListeningMode = useAppStore((s) => s.setListeningMode);
  const setLastTranscript = useAppStore((s) => s.setLastTranscript);
  const setMicPermission = useAppStore((s) => s.setMicPermission);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const modeRef = useRef<"PASSIVE" | "ACTIVE" | "OFF">("OFF");
  const activeTimerRef = useRef<number | null>(null);
  const debounceRef = useRef(createDebouncer(2_000));
  const onCommandRef = useRef(onCommand);
  const onWakeRef = useRef(onWake);
  const onErrorRef = useRef(onError);

  onCommandRef.current = onCommand;
  onWakeRef.current = onWake;
  onErrorRef.current = onError;

  const stopRecognition = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  const startPassive = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      onErrorRef.current?.("speech_recognition_unavailable");
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = language;
    rec.maxAlternatives = 1;

    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let bestText = "";
      let bestConf = 0;
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        const r = ev.results[i];
        const alt = r[0];
        if (!alt) continue;
        const conf = alt.confidence ?? (r.isFinal ? 0.9 : 0.5);
        if (conf > bestConf || !bestText) {
          bestText = alt.transcript;
          bestConf = conf;
        }
        if (
          modeRef.current === "PASSIVE" &&
          containsWakeWord(alt.transcript, wakeWords)
        ) {
          if (debounceRef.current.shouldFire()) {
            modeRef.current = "ACTIVE";
            setListeningMode("ACTIVE");
            onWakeRef.current?.();

            const stripped = stripWakeWord(alt.transcript, wakeWords).trim();
            if (stripped && r.isFinal) {
              onCommandRef.current(stripped, conf);
              modeRef.current = "PASSIVE";
              setListeningMode("PASSIVE");
            } else {
              if (activeTimerRef.current) {
                window.clearTimeout(activeTimerRef.current);
              }
              activeTimerRef.current = window.setTimeout(() => {
                if (modeRef.current === "ACTIVE") {
                  modeRef.current = "PASSIVE";
                  setListeningMode("PASSIVE");
                }
              }, 8_000);
            }
          }
          continue;
        }

        if (modeRef.current === "ACTIVE" && r.isFinal) {
          if (activeTimerRef.current) {
            window.clearTimeout(activeTimerRef.current);
            activeTimerRef.current = null;
          }
          if (debounceRef.current.shouldFire()) {
            const stripped = stripWakeWord(alt.transcript, wakeWords).trim();
            if (stripped) {
              onCommandRef.current(stripped, conf);
            }
          }
          modeRef.current = "PASSIVE";
          setListeningMode("PASSIVE");
        }
      }

      setLastTranscript(bestText);
    };

    rec.onerror = (ev: Event) => {
      const event = ev as SpeechRecognitionErrorEvent;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicPermission("denied");
        onErrorRef.current?.("microphone_denied");
        modeRef.current = "OFF";
        setListeningMode("DISABLED");
        return;
      }
      // For "no-speech" / "aborted" / "network", just continue.
      if (process.env.NODE_ENV !== "production") {
        console.debug("[voice] recognition error", event.error);
      }
    };

    rec.onend = () => {
      if (modeRef.current !== "OFF") {
        // Auto-restart for continuous listening.
        try {
          rec.start();
        } catch {
          window.setTimeout(() => {
            try {
              rec.start();
            } catch {
              // ignore
            }
          }, 500);
        }
      }
    };

    recognitionRef.current = rec;
    modeRef.current = "PASSIVE";
    setListeningMode("PASSIVE");
    setMicPermission("granted");
    try {
      rec.start();
    } catch {
      // start may throw if already started
    }
  }, [
    language,
    setLastTranscript,
    setListeningMode,
    setMicPermission,
    wakeWords,
  ]);

  const startActive = useCallback(() => {
    // If the recognizer hasn't been started yet (e.g. user clicks Push-to-Talk
    // before the passive listener is up), kick it off now.
    if (modeRef.current === "OFF") {
      startPassive();
    }
    modeRef.current = "ACTIVE";
    setListeningMode("ACTIVE");
    if (activeTimerRef.current) window.clearTimeout(activeTimerRef.current);
    activeTimerRef.current = window.setTimeout(() => {
      if (modeRef.current === "ACTIVE") {
        modeRef.current = "PASSIVE";
        setListeningMode("PASSIVE");
      }
    }, 8_000);
    onWakeRef.current?.();
  }, [setListeningMode, startPassive]);

  const stopActive = useCallback(() => {
    if (activeTimerRef.current) {
      window.clearTimeout(activeTimerRef.current);
      activeTimerRef.current = null;
    }
    modeRef.current = "PASSIVE";
    setListeningMode("PASSIVE");
  }, [setListeningMode]);

  useEffect(() => {
    if (!enabled) {
      modeRef.current = "OFF";
      setListeningMode("DISABLED");
      stopRecognition();
      return;
    }
    startPassive();
    return () => {
      modeRef.current = "OFF";
      stopRecognition();
      if (activeTimerRef.current) {
        window.clearTimeout(activeTimerRef.current);
        activeTimerRef.current = null;
      }
    };
  }, [enabled, setListeningMode, startPassive, stopRecognition]);

  const supported = getRecognitionCtor() !== null;

  return { startActive, stopActive, supported };
};

// Browser ambient typings (subset) — declared with `readonly` to align with
// lib.dom.d.ts where partial declarations may already exist.
declare global {
  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message?: string;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    onresult:
      | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
      | null;
    onerror: ((this: SpeechRecognition, ev: Event) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }
}

export {};
