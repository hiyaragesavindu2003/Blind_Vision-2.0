import * as google from "./mapsService.js";
import * as ors from "./orsService.js";
import { overpassNearby } from "./osmService.js";
import type { LatLng, NavigationRoute } from "../types/index.js";

/**
 * Routing provider abstraction.
 *
 * Default stack is fully open: OpenRouteService for routing/geocoding plus
 * OpenStreetMap (Overpass) for nearby POIs. Google Maps is supported as an
 * optional alternative when GOOGLE_MAPS_API_KEY is configured.
 *
 * Resolution order:
 *   1. ROUTING_PROVIDER=ors    → use ORS.
 *   2. ROUTING_PROVIDER=google → use Google.
 *   3. Auto: prefer ORS whenever ORS_API_KEY is set; otherwise Google.
 *   4. If the chosen provider throws/returns null, fall back to the other one
 *      (when its key is configured).
 *
 * Note: nearby POI search uses OSM Overpass by default (free, keyless).
 * Google Places is only used when ROUTING_PROVIDER=google AND a Google key
 * is configured.
 */

export type RoutingProvider = "google" | "ors";

export const getActiveProvider = (): RoutingProvider => {
  const env = (process.env.ROUTING_PROVIDER ?? "").toLowerCase();
  if (env === "ors") return "ors";
  if (env === "google") return "google";
  if (process.env.ORS_API_KEY) return "ors";
  if (process.env.GOOGLE_MAPS_API_KEY) return "google";
  return "ors";
};

const otherProvider = (p: RoutingProvider): RoutingProvider =>
  p === "ors" ? "google" : "ors";

const isProviderConfigured = (p: RoutingProvider): boolean =>
  p === "ors"
    ? Boolean(process.env.ORS_API_KEY)
    : Boolean(process.env.GOOGLE_MAPS_API_KEY);

const callGeocode = (
  provider: RoutingProvider,
  query: string,
): Promise<{ location: LatLng; formattedAddress: string } | null> =>
  provider === "ors" ? ors.geocodeORS(query) : google.geocode(query);

const callRoute = (
  provider: RoutingProvider,
  origin: LatLng,
  destination: LatLng,
  destinationName: string,
  language: string,
): Promise<NavigationRoute | null> =>
  provider === "ors"
    ? ors.getWalkingRouteORS(origin, destination, destinationName, language)
    : google.getWalkingRoute(origin, destination, destinationName, language);

export const geocode = async (
  query: string,
): Promise<{ location: LatLng; formattedAddress: string } | null> => {
  const primary = getActiveProvider();
  try {
    const result = await callGeocode(primary, query);
    if (result) return result;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[routing] ${primary} geocode failed`, err);
    }
  }
  const fallback = otherProvider(primary);
  if (isProviderConfigured(fallback)) {
    return callGeocode(fallback, query);
  }
  return null;
};

export const getWalkingRoute = async (
  origin: LatLng,
  destination: LatLng,
  destinationName: string,
  language = "en",
): Promise<NavigationRoute | null> => {
  const primary = getActiveProvider();
  try {
    const result = await callRoute(
      primary,
      origin,
      destination,
      destinationName,
      language,
    );
    if (result) return result;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[routing] ${primary} route failed`, err);
    }
  }
  const fallback = otherProvider(primary);
  if (isProviderConfigured(fallback)) {
    return callRoute(
      fallback,
      origin,
      destination,
      destinationName,
      language,
    );
  }
  return null;
};

/**
 * Nearby POI search. Tries OpenStreetMap Overpass first (no key needed).
 * Falls back to Google Places only when both Overpass fails AND Google is
 * configured.
 */
export const nearbySearch = async (
  location: LatLng,
  radiusMeters = 100,
  type?: string,
): Promise<Array<{ name: string; type: string; vicinity?: string }>> => {
  try {
    const places = await overpassNearby(location, radiusMeters);
    if (places.length > 0) return places;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[routing] overpass failed", err);
    }
  }
  if (process.env.GOOGLE_MAPS_API_KEY) {
    try {
      return await google.nearbySearch(location, radiusMeters, type);
    } catch {
      return [];
    }
  }
  return [];
};
