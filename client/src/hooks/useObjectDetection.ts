import { useEffect, useRef } from "react";
import type { DetectedObject } from "@shared/types";
import {
  HIGH_PRIORITY_OBJECTS,
  MEDIUM_PRIORITY_OBJECTS,
  VOICE_SCRIPTS,
} from "@/constants/voiceScripts";
import { createKeyedDebouncer } from "@/utils/noiseFilter";
import { useAppStore } from "@/store/appStore";
import { useElevenLabs } from "./useElevenLabs";

type CocoSsdModule = typeof import("@tensorflow-models/coco-ssd");
type CocoSsdModel = Awaited<
  ReturnType<CocoSsdModule["load"]>
>;

interface DetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  fps?: number;
  confidenceThreshold?: number;
}

const directionFromBox = (
  bbox: [number, number, number, number],
  frameWidth: number,
): DetectedObject["direction"] => {
  const centerX = bbox[0] + bbox[2] / 2;
  if (centerX < frameWidth * 0.33) return "left";
  if (centerX > frameWidth * 0.66) return "right";
  return "center";
};

const proximityFromBox = (
  bbox: [number, number, number, number],
  frameWidth: number,
  frameHeight: number,
): DetectedObject["proximity"] => {
  const area = (bbox[2] * bbox[3]) / (frameWidth * frameHeight);
  if (area > 0.3) return "very-close";
  if (area > 0.1) return "near";
  return "far";
};

const priorityFor = (
  className: string,
  proximity: DetectedObject["proximity"],
): DetectedObject["priority"] => {
  if (HIGH_PRIORITY_OBJECTS.has(className)) return "HIGH";
  if (proximity === "very-close") return "HIGH";
  if (MEDIUM_PRIORITY_OBJECTS.has(className)) return "MEDIUM";
  return "LOW";
};

const directionWord = (d: DetectedObject["direction"]): string => {
  if (d === "left") return "on your left";
  if (d === "right") return "on your right";
  return "directly ahead";
};

/**
 * Loads COCO-SSD lazily, runs inference at a throttled FPS, and announces
 * priority obstacles via ElevenLabs while debouncing per-object-class.
 */
export const useObjectDetection = ({
  videoRef,
  enabled,
  fps = 5,
  confidenceThreshold = 0.6,
}: DetectionOptions): void => {
  const setDetections = useAppStore((s) => s.setDetections);
  const cameraOn = useAppStore((s) => s.cameraOn);
  const navState = useAppStore((s) => s.navState);
  const { speak, speakHigh } = useElevenLabs();
  const modelRef = useRef<CocoSsdModel | null>(null);
  const loadingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastInferRef = useRef(0);
  const debouncerRef = useRef(createKeyedDebouncer(5_000));
  const clearDebouncerRef = useRef(createKeyedDebouncer(15_000));

  useEffect(() => {
    if (!enabled || !cameraOn) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    let cancelled = false;
    const minInterval = 1000 / Math.max(1, fps);

    const ensureModel = async (): Promise<CocoSsdModel | null> => {
      if (modelRef.current) return modelRef.current;
      if (loadingRef.current) return null;
      loadingRef.current = true;
      try {
        const tf = await import("@tensorflow/tfjs");
        await import("@tensorflow/tfjs-backend-webgl");
        await tf.setBackend("webgl");
        await tf.ready();
        const cocoSsd = await import("@tensorflow-models/coco-ssd");
        const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
        modelRef.current = model;
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[detect] model load failed", err);
        }
      } finally {
        loadingRef.current = false;
      }
      return modelRef.current;
    };

    const loop = async (): Promise<void> => {
      if (cancelled) return;
      const video = videoRef.current;
      const now = performance.now();
      if (!video || video.readyState < 2 || now - lastInferRef.current < minInterval) {
        rafRef.current = requestAnimationFrame(() => void loop());
        return;
      }
      lastInferRef.current = now;

      const model = await ensureModel();
      if (!model || cancelled) {
        rafRef.current = requestAnimationFrame(() => void loop());
        return;
      }

      try {
        const predictions = await model.detect(video, 6);
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        const detected: DetectedObject[] = predictions
          .filter((p) => p.score >= confidenceThreshold)
          .map((p) => {
            const direction = directionFromBox(
              p.bbox as [number, number, number, number],
              w,
            );
            const proximity = proximityFromBox(
              p.bbox as [number, number, number, number],
              w,
              h,
            );
            return {
              class: p.class,
              score: p.score,
              bbox: p.bbox as [number, number, number, number],
              direction,
              proximity,
              priority: priorityFor(p.class, proximity),
              timestamp: Date.now(),
            };
          });

        setDetections(detected);

        // Sort to surface HIGH priority first.
        const ranked = [...detected].sort((a, b) => {
          const order = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
          return order[a.priority] - order[b.priority];
        });

        for (const obj of ranked.slice(0, 2)) {
          const key = `${obj.class}:${obj.direction}`;
          if (!debouncerRef.current.shouldFire(key)) continue;

          const dir = directionWord(obj.direction);
          let utterance = "";
          let priority: "HIGH" | "MEDIUM" | "LOW" = obj.priority;

          if (
            obj.class === "car" ||
            obj.class === "truck" ||
            obj.class === "bus" ||
            obj.class === "motorcycle"
          ) {
            utterance = VOICE_SCRIPTS.vehicleWarning(dir);
          } else if (obj.class === "person") {
            utterance =
              obj.proximity === "very-close"
                ? `Person very close ${dir}.`
                : VOICE_SCRIPTS.personPassing(dir);
          } else {
            utterance = VOICE_SCRIPTS.obstacleAhead(obj.class, dir);
          }

          if (priority === "HIGH") speakHigh(utterance);
          else speak(utterance);
        }

        // Path-clear announcement: only when navigating, no detections nearby,
        // and we haven't said it recently.
        if (
          navState === "NAVIGATING" &&
          detected.every((d) => d.proximity === "far") &&
          clearDebouncerRef.current.shouldFire("path-clear")
        ) {
          speak(VOICE_SCRIPTS.pathClear, { priority: "LOW" });
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[detect] inference error", err);
        }
      }

      rafRef.current = requestAnimationFrame(() => void loop());
    };

    rafRef.current = requestAnimationFrame(() => void loop());

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [
    cameraOn,
    confidenceThreshold,
    enabled,
    fps,
    navState,
    setDetections,
    speak,
    speakHigh,
    videoRef,
  ]);
};
