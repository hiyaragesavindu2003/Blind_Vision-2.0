import { create } from "zustand";
import type {
  AppMode,
  FavoriteLocation,
  ListeningMode,
  SpokenInstruction,
} from "@/types";
import type {
  DetectedObject,
  LatLng,
  NavigationRoute,
  NavigationState,
} from "@shared/types";

interface AppState {
  // Connection
  online: boolean;
  socketConnected: boolean;

  // Voice / listening
  listeningMode: ListeningMode;
  micPermission: "granted" | "denied" | "prompt" | "unknown";
  muted: boolean;
  language: string;
  lastTranscript: string;

  // Camera / detection
  cameraOn: boolean;
  detections: DetectedObject[];

  // Navigation
  appMode: AppMode;
  navState: NavigationState;
  position: LatLng | null;
  positionAccuracy: number | null;
  route: NavigationRoute | null;
  currentStepIndex: number;

  // Voice output
  lastSpoken: SpokenInstruction | null;
  spokenHistory: SpokenInstruction[];

  // Favorites
  favorites: FavoriteLocation[];

  // Setters
  setOnline: (v: boolean) => void;
  setSocketConnected: (v: boolean) => void;
  setListeningMode: (m: ListeningMode) => void;
  setMicPermission: (p: AppState["micPermission"]) => void;
  setMuted: (v: boolean) => void;
  toggleMuted: () => void;
  setLanguage: (l: string) => void;
  setLastTranscript: (s: string) => void;

  setCameraOn: (v: boolean) => void;
  toggleCamera: () => void;
  setDetections: (d: DetectedObject[]) => void;

  setAppMode: (m: AppMode) => void;
  setNavState: (s: NavigationState) => void;
  setPosition: (p: LatLng | null, accuracy?: number | null) => void;
  setRoute: (r: NavigationRoute | null) => void;
  setCurrentStepIndex: (i: number) => void;

  recordSpoken: (s: SpokenInstruction) => void;
  setFavorites: (f: FavoriteLocation[]) => void;
  addFavorite: (f: FavoriteLocation) => void;

  emergencyStop: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  socketConnected: false,

  listeningMode: "DISABLED",
  micPermission: "unknown",
  muted: false,
  language: "en",
  lastTranscript: "",

  cameraOn: false,
  detections: [],

  appMode: "READY",
  navState: "IDLE",
  position: null,
  positionAccuracy: null,
  route: null,
  currentStepIndex: 0,

  lastSpoken: null,
  spokenHistory: [],

  favorites: [],

  setOnline: (v) => set({ online: v }),
  setSocketConnected: (v) => set({ socketConnected: v }),
  setListeningMode: (m) => set({ listeningMode: m }),
  setMicPermission: (p) => set({ micPermission: p }),
  setMuted: (v) => set({ muted: v }),
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  setLanguage: (l) => set({ language: l }),
  setLastTranscript: (s) => set({ lastTranscript: s }),

  setCameraOn: (v) => set({ cameraOn: v }),
  toggleCamera: () => set((s) => ({ cameraOn: !s.cameraOn })),
  setDetections: (d) => set({ detections: d }),

  setAppMode: (m) => set({ appMode: m }),
  setNavState: (navState) => set({ navState }),
  setPosition: (p, accuracy = null) =>
    set({ position: p, positionAccuracy: accuracy ?? null }),
  setRoute: (route) => set({ route, currentStepIndex: 0 }),
  setCurrentStepIndex: (i) => set({ currentStepIndex: i }),

  recordSpoken: (s) =>
    set((state) => ({
      lastSpoken: s,
      spokenHistory: [s, ...state.spokenHistory].slice(0, 50),
    })),

  setFavorites: (favorites) => set({ favorites }),
  addFavorite: (f) =>
    set((s) => ({ favorites: [f, ...s.favorites].slice(0, 100) })),

  emergencyStop: () =>
    set({
      appMode: "EMERGENCY",
      navState: "EMERGENCY_STOPPED",
      cameraOn: false,
      detections: [],
    }),
}));
