"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nearbySearch = exports.getWalkingRoute = exports.geocode = void 0;
const axios_1 = __importDefault(require("axios"));
const apiKey = process.env.GOOGLE_MAPS_API_KEY;
const requireKey = () => {
    if (!apiKey) {
        throw Object.assign(new Error("GOOGLE_MAPS_API_KEY is not configured"), {
            status: 503,
        });
    }
    return apiKey;
};
const stripHtml = (html) => html
    .replace(/<\/?b>/g, "")
    .replace(/<div[^>]*>/g, ". ")
    .replace(/<\/div>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
/**
 * Geocodes a place name to lat/lng coordinates and a normalized name.
 */
const geocode = async (query) => {
    const key = requireKey();
    const url = "https://maps.googleapis.com/maps/api/geocode/json";
    const { data } = await axios_1.default.get(url, {
        params: { address: query, key },
        timeout: 10_000,
    });
    const first = data?.results?.[0];
    if (!first)
        return null;
    return {
        location: {
            lat: first.geometry.location.lat,
            lng: first.geometry.location.lng,
        },
        formattedAddress: first.formatted_address,
    };
};
exports.geocode = geocode;
/**
 * Generates a walking route between two points using Google Directions API.
 */
const getWalkingRoute = async (origin, destination, destinationName, language = "en") => {
    const key = requireKey();
    const url = "https://maps.googleapis.com/maps/api/directions/json";
    const { data } = await axios_1.default.get(url, {
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
    if (!route || !leg)
        return null;
    const steps = leg.steps.map((s) => ({
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
    }));
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
exports.getWalkingRoute = getWalkingRoute;
/**
 * Returns nearby points-of-interest, useful for "what's around me?" safety queries.
 */
const nearbySearch = async (location, radiusMeters = 100, type) => {
    const key = requireKey();
    const url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
    const { data } = await axios_1.default.get(url, {
        params: {
            location: `${location.lat},${location.lng}`,
            radius: radiusMeters,
            type,
            key,
        },
        timeout: 10_000,
    });
    return (data?.results?.slice(0, 10).map((r) => ({
        name: r.name,
        type: r.types?.[0] ?? "place",
        vicinity: r.vicinity,
    })) ?? []);
};
exports.nearbySearch = nearbySearch;
//# sourceMappingURL=mapsService.js.map