"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const mapsService_js_1 = require("../services/mapsService.js");
const router = (0, express_1.Router)();
const latLng = zod_1.z.object({ lat: zod_1.z.number(), lng: zod_1.z.number() });
const routeSchema = zod_1.z.object({
    origin: latLng,
    destination: zod_1.z
        .union([latLng, zod_1.z.string().min(1).max(500)])
        .describe("LatLng or text query"),
    destinationName: zod_1.z.string().min(1).max(500).optional(),
    language: zod_1.z.string().min(2).max(10).optional(),
});
router.post("/route", (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const parsed = routeSchema.safeParse(req.body);
    if (!parsed.success) {
        res
            .status(400)
            .json({ error: "Invalid body", details: parsed.error.flatten() });
        return;
    }
    let destinationCoords = null;
    let destinationName = parsed.data.destinationName ?? "your destination";
    if (typeof parsed.data.destination === "string") {
        const geo = await (0, mapsService_js_1.geocode)(parsed.data.destination);
        if (!geo) {
            res.status(404).json({ error: "Destination not found" });
            return;
        }
        destinationCoords = geo.location;
        destinationName = parsed.data.destinationName ?? geo.formattedAddress;
    }
    else {
        destinationCoords = parsed.data.destination;
    }
    const route = await (0, mapsService_js_1.getWalkingRoute)(parsed.data.origin, destinationCoords, destinationName, parsed.data.language);
    if (!route) {
        res.status(404).json({ error: "No route found" });
        return;
    }
    res.json(route);
}));
const geocodeSchema = zod_1.z.object({
    query: zod_1.z.string().min(1).max(500),
});
router.post("/geocode", (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const parsed = geocodeSchema.safeParse(req.body);
    if (!parsed.success) {
        res
            .status(400)
            .json({ error: "Invalid body", details: parsed.error.flatten() });
        return;
    }
    const result = await (0, mapsService_js_1.geocode)(parsed.data.query);
    if (!result) {
        res.status(404).json({ error: "Place not found" });
        return;
    }
    res.json(result);
}));
router.get("/nearby", (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius ?? 100);
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        res.status(400).json({ error: "lat/lng required" });
        return;
    }
    const places = await (0, mapsService_js_1.nearbySearch)({ lat, lng }, radius, type);
    res.json({ places });
}));
exports.default = router;
//# sourceMappingURL=navigation.js.map