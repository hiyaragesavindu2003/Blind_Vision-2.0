import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";

interface GeoOptions {
  enableHighAccuracy?: boolean;
  enabled?: boolean;
  onUpdate?: (
    position: { lat: number; lng: number },
    accuracy: number,
    speed: number | null,
  ) => void;
  onError?: (error: GeolocationPositionError) => void;
}

/**
 * Continuously tracks the user's GPS position via watchPosition and writes it
 * into the Zustand store. Pauses watch when `enabled` is false to save battery.
 */
export const useGeolocation = (opts: GeoOptions = {}): void => {
  const setPosition = useAppStore((s) => s.setPosition);
  const enabled = opts.enabled ?? true;
  const watchId = useRef<number | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed } = pos.coords;
        setPosition({ lat: latitude, lng: longitude }, accuracy);
        optsRef.current.onUpdate?.(
          { lat: latitude, lng: longitude },
          accuracy,
          speed,
        );
      },
      (err) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[geo] error", err);
        }
        optsRef.current.onError?.(err);
      },
      {
        enableHighAccuracy: opts.enableHighAccuracy ?? true,
        maximumAge: 5_000,
        timeout: 15_000,
      },
    );
    watchId.current = id;

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [enabled, opts.enableHighAccuracy, setPosition]);
};
