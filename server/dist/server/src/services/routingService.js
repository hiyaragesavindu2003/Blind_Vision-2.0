import * as google from "./mapsService.js";
import * as ors from "./orsService.js";
import { overpassNearby } from "./osmService.js";
export const getActiveProvider = () => {
    const env = (process.env.ROUTING_PROVIDER ?? "").toLowerCase();
    if (env === "ors")
        return "ors";
    if (env === "google")
        return "google";
    if (process.env.ORS_API_KEY)
        return "ors";
    if (process.env.GOOGLE_MAPS_API_KEY)
        return "google";
    return "ors";
};
const otherProvider = (p) => p === "ors" ? "google" : "ors";
const isProviderConfigured = (p) => p === "ors"
    ? Boolean(process.env.ORS_API_KEY)
    : Boolean(process.env.GOOGLE_MAPS_API_KEY);
const callGeocode = (provider, query) => provider === "ors" ? ors.geocodeORS(query) : google.geocode(query);
const callRoute = (provider, origin, destination, destinationName, language) => provider === "ors"
    ? ors.getWalkingRouteORS(origin, destination, destinationName, language)
    : google.getWalkingRoute(origin, destination, destinationName, language);
export const geocode = async (query) => {
    const primary = getActiveProvider();
    try {
        const result = await callGeocode(primary, query);
        if (result)
            return result;
    }
    catch (err) {
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
export const getWalkingRoute = async (origin, destination, destinationName, language = "en") => {
    const primary = getActiveProvider();
    try {
        const result = await callRoute(primary, origin, destination, destinationName, language);
        if (result)
            return result;
    }
    catch (err) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(`[routing] ${primary} route failed`, err);
        }
    }
    const fallback = otherProvider(primary);
    if (isProviderConfigured(fallback)) {
        return callRoute(fallback, origin, destination, destinationName, language);
    }
    return null;
};
/**
 * Nearby POI search. Tries OpenStreetMap Overpass first (no key needed).
 * Falls back to Google Places only when both Overpass fails AND Google is
 * configured.
 */
export const nearbySearch = async (location, radiusMeters = 100, type) => {
    try {
        const places = await overpassNearby(location, radiusMeters);
        if (places.length > 0)
            return places;
    }
    catch (err) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("[routing] overpass failed", err);
        }
    }
    if (process.env.GOOGLE_MAPS_API_KEY) {
        try {
            return await google.nearbySearch(location, radiusMeters, type);
        }
        catch {
            return [];
        }
    }
    return [];
};
//# sourceMappingURL=routingService.js.map