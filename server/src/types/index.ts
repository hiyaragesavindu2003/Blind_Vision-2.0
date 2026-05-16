/**
 * Server-only types. For shared types, see /shared/types.ts.
 */
import type { Request } from "express";

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
} from "../../../shared/types.js";

export interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

export interface AuthedRequest extends Request {
  clientId?: string;
}
