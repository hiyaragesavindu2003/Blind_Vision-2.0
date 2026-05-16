import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import { useCamera } from "@/hooks/useCamera";
import { useObjectDetection } from "@/hooks/useObjectDetection";
import { useElevenLabs } from "@/hooks/useElevenLabs";
import { VOICE_SCRIPTS } from "@/constants/voiceScripts";
import { IconAlert, IconCamera, IconCameraOff } from "./icons";

const cameraSupported =
  typeof navigator !== "undefined" &&
  typeof navigator.mediaDevices?.getUserMedia === "function";

interface ObstacleDetectorProps {
  enabled: boolean;
  fps?: number;
}

const priorityChip = (
  priority: "HIGH" | "MEDIUM" | "LOW",
): string => {
  if (priority === "HIGH") return "chip-emergency";
  if (priority === "MEDIUM") return "chip-warning";
  return "chip-active";
};

const ObstacleDetector = ({
  enabled,
  fps = 5,
}: ObstacleDetectorProps): JSX.Element => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { speakHigh } = useElevenLabs();

  const camera = useCamera(videoRef, enabled);
  const detections = useAppStore((s) => s.detections);
  const cameraOn = useAppStore((s) => s.cameraOn);
  const setCameraOn = useAppStore((s) => s.setCameraOn);

  useObjectDetection({ videoRef, enabled: enabled && cameraOn, fps });

  const handleEnableCamera = (): void => {
    setCameraOn(true);
    speakHigh(VOICE_SCRIPTS.cameraOn);
  };

  const handleDisableCamera = (): void => {
    setCameraOn(false);
  };

  useEffect(() => {
    if (camera.error) speakHigh(VOICE_SCRIPTS.cameraDenied);
  }, [camera.error, speakHigh]);

  useEffect(() => {
    const cv = canvasRef.current;
    const vid = videoRef.current;
    if (!cv || !vid) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const w = vid.videoWidth || 640;
    const h = vid.videoHeight || 480;
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    ctx.clearRect(0, 0, cv.width, cv.height);

    detections.forEach((d) => {
      const [x, y, bw, bh] = d.bbox;
      ctx.lineWidth = 4;
      ctx.strokeStyle =
        d.priority === "HIGH"
          ? "#ff3535"
          : d.priority === "MEDIUM"
          ? "#ff8a3c"
          : "#00ff95";

      // Rounded rect
      const r = 14;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + bw, y, x + bw, y + bh, r);
      ctx.arcTo(x + bw, y + bh, x, y + bh, r);
      ctx.arcTo(x, y + bh, x, y, r);
      ctx.arcTo(x, y, x + bw, y, r);
      ctx.closePath();
      ctx.stroke();

      // Label background
      const label = `${d.class} ${(d.score * 100).toFixed(0)}%`;
      ctx.font = "bold 16px 'Atkinson Hyperlegible', sans-serif";
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(6,7,10,0.85)";
      ctx.fillRect(x, Math.max(0, y - 26), tw + 14, 24);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillText(label, x + 7, Math.max(16, y - 8));
    });
  }, [detections]);

  return (
    <section
      className="panel"
      aria-label="Obstacle detection"
      role="region"
    >
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <p className="kicker">Vision</p>
          <h2 className="text-2xl font-bold">Obstacle Detection</h2>
        </div>
        {cameraOn && (
          <button
            type="button"
            onClick={handleDisableCamera}
            className="btn-secondary !min-h-[44px] !min-w-[44px] !text-sm !px-4"
            aria-label="Disable camera"
          >
            <IconCameraOff size={18} />
            Stop
          </button>
        )}
      </div>

      <div className="relative bg-black rounded-2xl overflow-hidden aspect-video border border-ink-border">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          aria-hidden="true"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        />

        {/* Recording indicator */}
        {cameraOn && (
          <div
            className="absolute top-3 left-3 chip chip-active text-xs"
            aria-hidden="true"
          >
            <span className="status-dot dot-emergency animate-slow-blink" />
            LIVE · {fps} FPS
          </div>
        )}

        {!cameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink-card-2/95 p-6 text-center">
            <span className="flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 text-accent">
              <IconCamera size={28} />
            </span>
            <div>
              <p className="text-lg font-bold">Camera is off</p>
              <p className="text-sm text-text-muted max-w-sm mt-1">
                Enable the camera to detect obstacles, vehicles, and people on
                your path. The model runs locally in your browser.
              </p>
            </div>
            <button
              type="button"
              onClick={handleEnableCamera}
              disabled={!cameraSupported}
              aria-label="Enable camera for obstacle detection"
              className="btn-primary"
            >
              <IconCamera size={20} />
              Enable Camera
            </button>
            {!cameraSupported && (
              <p className="text-warning text-sm" role="alert">
                Camera is not supported in this browser.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Detections list */}
      <div className="mt-4">
        <p className="kicker mb-2">Detected</p>
        {detections.length === 0 && cameraOn && (
          <div className="flex items-center gap-2 text-text-muted">
            <span className="status-dot dot-active" />
            Path is clear
          </div>
        )}
        {!cameraOn && (
          <p className="text-sm text-text-subtle italic">
            Detection paused while camera is off.
          </p>
        )}
        {cameraOn && detections.length > 0 && (
          <ul
            className="flex flex-wrap gap-2"
            aria-live="polite"
          >
            {detections.slice(0, 8).map((d, i) => (
              <li
                key={`${d.class}-${i}`}
                className={`chip ${priorityChip(d.priority)}`}
              >
                <span className="font-bold">{d.class}</span>
                <span className="text-xs opacity-80">
                  {d.direction} · {d.proximity} ·{" "}
                  {(d.score * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {camera.error && (
        <div
          className="mt-4 p-3 rounded-xl border border-warning/40 bg-warning/10 text-warning flex items-start gap-3"
          role="alert"
        >
          <IconAlert size={18} className="mt-1 flex-shrink-0" />
          <p className="text-sm">Camera unavailable: {camera.error}</p>
        </div>
      )}
    </section>
  );
};

export default ObstacleDetector;
