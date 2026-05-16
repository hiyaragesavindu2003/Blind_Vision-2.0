import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  geocode,
  getActiveProvider,
  getWalkingRoute,
  nearbySearch,
} from "../services/routingService.js";

const router = Router();

const latLng = z.object({ lat: z.number(), lng: z.number() });

const routeSchema = z.object({
  origin: latLng,
  destination: z
    .union([latLng, z.string().min(1).max(500)])
    .describe("LatLng or text query"),
  destinationName: z.string().min(1).max(500).optional(),
  language: z.string().min(2).max(10).optional(),
});

router.post(
  "/route",
  asyncHandler(async (req, res) => {
    const parsed = routeSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid body", details: parsed.error.flatten() });
      return;
    }
    let destinationCoords: { lat: number; lng: number } | null = null;
    let destinationName = parsed.data.destinationName ?? "your destination";

    if (typeof parsed.data.destination === "string") {
      const geo = await geocode(parsed.data.destination);
      if (!geo) {
        res.status(404).json({ error: "Destination not found" });
        return;
      }
      destinationCoords = geo.location;
      destinationName = parsed.data.destinationName ?? geo.formattedAddress;
    } else {
      destinationCoords = parsed.data.destination;
    }

    const route = await getWalkingRoute(
      parsed.data.origin,
      destinationCoords,
      destinationName,
      parsed.data.language,
    );
    if (!route) {
      res.status(404).json({ error: "No route found" });
      return;
    }
    res.json(route);
  }),
);

const geocodeSchema = z.object({
  query: z.string().min(1).max(500),
});

router.post(
  "/geocode",
  asyncHandler(async (req, res) => {
    const parsed = geocodeSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid body", details: parsed.error.flatten() });
      return;
    }
    const result = await geocode(parsed.data.query);
    if (!result) {
      res.status(404).json({ error: "Place not found" });
      return;
    }
    res.json(result);
  }),
);

router.get("/provider", (_req, res) => {
  res.json({
    provider: getActiveProvider(),
    google: Boolean(process.env.GOOGLE_MAPS_API_KEY),
    ors: Boolean(process.env.ORS_API_KEY),
  });
});

router.get(
  "/nearby",
  asyncHandler(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius ?? 100);
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ error: "lat/lng required" });
      return;
    }
    const places = await nearbySearch({ lat, lng }, radius, type);
    res.json({ places });
  }),
);

export default router;
