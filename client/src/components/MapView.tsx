import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAppStore } from "@/store/appStore";
import { decodePolyline } from "@/utils/geo";

/**
 * Open-source map view powered by Leaflet + OpenStreetMap (CARTO Dark Matter
 * tiles). No API key is required. The map is purely visual and is marked
 * `aria-hidden`; voice guidance is the canonical surface for blind users.
 */
export const MapView = (): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const destMarkerRef = useRef<L.CircleMarker | null>(null);
  const userCenteredOnceRef = useRef(false);

  const position = useAppStore((s) => s.position);
  const route = useAppStore((s) => s.route);

  const polylinePoints = useMemo(
    () => (route?.polyline ? decodePolyline(route.polyline) : []),
    [route?.polyline],
  );

  // Initialize map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center: L.LatLngExpression =
      position ? [position.lat, position.lng] : [6.9271, 79.8612]; // Colombo fallback

    const map = L.map(containerRef.current, {
      center,
      zoom: 17,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      },
    ).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      polylineRef.current = null;
      userMarkerRef.current = null;
      destMarkerRef.current = null;
      userCenteredOnceRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update user marker when GPS updates.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    const latlng: L.LatLngExpression = [position.lat, position.lng];

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.circleMarker(latlng, {
        radius: 8,
        color: "#0a0a0a",
        weight: 3,
        fillColor: "#00ff88",
        fillOpacity: 1,
      })
        .bindTooltip("You", { permanent: false })
        .addTo(map);
    } else {
      userMarkerRef.current.setLatLng(latlng);
    }

    if (!userCenteredOnceRef.current) {
      map.setView(latlng, 17, { animate: false });
      userCenteredOnceRef.current = true;
    } else if (!route) {
      map.panTo(latlng);
    }
  }, [position, route]);

  // Update polyline + destination marker when route changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    if (polylinePoints.length > 1 && route) {
      polylineRef.current = L.polyline(
        polylinePoints.map((p) => [p.lat, p.lng] as [number, number]),
        {
          color: "#00ff88",
          weight: 6,
          opacity: 0.9,
          lineJoin: "round",
          lineCap: "round",
        },
      ).addTo(map);

      destMarkerRef.current = L.circleMarker(
        [route.destination.lat, route.destination.lng],
        {
          radius: 9,
          color: "#0a0a0a",
          weight: 3,
          fillColor: "#ff6b35",
          fillOpacity: 1,
        },
      )
        .bindTooltip(route.destinationName, { permanent: false })
        .addTo(map);

      const bounds = polylineRef.current.getBounds();
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
    }
  }, [polylinePoints, route]);

  return (
    <section className="panel" aria-label="Map (visual)">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div>
          <p className="kicker">Visual</p>
          <h2 className="text-2xl font-bold">Map</h2>
        </div>
        <span className="chip text-text-muted">OpenStreetMap</span>
      </div>
      <div
        ref={containerRef}
        aria-hidden="true"
        className="w-full h-[400px] rounded-2xl bg-ink-card-2 border border-ink-border overflow-hidden shadow-elevated"
      />
      <p className="text-xs text-text-subtle mt-2">
        Tiles &copy; OpenStreetMap contributors / CARTO &middot; Map is
        decorative — voice guidance is the canonical surface.
      </p>
    </section>
  );
};

export default MapView;
