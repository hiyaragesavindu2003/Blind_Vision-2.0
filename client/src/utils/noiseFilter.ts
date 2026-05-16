/**
 * Lightweight utilities to filter noisy or low-confidence speech inputs and
 * to debounce repeat detections.
 */

export interface ConfidenceCheckResult {
  ok: boolean;
  reason?: "low_confidence" | "empty" | "too_short";
}

const DEFAULT_THRESHOLD =
  Number(import.meta.env.VITE_CONFIDENCE_THRESHOLD ?? 0.75) || 0.75;

export const checkTranscript = (
  transcript: string,
  confidence = 1,
  threshold: number = DEFAULT_THRESHOLD,
): ConfidenceCheckResult => {
  const t = transcript.trim();
  if (!t) return { ok: false, reason: "empty" };
  if (t.length < 2) return { ok: false, reason: "too_short" };
  if (confidence < threshold) return { ok: false, reason: "low_confidence" };
  return { ok: true };
};

/**
 * Debounce a function call by `ms` milliseconds.
 * Useful for rate-limiting wake word detections and command bursts.
 */
export const createDebouncer = (ms: number): {
  shouldFire: () => boolean;
  reset: () => void;
} => {
  let lastFire = 0;
  return {
    shouldFire: () => {
      const now = Date.now();
      if (now - lastFire < ms) return false;
      lastFire = now;
      return true;
    },
    reset: () => {
      lastFire = 0;
    },
  };
};

/**
 * Per-key debouncer: returns true only if `ms` has elapsed since the last hit
 * for the given `key`. Used for object-class announcements (e.g. don't repeat
 * "person on your left" within 5s).
 */
export const createKeyedDebouncer = (
  ms: number,
): {
  shouldFire: (key: string) => boolean;
  reset: () => void;
} => {
  const map = new Map<string, number>();
  return {
    shouldFire: (key: string) => {
      const now = Date.now();
      const last = map.get(key) ?? 0;
      if (now - last < ms) return false;
      map.set(key, now);
      return true;
    },
    reset: () => map.clear(),
  };
};

export const containsWakeWord = (
  text: string,
  wakeWords: string[],
): boolean => {
  const t = text.toLowerCase();
  return wakeWords.some((w) => t.includes(w.toLowerCase()));
};

export const stripWakeWord = (
  text: string,
  wakeWords: string[],
): string => {
  let result = text;
  for (const w of wakeWords) {
    const re = new RegExp(`\\b${w}\\b[,.!?]?`, "ig");
    result = result.replace(re, "").trim();
  }
  return result;
};
