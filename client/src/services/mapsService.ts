import { apiClient } from "./apiClient";
import type { LatLng, NavigationRoute } from "@shared/types";

export const requestRoute = async (
  origin: LatLng,
  destination: LatLng | string,
  destinationName?: string,
  language = "en",
): Promise<NavigationRoute> => {
  const { data } = await apiClient.post<NavigationRoute>(
    "/api/navigation/route",
    { origin, destination, destinationName, language },
  );
  return data;
};

export const geocodePlace = async (
  query: string,
): Promise<{ location: LatLng; formattedAddress: string }> => {
  const { data } = await apiClient.post<{
    location: LatLng;
    formattedAddress: string;
  }>("/api/navigation/geocode", { query });
  return data;
};

export const fetchNearby = async (
  position: LatLng,
  radiusMeters = 100,
  type?: string,
): Promise<Array<{ name: string; type: string; vicinity?: string }>> => {
  const { data } = await apiClient.get<{
    places: Array<{ name: string; type: string; vicinity?: string }>;
  }>("/api/navigation/nearby", {
    params: {
      lat: position.lat,
      lng: position.lng,
      radius: radiusMeters,
      type,
    },
  });
  return data.places;
};
