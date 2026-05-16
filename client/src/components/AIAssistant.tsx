import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { useElevenLabs } from "@/hooks/useElevenLabs";
import { fetchNearby } from "@/services/mapsService";
import {
  findFavoriteByName,
  listFavorites,
  saveFavorite,
} from "@/utils/offlineCache";
import { VOICE_SCRIPTS } from "@/constants/voiceScripts";
import VoiceInterface from "./VoiceInterface";
import type { ClassifiedCommand, LatLng } from "@shared/types";

export interface NavigationApi {
  startNavigation: (
    destination: LatLng | string,
    destinationName?: string,
  ) => Promise<void>;
  stopNavigation: (announce?: boolean) => void;
  pendingFarConfirmation: () => boolean;
  confirmFarRoute: () => Promise<void>;
}

interface AIAssistantProps {
  voiceEnabled: boolean;
  navigationApi: NavigationApi;
  onSos: () => void;
}

/**
 * Central orchestrator that wires voice intents into navigation, safety,
 * and control actions. Receives the navigation API from App so the route
 * state machine has a single owner.
 */
export const AIAssistant = ({
  voiceEnabled,
  navigationApi,
  onSos,
}: AIAssistantProps): JSX.Element => {
  const setMuted = useAppStore((s) => s.setMuted);
  const muted = useAppStore((s) => s.muted);
  const toggleCamera = useAppStore((s) => s.toggleCamera);
  const setFavorites = useAppStore((s) => s.setFavorites);
  const addFavorite = useAppStore((s) => s.addFavorite);
  const emergencyStop = useAppStore((s) => s.emergencyStop);

  const { speak, speakHigh, repeatLast } = useElevenLabs();
  const {
    startNavigation,
    stopNavigation,
    pendingFarConfirmation,
    confirmFarRoute,
  } = navigationApi;

  const [welcomed, setWelcomed] = useState(false);

  useEffect(() => {
    void listFavorites().then(setFavorites);
  }, [setFavorites]);

  useEffect(() => {
    if (welcomed || !voiceEnabled) return;
    setWelcomed(true);
    const t = window.setTimeout(() => {
      speak(VOICE_SCRIPTS.welcome);
    }, 1_500);
    return () => window.clearTimeout(t);
  }, [speak, voiceEnabled, welcomed]);

  const describeSurroundings = useCallback(async () => {
    const pos = useAppStore.getState().position;
    if (!pos) {
      speak("I don't have your location yet.");
      return;
    }
    try {
      const places = await fetchNearby(pos, 80);
      if (places.length === 0) {
        speak("I don't see anything notable around you.");
        return;
      }
      const top = places.slice(0, 3).map((p) => p.name).join(", ");
      speak(`Nearby: ${top}.`);
    } catch {
      speak(VOICE_SCRIPTS.serverError);
    }
  }, [speak]);

  const handleSaveLocation = useCallback(
    async (name: string) => {
      const pos = useAppStore.getState().position;
      if (!pos) {
        speak("I can't save without your current location.");
        return;
      }
      const fav = {
        id: `fav_${Date.now()}`,
        name,
        lat: pos.lat,
        lng: pos.lng,
        createdAt: Date.now(),
      };
      await saveFavorite(fav);
      addFavorite(fav);
      speak(VOICE_SCRIPTS.locationSaved(name));
    },
    [addFavorite, speak],
  );

  const handleNavigationIntent = useCallback(
    async (cmd: ClassifiedCommand) => {
      if (!cmd.destination) {
        speak("Where would you like to go?");
        return;
      }
      const fav = await findFavoriteByName(cmd.destination);
      if (fav) {
        speak(VOICE_SCRIPTS.takingYouTo(fav.name));
        await startNavigation({ lat: fav.lat, lng: fav.lng }, fav.name);
        return;
      }
      await startNavigation(cmd.destination, cmd.destination);
    },
    [speak, startNavigation],
  );

  const handleControlAction = useCallback(
    (cmd: ClassifiedCommand) => {
      switch (cmd.action) {
        case "EMERGENCY_STOP":
          emergencyStop();
          speakHigh(VOICE_SCRIPTS.emergencyActivated);
          return;
        case "STOP":
          stopNavigation();
          return;
        case "MUTE":
          speak(VOICE_SCRIPTS.voiceMuted);
          window.setTimeout(() => setMuted(true), 600);
          return;
        case "UNMUTE":
          setMuted(false);
          speak(VOICE_SCRIPTS.voiceUnmuted);
          return;
        case "REPEAT":
          repeatLast();
          return;
        case "CAMERA_TOGGLE":
          toggleCamera();
          speak(
            useAppStore.getState().cameraOn
              ? VOICE_SCRIPTS.cameraOff
              : VOICE_SCRIPTS.cameraOn,
          );
          return;
        case "SOS":
          onSos();
          return;
        case "SAVE_LOCATION":
          if (cmd.destination) void handleSaveLocation(cmd.destination);
          return;
        default:
          speak(VOICE_SCRIPTS.unknownAction);
      }
    },
    [
      emergencyStop,
      handleSaveLocation,
      onSos,
      repeatLast,
      setMuted,
      speak,
      speakHigh,
      stopNavigation,
      toggleCamera,
    ],
  );

  const dispatchCommand = useCallback(
    (cmd: ClassifiedCommand) => {
      if (
        pendingFarConfirmation() &&
        /\b(yes|yeah|yep|confirm|continue|ok|okay)\b/i.test(
          cmd.rawTranscript ?? "",
        )
      ) {
        void confirmFarRoute();
        return;
      }
      if (
        pendingFarConfirmation() &&
        /\b(no|cancel|nope|nah)\b/i.test(cmd.rawTranscript ?? "")
      ) {
        speak("Cancelled.");
        return;
      }

      switch (cmd.category) {
        case "NAVIGATION":
          void handleNavigationIntent(cmd);
          return;
        case "SAFETY":
          void describeSurroundings();
          return;
        case "CONTROL":
          handleControlAction(cmd);
          return;
        default:
          // IRRELEVANT — silent ignore
          return;
      }
    },
    [
      confirmFarRoute,
      describeSurroundings,
      handleControlAction,
      handleNavigationIntent,
      pendingFarConfirmation,
      speak,
    ],
  );

  const dispatchRef = useRef(dispatchCommand);
  dispatchRef.current = dispatchCommand;

  return (
    <VoiceInterface
      enabled={voiceEnabled}
      onCommand={(c) => dispatchRef.current(c)}
    />
  );
};

export default AIAssistant;
