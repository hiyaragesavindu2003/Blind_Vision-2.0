import axios from "axios";
/**
 * OpenRouteService (ORS) provider.
 *
 * Endpoints used:
 *   - GET  /geocode/search           (Pelias forward geocoding)
 *   - POST /v2/directions/foot-walking (walking directions, JSON format
 *     with a Google-encoded polyline returned as `routes[0].geometry`)
 *
 * Free-tier API keys are available at https://openrouteservice.org/
 */
const apiKey = process.env.ORS_API_KEY;
const ORS_BASE = process.env.ORS_BASE_URL ?? "https://api.openrouteservice.org";
const requireKey = () => {
    if (!apiKey) {
        throw Object.assign(new Error("ORS_API_KEY is not configured"), {
            status: 503,
        });
    }
    return apiKey;
};
/**
 * Decodes a Google-format encoded polyline. ORS returns the same encoding
 * when called via the `/json` directions endpoint.
 */
const decodePolyline = (encoded) => {
    const result = [];
    let index = 0;
    let lat = 0;
    let lng = 0;
    while (index < encoded.length) {
        let b;
        let shift = 0;
        let resultBits = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            resultBits |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dLat = resultBits & 1 ? ~(resultBits >> 1) : resultBits >> 1;
        lat += dLat;
        shift = 0;
        resultBits = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            resultBits |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dLng = resultBits & 1 ? ~(resultBits >> 1) : resultBits >> 1;
        lng += dLng;
        result.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return result;
};
/**
 * Geocodes a place name to lat/lng using ORS Pelias.
 */
export const geocodeORS = async (query) => {
    const key = requireKey();
    const { data } = await axios.get(`${ORS_BASE}/geocode/search`, {
        params: { api_key: key, text: query, size: 1 },
        timeout: 10_000,
    });
    const features = (data?.features ?? []);
    const first = features[0];
    if (!first)
        return null;
    const [lng, lat] = first.geometry.coordinates;
    return {
        location: { lat, lng },
        formattedAddress: first.properties?.label ?? query,
    };
};
/**
 * Generates a walking route between two points via ORS.
 * Profile defaults to "foot-walking" (best for blind/visually-impaired users).
 */
export const getWalkingRouteORS = async (origin, destination, destinationName, language = "en", profile = "foot-walking") => {
    const key = requireKey();
    const { data } = await axios.post(`${ORS_BASE}/v2/directions/${profile}`, {
        coordinates: [
            [origin.lng, origin.lat],
            [destination.lng, destination.lat],
        ],
        instructions: true,
        language,
        units: "m",
    }, {
        headers: {
            Authorization: key,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        timeout: 15_000,
    });
    const route = (data?.routes?.[0] ?? null);
    if (!route)
        return null;
    const polyline = route.geometry ?? "";
    const points = polyline ? decodePolyline(polyline) : [];
    const steps = [];
    for (const seg of route.segments ?? []) {
        for (const s of seg.steps ?? []) {
            const [startIdx, endIdx] = s.way_points ?? [0, 0];
            const startLocation = points[startIdx] ?? origin;
            const endLocation = points[endIdx] ?? destination;
            steps.push({
                instruction: s.instruction,
                distanceMeters: s.distance,
                durationSeconds: s.duration,
                startLocation,
                endLocation,
                maneuver: s.type !== undefined ? String(s.type) : undefined,
            });
        }
    }
    return {
        destinationName,
        origin,
        destination,
        totalDistanceMeters: route.summary.distance,
        totalDurationSeconds: route.summary.duration,
        polyline,
        steps,
    };
};
//# sourceMappingURL=orsService.js.map