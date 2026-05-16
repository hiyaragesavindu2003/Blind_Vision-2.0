"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ttsRateLimiter = exports.apiRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const max = Number(process.env.RATE_LIMIT_MAX ?? 100);
/**
 * Default API rate limiter: 100 req/min/IP. Tightens TTS abuse since the
 * underlying ElevenLabs cost is non-trivial.
 */
exports.apiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please slow down." },
});
/**
 * Stricter limiter for TTS endpoints (audio generation is expensive).
 */
exports.ttsRateLimiter = (0, express_rate_limit_1.default)({
    windowMs,
    max: Math.max(20, Math.floor(max / 2)),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "TTS request limit reached. Please slow down." },
});
//# sourceMappingURL=rateLimiter.js.map