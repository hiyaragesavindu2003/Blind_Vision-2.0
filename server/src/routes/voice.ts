import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  classifyCommand,
  transcribeAudio,
} from "../services/geminiService.js";

const router = Router();

const classifySchema = z.object({
  transcript: z.string().min(1).max(2000),
  language: z.string().min(2).max(10).optional(),
});

router.post(
  "/classify",
  asyncHandler(async (req, res) => {
    const parsed = classifySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid body", details: parsed.error.flatten() });
      return;
    }
    const result = await classifyCommand(
      parsed.data.transcript,
      parsed.data.language,
    );
    res.json(result);
  }),
);

const transcribeSchema = z.object({
  audioBase64: z.string().min(10),
  mimeType: z.string().min(1).max(64),
  language: z.string().min(2).max(10).optional(),
});

router.post(
  "/transcribe",
  asyncHandler(async (req, res) => {
    const parsed = transcribeSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid body", details: parsed.error.flatten() });
      return;
    }
    const text = await transcribeAudio(
      parsed.data.audioBase64,
      parsed.data.mimeType,
      parsed.data.language,
    );
    res.json({ transcript: text });
  }),
);

export default router;
