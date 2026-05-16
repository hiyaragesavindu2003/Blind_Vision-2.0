import { useCallback, useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import { audioQueue } from "@/utils/audioQueue";
import { fetchSpeech } from "@/services/elevenlabsService";
import type { TtsPriority } from "@shared/types";

const liveAssertive = (): HTMLElement | null =>
  document.getElementById("aria-live-assertive");

const livePolite = (): HTMLElement | null =>
  document.getElementById("aria-live-polite");

interface SpeakOptions {
  priority?: TtsPriority;
  // Don't fetch ElevenLabs audio; just announce via ARIA + screen-reader
  announceOnly?: boolean;
}

/**
 * Central TTS hook. Wraps the singleton AudioQueue so all components share the
 * same playback pipeline.
 *
 * - Updates aria-live regions for screen-readers (in case ElevenLabs fails).
 * - Records spoken history into Zustand for the "Repeat" command.
 * - Honors mute state.
 */
export const useElevenLabs = (): {
  speak: (text: string, opts?: SpeakOptions) => void;
  speakHigh: (text: string) => void;
  repeatLast: () => void;
  flush: () => void;
} => {
  const muted = useAppStore((s) => s.muted);
  const language = useAppStore((s) => s.language);
  const recordSpoken = useAppStore((s) => s.recordSpoken);
  const lastSpoken = useAppStore((s) => s.lastSpoken);
  const idCounter = useRef(0);

  useEffect(() => {
    audioQueue.setMuted(muted);
  }, [muted]);

  const speak = useCallback(
    (text: string, opts: SpeakOptions = {}) => {
      const priority: TtsPriority = opts.priority ?? "MEDIUM";
      const trimmed = text.trim();
      if (!trimmed) return;

      const region =
        priority === "HIGH" ? liveAssertive() : livePolite();
      if (region) {
        region.textContent = "";
        // Force re-announcement.
        requestAnimationFrame(() => {
          region.textContent = trimmed;
        });
      }

      idCounter.current += 1;
      const id = `spk_${idCounter.current}_${Date.now()}`;
      recordSpoken({
        id,
        text: trimmed,
        priority,
        spokenAt: Date.now(),
      });

      if (opts.announceOnly || muted) return;

      audioQueue.enqueue({
        id,
        text: trimmed,
        priority,
        fetchAudio: (t) => fetchSpeech(t, language),
        onError: (err) => {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[tts] error, falling back to ARIA only", err);
          }
        },
      });
    },
    [language, muted, recordSpoken],
  );

  const speakHigh = useCallback(
    (text: string) => speak(text, { priority: "HIGH" }),
    [speak],
  );

  const repeatLast = useCallback(() => {
    if (!lastSpoken) return;
    speak(lastSpoken.text, { priority: lastSpoken.priority });
  }, [lastSpoken, speak]);

  const flush = useCallback(() => {
    audioQueue.flush();
  }, []);

  return { speak, speakHigh, repeatLast, flush };
};
