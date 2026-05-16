import type { LatLng } from "@shared/types";

const EARTH_RADIUS_M = 6_371_000;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Haversine great-circle distance in meters.
 */
export const haversineMeters = (a: LatLng, b: LatLng): number => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

/**
 * Decodes a Google encoded polyline into a list of LatLng points.
 * Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export const decodePolyline = (encoded: string): LatLng[] => {
  const result: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let b: number;
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
 * Returns minimum distance from a point to a polyline (linear approximation).
 */
export const distanceToPolyline = (
  point: LatLng,
  polyline: LatLng[],
): number => {
  if (polyline.length === 0) return Number.POSITIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;
  for (const p of polyline) {
    const d = haversineMeters(point, p);
    if (d < min) min = d;
  }
  return min;
};
