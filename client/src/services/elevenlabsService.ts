import { apiClient } from "./apiClient";
import { cacheAudio, getCachedAudio } from "@/utils/offlineCache";

const PREFETCH_CACHE_TEXTS = new Set([
  "Calculating route. Please wait.",
  "Please wait.",
  "Internet connection lost. Using cached route. Some features may be limited.",
  "Emergency stop activated. All systems paused.",
  "Path ahead is clear.",
]);

/**
 * Fetches an MP3 audio Blob from the backend ElevenLabs proxy.
 * Falls back to localStorage cache when offline.
 */
export const fetchSpeech = async (
  text: string,
  language = "en",
): Promise<Blob> => {
  if (!navigator.onLine) {
    const cached = getCachedAudio(text);
    if (cached) return cached;
    throw new Error("offline_no_cache");
  }

  const response = await apiClient.post(
    "/api/tts/speak",
    { text, language },
    { responseType: "blob" },
  );
  const blob = response.data as Blob;

  if (PREFETCH_CACHE_TEXTS.has(text)) {
    void cacheAudio(text, blob);
  }
  return blob;
};

/**
 * Pre-warms the offline cache with the most-critical safety phrases.
 */
export const warmAudioCache = async (
  language = "en",
): Promise<void> => {
  for (const text of PREFETCH_CACHE_TEXTS) {
    if (getCachedAudio(text)) continue;
    try {
      await fetchSpeech(text, language);
    } catch {
      // best-effort
    }
  }
};
