import { apiClient } from "./apiClient";
import type { ClassifiedCommand } from "@shared/types";

/**
 * Classifies a transcribed user utterance via the backend Gemini proxy.
 */
export const classifyCommand = async (
  transcript: string,
  language = "en",
): Promise<ClassifiedCommand> => {
  const { data } = await apiClient.post<ClassifiedCommand>(
    "/api/voice/classify",
    { transcript, language },
  );
  return data;
};

/**
 * Server-side speech-to-text fallback for when the Web Speech API is missing.
 */
export const transcribeAudio = async (
  audioBlob: Blob,
  language = "en",
): Promise<string> => {
  const audioBase64 = await blobToBase64(audioBlob);
  const { data } = await apiClient.post<{ transcript: string }>(
    "/api/voice/transcribe",
    {
      audioBase64,
      mimeType: audioBlob.type || "audio/webm",
      language,
    },
  );
  return data.transcript;
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const idx = dataUrl.indexOf(",");
      resolve(idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
