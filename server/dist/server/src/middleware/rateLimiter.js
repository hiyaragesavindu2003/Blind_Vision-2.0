import rateLimit from "express-rate-limit";
const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const max = Number(process.env.RATE_LIMIT_MAX ?? 100);
/**
 * Default API rate limiter: 100 req/min/IP. Tightens TTS abuse since the
 * underlying ElevenLabs cost is non-trivial.
 */
export const apiRateLimiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please slow down." },
});
/**
 * Stricter limiter for TTS endpoints (audio generation is expensive).
 */
export const ttsRateLimiter = rateLimit({
    windowMs,
    max: Math.max(20, Math.floor(max / 2)),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "TTS request limit reached. Please slow down." },
});
//# sourceMappingURL=rateLimiter.js.map