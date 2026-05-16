"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const elevenlabsService_js_1 = require("../services/elevenlabsService.js");
const router = (0, express_1.Router)();
const speakSchema = zod_1.z.object({
    text: zod_1.z.string().min(1).max(2000),
    voiceId: zod_1.z.string().min(1).max(100).optional(),
    modelId: zod_1.z.string().min(1).max(100).optional(),
    stability: zod_1.z.number().min(0).max(1).optional(),
    similarityBoost: zod_1.z.number().min(0).max(1).optional(),
    language: zod_1.z.string().min(2).max(10).optional(),
});
router.post("/speak", (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const parsed = speakSchema.safeParse(req.body);
    if (!parsed.success) {
        res
            .status(400)
            .json({ error: "Invalid body", details: parsed.error.flatten() });
        return;
    }
    await (0, elevenlabsService_js_1.streamSpeech)(res, parsed.data);
}));
exports.default = router;
//# sourceMappingURL=tts.js.map