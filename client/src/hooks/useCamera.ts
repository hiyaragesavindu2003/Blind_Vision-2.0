import { useCallback, useEffect, useRef, useState } from "react";

interface CameraState {
  stream: MediaStream | null;
  ready: boolean;
  error: string | null;
}

/**
 * useCamera attaches the rear/environment camera to a <video> element ref.
 * Turn the camera on by passing `enabled=true`; when disabled, all tracks
 * are stopped to save battery.
 */
export const useCamera = (
  videoRef: React.RefObject<HTMLVideoElement>,
  enabled: boolean,
): CameraState => {
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>({
    stream: null,
    ready: false,
    error: null,
  });

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState({ stream: null, ready: false, error: null });
  }, [videoRef]);

  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 24 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setState({ stream, ready: true, error: null });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "camera_unavailable";
        setState({ stream: null, ready: false, error: message });
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, stop, videoRef]);

  return state;
};
