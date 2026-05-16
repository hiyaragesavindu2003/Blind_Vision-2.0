/**
 * Shared TypeScript types between client and server.
 * These contracts must remain stable across both sides.
 */

export type CommandCategory =
  | "NAVIGATION"
  | "SAFETY"
  | "CONTROL"
  | "IRRELEVANT";

export type ControlAction =
  | "STOP"
  | "MUTE"
  | "UNMUTE"
  | "REPEAT"
  | "CAMERA_TOGGLE"
  | "EMERGENCY_STOP"
  | "SOS"
  | "SAVE_LOCATION"
  | "NONE";

export interface ClassifiedCommand {
  category: CommandCategory;
  confidence: number;
  intent: string;
  destination: string | null;
  action: ControlAction | string | null;
  rawTranscript?: string;
}

export type NavigationState =
  | "IDLE"
  | "CALCULATING"
  | "NAVIGATING"
  | "RECALCULATING"
  | "ARRIVED"
  | "EMERGENCY_STOPPED";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  startLocation: LatLng;
  endLocation: LatLng;
  maneuver?: string;
  htmlInstruction?: string;
}

export interface NavigationRoute {
  destinationName: string;
  origin: LatLng;
  destination: LatLng;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  polyline: string;
  steps: RouteStep[];
}

export interface DetectedObject {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  direction: "left" | "center" | "right";
  proximity: "very-close" | "near" | "far";
  priority: "HIGH" | "MEDIUM" | "LOW";
  timestamp: number;
}

export type TtsPriority = "HIGH" | "MEDIUM" | "LOW";

export interface TtsRequest {
  text: string;
  priority?: TtsPriority;
  language?: string;
}

export interface SocketEvents {
  // Server -> client
  obstacle_alert: (payload: DetectedObject) => void;
  navigation_update: (payload: { state: NavigationState; instruction?: string }) => void;
  // Client -> server
  gps_update: (payload: { position: LatLng; accuracy: number; speed?: number }) => void;
  client_event: (payload: { type: string; data: unknown }) => void;
}
