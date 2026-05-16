/**
 * Frontend-only type re-exports + extensions.
 * Shared types live in /shared/types.ts and are imported via the @shared alias.
 */

export type {
  ClassifiedCommand,
  CommandCategory,
  ControlAction,
  DetectedObject,
  LatLng,
  NavigationRoute,
  NavigationState,
  RouteStep,
  TtsPriority,
  TtsRequest,
} from "@shared/types";

export type ListeningMode = "PASSIVE" | "ACTIVE" | "PROCESSING" | "DISABLED";

export type AppMode = "READY" | "NAVIGATING" | "EMERGENCY" | "OFFLINE";

export interface FavoriteLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  createdAt: number;
}

export interface SpokenInstruction {
  id: string;
  text: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  spokenAt: number;
}
