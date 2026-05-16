import { useCallback, useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import { requestRoute } from "@/services/mapsService";
import { saveLastRoute, loadLastRoute } from "@/utils/offlineCache";
import {
  decodePolyline,
  distanceToPolyline,
  haversineMeters,
} from "@/utils/geo";
import { VOICE_SCRIPTS } from "@/constants/voiceScripts";
import type { LatLng, NavigationRoute } from "@shared/types";
import { useElevenLabs } from "./useElevenLabs";

const WAYPOINT_THRESHOLD_M = 15;
const DEVIATION_THRESHOLD_M = 30;
const RECALC_BACKOFF_MS = 10_000;
const MAX_RECALCS = 3;
const FAR_DESTINATION_KM = 5;
const DISTANCE_ANNOUNCE_INTERVAL_MS = 60_000;

interface NavApi {
  startNavigation: (
    destination: LatLng | string,
    destinationName?: string,
  ) => Promise<void>;
  stopNavigation: (announce?: boolean) => void;
  pendingFarConfirmation: () => boolean;
  confirmFarRoute: () => Promise<void>;
}

/**
 * Drives the navigation state machine. Subscribes to GPS via the app store
 * and feeds step-by-step instructions through the TTS pipeline.
 */
export const useNavigation = (): NavApi => {
  const setRoute = useAppStore((s) => s.setRoute);
  const setNavState = useAppStore((s) => s.setNavState);
  const setAppMode = useAppStore((s) => s.setAppMode);
  const setStepIndex = useAppStore((s) => s.setCurrentStepIndex);
  const language = useAppStore((s) => s.language);
  const route = useAppStore((s) => s.route);
  const stepIndex = useAppStore((s) => s.currentStepIndex);
  const navState = useAppStore((s) => s.navState);
  const position = useAppStore((s) => s.position);

  const { speak, speakHigh } = useElevenLabs();

  const recalcCountRef = useRef(0);
  const lastRecalcAtRef = useRef(0);
  const lastDistanceAnnouncedAtRef = useRef(0);
  const decodedPolylineRef = useRef<LatLng[]>([]);
  const pendingFarRouteRef = useRef<NavigationRoute | null>(null);

  // Re-decode polyline when route changes.
  useEffect(() => {
    if (route?.polyline) {
      decodedPolylineRef.current = decodePolyline(route.polyline);
    } else {
      decodedPolylineRef.current = [];
    }
  }, [route]);

  const startNavigation = useCallback<NavApi["startNavigation"]>(
    async (destination, destinationName) => {
      const origin = useAppStore.getState().position;
      if (!origin) {
        speakHigh(
          "I don't have your location yet. Please wait for GPS to lock.",
        );
        return;
      }
      setNavState("CALCULATING");
      setAppMode("NAVIGATING");
      speak(VOICE_SCRIPTS.calculatingRoute);

      try {
        const newRoute = await requestRoute(
          origin,
          destination,
          destinationName,
          language,
        );
        const km = newRoute.totalDistanceMeters / 1000;
        if (km > FAR_DESTINATION_KM) {
          pendingFarRouteRef.current = newRoute;
          setNavState("IDLE");
          speakHigh(VOICE_SCRIPTS.routeFar(km));
          return;
        }
        commitRoute(newRoute);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[nav] route error", err);
        }
        const cached = loadLastRoute();
        if (cached) {
          speak(VOICE_SCRIPTS.connectionLost);
          commitRoute(cached);
        } else {
          speakHigh(VOICE_SCRIPTS.serverError);
          setNavState("IDLE");
          setAppMode("READY");
        }
      }
    },
    [language, setAppMode, setNavState, speak, speakHigh],
  );

  const commitRoute = useCallback(
    (newRoute: NavigationRoute) => {
      setRoute(newRoute);
      setStepIndex(0);
      saveLastRoute(newRoute);
      recalcCountRef.current = 0;
      lastDistanceAnnouncedAtRef.current = 0;
      setNavState("NAVIGATING");
      speakHigh(VOICE_SCRIPTS.routeStarted(newRoute.destinationName));
      const first = newRoute.steps[0];
      if (first) speak(first.instruction);
    },
    [setRoute, setStepIndex, setNavState, speak, speakHigh],
  );

  const stopNavigation = useCallback<NavApi["stopNavigation"]>(
    (announce = true) => {
      setRoute(null);
      setStepIndex(0);
      setNavState("IDLE");
      setAppMode("READY");
      if (announce) speak(VOICE_SCRIPTS.navigationStopped);
    },
    [setAppMode, setNavState, setRoute, setStepIndex, speak],
  );

  const pendingFarConfirmation = useCallback(
    () => pendingFarRouteRef.current !== null,
    [],
  );

  const confirmFarRoute = useCallback(async () => {
    const pending = pendingFarRouteRef.current;
    pendingFarRouteRef.current = null;
    if (!pending) return;
    commitRoute(pending);
  }, [commitRoute]);

  // GPS-driven step machine.
  useEffect(() => {
    if (!route || navState !== "NAVIGATING" || !position) return;

    const step = route.steps[stepIndex];
    if (!step) return;

    const distToStepEnd = haversineMeters(position, step.endLocation);

    // 1. Advance to next step when within waypoint threshold.
    if (distToStepEnd < WAYPOINT_THRESHOLD_M) {
      const nextIndex = stepIndex + 1;
      if (nextIndex >= route.steps.length) {
        setNavState("ARRIVED");
        speakHigh(VOICE_SCRIPTS.arrived(route.destinationName));
        return;
      }
      setStepIndex(nextIndex);
      const next = route.steps[nextIndex];
      if (next) speak(next.instruction);
      return;
    }

    // 2. Periodic distance announcement.
    const now = Date.now();
    const distToDest = haversineMeters(position, route.destination);
    if (
      now - lastDistanceAnnouncedAtRef.current >
      DISTANCE_ANNOUNCE_INTERVAL_MS
    ) {
      lastDistanceAnnouncedAtRef.current = now;
      speak(VOICE_SCRIPTS.distanceRemaining(distToDest), {
        priority: "LOW",
      });
    }

    // 3. Deviation detection -> recalculate.
    const polyline = decodedPolylineRef.current;
    if (polyline.length > 1) {
      const offRoute = distanceToPolyline(position, polyline);
      if (
        offRoute > DEVIATION_THRESHOLD_M &&
        now - lastRecalcAtRef.current > RECALC_BACKOFF_MS
      ) {
        lastRecalcAtRef.current = now;
        recalcCountRef.current += 1;
        if (recalcCountRef.current > MAX_RECALCS) {
          speakHigh(VOICE_SCRIPTS.lostUser);
          setNavState("IDLE");
          return;
        }
        setNavState("RECALCULATING");
        speak(VOICE_SCRIPTS.recalculating);
        void requestRoute(
          position,
          route.destination,
          route.destinationName,
          language,
        )
          .then((updated) => {
            saveLastRoute(updated);
            setRoute(updated);
            setStepIndex(0);
            setNavState("NAVIGATING");
            const first = updated.steps[0];
            if (first) speak(first.instruction);
          })
          .catch(() => {
            setNavState("NAVIGATING");
          });
      }
    }
  }, [
    language,
    navState,
    position,
    route,
    setNavState,
    setRoute,
    setStepIndex,
    speak,
    speakHigh,
    stepIndex,
  ]);

  return {
    startNavigation,
    stopNavigation,
    pendingFarConfirmation,
    confirmFarRoute,
  };
};
