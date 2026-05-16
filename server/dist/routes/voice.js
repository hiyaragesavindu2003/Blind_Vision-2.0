"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const geminiService_js_1 = require("../services/geminiService.js");
const router = (0, express_1.Router)();
const classifySchema = zod_1.z.object({
    transcript: zod_1.z.string().min(1).max(2000),
    language: zod_1.z.string().min(2).max(10).optional(),
});
router.post("/classify", (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const parsed = classifySchema.safeParse(req.body);
    if (!parsed.success) {
        res
            .status(400)
            .json({ error: "Invalid body", details: parsed.error.flatten() });
        return;
    }
    const result = await (0, geminiService_js_1.classifyCommand)(parsed.data.transcript, parsed.data.language);
    res.json(result);
}));
const transcribeSchema = zod_1.z.object({
    audioBase64: zod_1.z.string().min(10),
    mimeType: zod_1.z.string().min(1).max(64),
    language: zod_1.z.string().min(2).max(10).optional(),
});
router.post("/transcribe", (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const parsed = transcribeSchema.safeParse(req.body);
    if (!parsed.success) {
        res
            .status(400)
            .json({ error: "Invalid body", details: parsed.error.flatten() });
        return;
    }
    const text = await (0, geminiService_js_1.transcribeAudio)(parsed.data.audioBase64, parsed.data.mimeType, parsed.data.language);
    res.json({ transcript: text });
}));
exports.default = router;
//# sourceMappingURL=voice.js.map