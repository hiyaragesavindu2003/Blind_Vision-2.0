import axios from "axios";
/**
 * OpenStreetMap-based services. Used as a free, keyless alternative to
 * Google Places for "what's around me?" safety queries.
 *
 * Endpoint: Overpass API (https://overpass-api.de) — returns OSM nodes/ways
 * matching a tag query within a radius of a point.
 *
 * Note: Overpass is a community resource. Be respectful with rate limits;
 * upstream `express-rate-limit` already constrains incoming traffic.
 */
const OVERPASS_URL = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
const labelTagOrder = [
    "amenity",
    "shop",
    "tourism",
    "leisure",
    "public_transport",
    "highway",
    "railway",
];
const friendlyType = (tags) => {
    for (const t of labelTagOrder) {
        if (tags[t])
            return tags[t].replace(/_/g, " ");
    }
    return "place";
};
/**
 * Returns up to 10 nearby OSM features tagged as amenities, shops, tourism
 * spots, leisure, public transport, or notable highways.
 */
export const overpassNearby = async (location, radiusMeters = 100) => {
    const r = Math.max(20, Math.min(2000, Math.round(radiusMeters)));
    const query = `
    [out:json][timeout:10];
    (
      node["amenity"](around:${r},${location.lat},${location.lng});
      node["shop"](around:${r},${location.lat},${location.lng});
      node["tourism"](around:${r},${location.lat},${location.lng});
      node["public_transport"](around:${r},${location.lat},${location.lng});
      node["leisure"](around:${r},${location.lat},${location.lng});
    );
    out body 25;
  `;
    const { data } = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "ai-navigation-assistant/1.0",
        },
        timeout: 15_000,
    });
    const seen = new Set();
    const out = [];
    for (const el of data.elements ?? []) {
        const tags = el.tags ?? {};
        const name = tags.name ?? tags["name:en"];
        if (!name)
            continue;
        const key = name.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push({
            name,
            type: friendlyType(tags),
            vicinity: tags["addr:street"] ?? tags["addr:full"],
        });
        if (out.length >= 10)
            break;
    }
    return out;
};
//# sourceMappingURL=osmService.js.map