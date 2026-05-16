import axios from "axios";
import type {
  LatLng,
  NavigationRoute,
  RouteStep,
} from "../types/index.js";

const apiKey = process.env.GOOGLE_MAPS_API_KEY;

const requireKey = (): string => {
  if (!apiKey) {
    throw Object.assign(new Error("GOOGLE_MAPS_API_KEY is not configured"), {
      status: 503,
    });
  }
  return apiKey;
};

const stripHtml = (html: string): string =>
  html
    .replace(/<\/?b>/g, "")
    .replace(/<div[^>]*>/g, ". ")
    .replace(/<\/div>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Geocodes a place name to lat/lng coordinates and a normalized name.
 */
export const geocode = async (
  query: string,
): Promise<{ location: LatLng; formattedAddress: string } | null> => {
  const key = requireKey();
  const url = "https://maps.googleapis.com/maps/api/geocode/json";
  const { data } = await axios.get(url, {
    params: { address: query, key },
    timeout: 10_000,
  });
  const first = data?.results?.[0];
  if (!first) return null;
  return {
    location: {
      lat: first.geometry.location.lat,
      lng: first.geometry.location.lng,
    },
    formattedAddress: first.formatted_address,
  };
};

/**
 * Generates a walking route between two points using Google Directions API.
 */
export const getWalkingRoute = async (
  origin: LatLng,
  destination: LatLng,
  destinationName: string,
  language = "en",
): Promise<NavigationRoute | null> => {
  const key = requireKey();
  const url = "https://maps.googleapis.com/maps/api/directions/json";
  const { data } = await axios.get(url, {
    params: {
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      mode: "walking",
      language,
      key,
    },
    timeout: 15_000,
  });

  const route = data?.routes?.[0];
  const leg = route?.legs?.[0];
  if (!route || !leg) return null;

  const steps: RouteStep[] = leg.steps.map(
    (s: {
      html_instructions: string;
      distance: { value: number };
      duration: { value: number };
      start_location: { lat: number; lng: number };
      end_location: { lat: number; lng: number };
      maneuver?: string;
    }) => ({
      instruction: stripHtml(s.html_instructions),
      htmlInstruction: s.html_instructions,
      distanceMeters: s.distance.value,
      durationSeconds: s.duration.value,
      startLocation: {
        lat: s.start_location.lat,
        lng: s.start_location.lng,
      },
      endLocation: { lat: s.end_location.lat, lng: s.end_location.lng },
      maneuver: s.maneuver,
    }),
  );

  return {
    destinationName,
    origin,
    destination,
    totalDistanceMeters: leg.distance.value,
    totalDurationSeconds: leg.duration.value,
    polyline: route.overview_polyline?.points ?? "",
    steps,
  };
};

/**
 * Returns nearby points-of-interest, useful for "what's around me?" safety queries.
 */
export const nearbySearch = async (
  location: LatLng,
  radiusMeters = 100,
  type?: string,
): Promise<Array<{ name: string; type: string; vicinity?: string }>> => {
  const key = requireKey();
  const url =
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
  const { data } = await axios.get(url, {
    params: {
      location: `${location.lat},${location.lng}`,
      radius: radiusMeters,
      type,
      key,
    },
    timeout: 10_000,
  });
  return (
    data?.results?.slice(0, 10).map(
      (r: { name: string; types: string[]; vicinity?: string }) => ({
        name: r.name,
        type: r.types?.[0] ?? "place",
        vicinity: r.vicinity,
      }),
    ) ?? []
  );
};
