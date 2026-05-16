"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamSpeech = void 0;
const axios_1 = __importDefault(require("axios"));
const apiKey = process.env.ELEVENLABS_API_KEY;
const defaultVoice = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM"; // Rachel
const defaultModel = process.env.ELEVENLABS_MODEL_ID ?? "eleven_turbo_v2_5";
const ELEVEN_BASE = "https://api.elevenlabs.io/v1";
/**
 * Streams ElevenLabs TTS audio (audio/mpeg) directly into the provided Express
 * response. We use streaming to keep the perceived latency low.
 */
const streamSpeech = async (res, opts) => {
    if (!apiKey) {
        throw Object.assign(new Error("ELEVENLABS_API_KEY is not configured"), {
            status: 503,
        });
    }
    const voiceId = opts.voiceId ?? defaultVoice;
    const modelId = opts.modelId ?? defaultModel;
    const url = `${ELEVEN_BASE}/text-to-speech/${voiceId}/stream?optimize_streaming_latency=3`;
    const response = await axios_1.default.post(url, {
        text: opts.text,
        model_id: modelId,
        voice_settings: {
            stability: opts.stability ?? 0.75,
            similarity_boost: opts.similarityBoost ?? 0.8,
            style: 0.0,
            use_speaker_boost: true,
        },
    }, {
        headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
        },
        responseType: "stream",
        timeout: 30_000,
    });
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response.data.pipe(res);
};
exports.streamSpeech = streamSpeech;
//# sourceMappingURL=elevenlabsService.js.map