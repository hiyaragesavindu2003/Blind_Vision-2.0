import "dotenv/config";
import express from "express";
import http from "node:http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { Server as SocketIOServer } from "socket.io";
import voiceRoutes from "./routes/voice.js";
import ttsRoutes from "./routes/tts.js";
import navigationRoutes from "./routes/navigation.js";
import { getActiveProvider } from "./services/routingService.js";
import { registerSocketHandlers } from "./socket/socketHandler.js";
import { apiRateLimiter, ttsRateLimiter, } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler, } from "./middleware/errorHandler.js";
const PORT = Number(process.env.PORT ?? 3001);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
const app = express();
const server = http.createServer(app);
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
}));
app.use(cors({
    origin: FRONTEND_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        uptime: process.uptime(),
        services: {
            gemini: Boolean(process.env.GEMINI_API_KEY),
            elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
            maps: Boolean(process.env.GOOGLE_MAPS_API_KEY),
            ors: Boolean(process.env.ORS_API_KEY),
        },
        routingProvider: getActiveProvider(),
    });
});
app.use("/api/voice", apiRateLimiter, voiceRoutes);
app.use("/api/tts", ttsRateLimiter, ttsRoutes);
app.use("/api/navigation", apiRateLimiter, navigationRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
const io = new SocketIOServer(server, {
    cors: {
        origin: FRONTEND_ORIGIN.split(",").map((s) => s.trim()),
        credentials: true,
    },
    path: "/socket",
});
registerSocketHandlers(io);
server.listen(PORT, () => {
    console.log(`[server] AI Navigation Assistant API listening on http://localhost:${PORT}`);
    console.log(`[server] CORS allow-list: ${FRONTEND_ORIGIN}`);
    if (!process.env.GEMINI_API_KEY)
        console.warn("[server] GEMINI_API_KEY missing — voice classification disabled.");
    if (!process.env.ELEVENLABS_API_KEY)
        console.warn("[server] ELEVENLABS_API_KEY missing — TTS disabled.");
    if (!process.env.GOOGLE_MAPS_API_KEY && !process.env.ORS_API_KEY) {
        console.warn("[server] No routing provider configured — set GOOGLE_MAPS_API_KEY or ORS_API_KEY.");
    }
    else {
        console.log(`[server] Routing provider: ${getActiveProvider()}`);
    }
});
//# sourceMappingURL=server.js.map