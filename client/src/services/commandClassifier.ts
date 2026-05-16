import type { ClassifiedCommand, ControlAction } from "@shared/types";
import { classifyCommand as remoteClassify } from "./geminiService";

/**
 * Local rule-based classifier used as a fast path for emergency / control
 * commands AND as a fallback when the backend is unreachable. The remote
 * Gemini classifier is the primary path for NAVIGATION/SAFETY intents.
 */

const EMERGENCY_RE =
  /\b(emergency|halt|stop now|stop everything|panic)\b/i;
const SOS_RE = /\b(sos|call for help|help me|i need help)\b/i;
const STOP_NAV_RE =
  /\b(stop navigation|cancel route|cancel navigation|stop guiding)\b/i;
const MUTE_RE = /\b(mute|be quiet|silence|shut up)\b/i;
const UNMUTE_RE = /\b(unmute|speak again|resume voice)\b/i;
const REPEAT_RE = /\b(repeat|say again|what did you say|again please)\b/i;
const CAMERA_RE = /\b(camera|toggle camera|enable camera|disable camera)\b/i;
const SAVE_LOC_RE =
  /\b(save (?:this|current) location(?: as)?|bookmark this place(?: as)?)\s+(.+)/i;
const TAKE_ME_RE =
  /\b(take me to|navigate to|go to|directions to)\s+(.+)/i;
const SAFETY_RE =
  /\b(what(?:'s)? (?:around|in front)|is it safe|describe surroundings|what do you see)\b/i;

export const localClassify = (
  transcript: string,
): ClassifiedCommand | null => {
  const text = transcript.trim();
  if (!text) return null;

  if (EMERGENCY_RE.test(text)) {
    return ctrl(text, "EMERGENCY_STOP", "emergency stop", 1);
  }
  if (SOS_RE.test(text)) return ctrl(text, "SOS", "request emergency help", 0.95);
  if (STOP_NAV_RE.test(text)) return ctrl(text, "STOP", "stop navigation", 0.9);
  if (MUTE_RE.test(text)) return ctrl(text, "MUTE", "mute voice", 0.9);
  if (UNMUTE_RE.test(text)) return ctrl(text, "UNMUTE", "unmute voice", 0.9);
  if (REPEAT_RE.test(text))
    return ctrl(text, "REPEAT", "repeat last instruction", 0.9);
  if (CAMERA_RE.test(text))
    return ctrl(text, "CAMERA_TOGGLE", "toggle camera", 0.9);

  const saveMatch = SAVE_LOC_RE.exec(text);
  if (saveMatch) {
    return {
      category: "CONTROL",
      confidence: 0.85,
      intent: "save current location as favorite",
      destination: saveMatch[2].trim(),
      action: "SAVE_LOCATION",
      rawTranscript: text,
    };
  }

  const takeMatch = TAKE_ME_RE.exec(text);
  if (takeMatch) {
    return {
      category: "NAVIGATION",
      confidence: 0.85,
      intent: "navigate to destination",
      destination: takeMatch[2].trim(),
      action: null,
      rawTranscript: text,
    };
  }

  if (SAFETY_RE.test(text)) {
    return {
      category: "SAFETY",
      confidence: 0.8,
      intent: "describe surroundings",
      destination: null,
      action: null,
      rawTranscript: text,
    };
  }

  return null;
};

const ctrl = (
  transcript: string,
  action: ControlAction,
  intent: string,
  confidence: number,
): ClassifiedCommand => ({
  category: "CONTROL",
  confidence,
  intent,
  destination: null,
  action,
  rawTranscript: transcript,
});

/**
 * Hybrid classifier: local first (fast / offline-safe), Gemini second.
 */
export const classifyCommand = async (
  transcript: string,
  language = "en",
): Promise<ClassifiedCommand> => {
  const local = localClassify(transcript);
  if (local && (local.action === "EMERGENCY_STOP" || local.action === "SOS")) {
    return local;
  }

  try {
    const remote = await remoteClassify(transcript, language);
    if (remote.confidence >= 0.5) return remote;
    if (local) return local;
    return remote;
  } catch {
    return (
      local ?? {
        category: "IRRELEVANT",
        confidence: 0,
        intent: "offline_no_classifier",
        destination: null,
        action: null,
        rawTranscript: transcript,
      }
    );
  }
};
