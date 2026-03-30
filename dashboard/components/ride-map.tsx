"use client";

import "leaflet/dist/leaflet.css";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
} from "react-leaflet";
import { useEffect, useMemo, useState } from "react";

type TelemetryPoint = {
  timestamp: string;
  lat: number;
  lng: number;
  speedKmh?: number | null;
};

type RideEvent = {
  id: string;
  type: string;
  timestamp: string;
  lat?: number | null;
  lng?: number | null;
  severity?: number | null;
  penalty?: number;
};

type RideMapProps = {
  telemetry: TelemetryPoint[];
  events: RideEvent[];
};

function getEventColor(type: string) {
  if (type === "harsh_brake") return "#dc2626";
  if (type === "harsh_accel") return "#f59e0b";
  if (type === "speeding") return "#7c3aed";
  return "#2563eb";
}

export default function RideMap({ telemetry, events }: RideMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const polyline = useMemo(
    () =>
      telemetry
        .filter(
          (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
        )
        .map((point) => [point.lat, point.lng] as [number, number]),
    [telemetry],
  );

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Loading map...
      </div>
    );
  }

  if (polyline.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        No map data available for this ride.
      </div>
    );
  }

  const start = polyline[0];
  const end = polyline[polyline.length - 1];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">Ride Map</h2>
        <p className="mt-1 text-sm text-slate-500">
          Route path with event markers.
        </p>
      </div>

      <div className="h-[420px] w-full">
        <MapContainer
          center={start}
          zoom={14}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Polyline
            positions={polyline}
            pathOptions={{ color: "#2563eb", weight: 4 }}
          />

          <CircleMarker
            center={start}
            radius={8}
            pathOptions={{ color: "#16a34a" }}
          >
            <Popup>Start</Popup>
          </CircleMarker>

          <CircleMarker
            center={end}
            radius={8}
            pathOptions={{ color: "#0f172a" }}
          >
            <Popup>End</Popup>
          </CircleMarker>

          {events
            .filter(
              (event) =>
                typeof event.lat === "number" && typeof event.lng === "number",
            )
            .map((event) => (
              <CircleMarker
                key={event.id}
                center={[event.lat as number, event.lng as number]}
                radius={7}
                pathOptions={{ color: getEventColor(event.type) }}
              >
                <Popup>
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold">{event.type}</div>
                    <div>{new Date(event.timestamp).toLocaleString()}</div>
                    <div>Severity: {event.severity ?? "-"}</div>
                    <div>Penalty: -{event.penalty ?? 0}</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
}