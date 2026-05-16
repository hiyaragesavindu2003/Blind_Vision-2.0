"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const node_http_1 = __importDefault(require("node:http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const socket_io_1 = require("socket.io");
const voice_js_1 = __importDefault(require("./routes/voice.js"));
const tts_js_1 = __importDefault(require("./routes/tts.js"));
const navigation_js_1 = __importDefault(require("./routes/navigation.js"));
const socketHandler_js_1 = require("./socket/socketHandler.js");
const rateLimiter_js_1 = require("./middleware/rateLimiter.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const PORT = Number(process.env.PORT ?? 3001);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
const app = (0, express_1.default)();
const server = node_http_1.default.createServer(app);
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
}));
app.use((0, cors_1.default)({
    origin: FRONTEND_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
app.use((0, morgan_1.default)(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        uptime: process.uptime(),
        services: {
            gemini: Boolean(process.env.GEMINI_API_KEY),
            elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
            maps: Boolean(process.env.GOOGLE_MAPS_API_KEY),
        },
    });
});
app.use("/api/voice", rateLimiter_js_1.apiRateLimiter, voice_js_1.default);
app.use("/api/tts", rateLimiter_js_1.ttsRateLimiter, tts_js_1.default);
app.use("/api/navigation", rateLimiter_js_1.apiRateLimiter, navigation_js_1.default);
app.use(errorHandler_js_1.notFoundHandler);
app.use(errorHandler_js_1.errorHandler);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: FRONTEND_ORIGIN.split(",").map((s) => s.trim()),
        credentials: true,
    },
    path: "/socket",
});
(0, socketHandler_js_1.registerSocketHandlers)(io);
server.listen(PORT, () => {
    console.log(`[server] AI Navigation Assistant API listening on http://localhost:${PORT}`);
    console.log(`[server] CORS allow-list: ${FRONTEND_ORIGIN}`);
    if (!process.env.GEMINI_API_KEY)
        console.warn("[server] GEMINI_API_KEY missing — voice classification disabled.");
    if (!process.env.ELEVENLABS_API_KEY)
        console.warn("[server] ELEVENLABS_API_KEY missing — TTS disabled.");
    if (!process.env.GOOGLE_MAPS_API_KEY)
        console.warn("[server] GOOGLE_MAPS_API_KEY missing — navigation disabled.");
});
//# sourceMappingURL=server.js.map