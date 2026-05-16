import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ClassifiedCommand } from "../types/index.js";

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

let client: GoogleGenerativeAI | null = null;
const getClient = (): GoogleGenerativeAI => {
  if (!apiKey) {
    throw Object.assign(new Error("GEMINI_API_KEY is not configured"), {
      status: 503,
    });
  }
  if (!client) client = new GoogleGenerativeAI(apiKey);
  return client;
};

const SYSTEM_PROMPT = `You are a command classifier for a navigation assistant app for blind users.
Classify the user's speech into exactly one category and return strict JSON.

Categories:
- NAVIGATION: User wants to go somewhere or asks for route info
- SAFETY: User asks about surroundings, obstacles, or what's nearby
- CONTROL: User wants to control app (stop, mute, unmute, repeat, camera, emergency, sos, save location)
- IRRELEVANT: Unrelated to navigation, casual conversation, or background noise

Return ONLY valid JSON in this EXACT shape (no prose, no code fences):
{
  "category": "NAVIGATION" | "SAFETY" | "CONTROL" | "IRRELEVANT",
  "confidence": number between 0.0 and 1.0,
  "intent": "short string describing the action",
  "destination": "extracted place name or null",
  "action": "STOP" | "MUTE" | "UNMUTE" | "REPEAT" | "CAMERA_TOGGLE" | "EMERGENCY_STOP" | "SOS" | "SAVE_LOCATION" | "NONE"
}

Rules:
- If the user says "emergency", "stop now", or "halt", set action to EMERGENCY_STOP and category to CONTROL.
- If the user says "help", "sos", or "call for help", set action to SOS.
- Always include destination as null when no clear place name is mentioned.
- Be conservative: when uncertain or empty input, return IRRELEVANT with confidence near 0.`;

/**
 * Classifies a transcribed user utterance into a structured command using Gemini.
 *
 * @param transcript - Raw speech-to-text result.
 * @param language - BCP-47 language code, e.g. "en", "si", "ta".
 */
export const classifyCommand = async (
  transcript: string,
  language = "en",
): Promise<ClassifiedCommand> => {
  if (!transcript || !transcript.trim()) {
    return {
      category: "IRRELEVANT",
      confidence: 0,
      intent: "empty",
      destination: null,
      action: "NONE",
      rawTranscript: transcript,
    };
  }

  const model = getClient().getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const prompt = `User language: ${language}\nUser said: "${transcript}"`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      category: "IRRELEVANT",
      confidence: 0,
      intent: "parse_error",
      destination: null,
      action: "NONE",
      rawTranscript: transcript,
    };
  }

  const obj = parsed as Partial<ClassifiedCommand>;
  return {
    category: (obj.category as ClassifiedCommand["category"]) ?? "IRRELEVANT",
    confidence: typeof obj.confidence === "number" ? obj.confidence : 0,
    intent: obj.intent ?? "",
    destination: obj.destination ?? null,
    action: obj.action ?? "NONE",
    rawTranscript: transcript,
  };
};

/**
 * Transcribes inline audio bytes via Gemini multimodal. Used as a fallback when
 * the browser Web Speech API is unavailable.
 *
 * @param audioBase64 - Base64-encoded audio content.
 * @param mimeType - e.g. "audio/webm" or "audio/wav".
 * @param language - BCP-47 language code.
 */
export const transcribeAudio = async (
  audioBase64: string,
  mimeType: string,
  language = "en",
): Promise<string> => {
  const model = getClient().getGenerativeModel({
    model: modelName,
    generationConfig: { temperature: 0.0 },
  });

  const result = await model.generateContent([
    {
      text: `Transcribe the speech in this audio in ${language}. Return ONLY the transcript text, nothing else.`,
    },
    { inlineData: { data: audioBase64, mimeType } },
  ]);
  return result.response.text().trim();
};
