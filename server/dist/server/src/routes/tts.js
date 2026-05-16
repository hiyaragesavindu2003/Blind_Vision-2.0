import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler.js";
import { streamSpeech } from "../services/elevenlabsService.js";
const router = Router();
const speakSchema = z.object({
    text: z.string().min(1).max(2000),
    voiceId: z.string().min(1).max(100).optional(),
    modelId: z.string().min(1).max(100).optional(),
    stability: z.number().min(0).max(1).optional(),
    similarityBoost: z.number().min(0).max(1).optional(),
    language: z.string().min(2).max(10).optional(),
});
router.post("/speak", asyncHandler(async (req, res) => {
    const parsed = speakSchema.safeParse(req.body);
    if (!parsed.success) {
        res
            .status(400)
            .json({ error: "Invalid body", details: parsed.error.flatten() });
        return;
    }
    await streamSpeech(res, parsed.data);
}));
export default router;
//# sourceMappingURL=tts.js.map