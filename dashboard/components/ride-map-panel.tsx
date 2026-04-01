'use client';

import 'leaflet/dist/leaflet.css';

import { useMemo } from 'react';
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
} from 'react-leaflet';

type TelemetryPoint = {
  ts: string;
  lat: number;
  lng: number;
  speedKmh: number | null;
  accuracyM: number | null;
  heading: number | null;
};

type RideEvent = {
  id: string;
  type: string;
  ts: string;
  lat: number | null;
  lng: number | null;
  severity: number | null;
};

type Props = {
  telemetry: TelemetryPoint[];
  events: RideEvent[];
};

function getEventColor(type: string) {
  switch (type) {
    case 'harsh_brake':
      return '#dc2626';
    case 'harsh_accel':
      return '#ea580c';
    case 'speeding':
      return '#7c3aed';
    case 'sharp_turn':
      return '#2563eb';
    default:
      return '#0f172a';
  }
}

function getEventLabel(type: string) {
  switch (type) {
    case 'harsh_brake':
      return 'Harsh Brake';
    case 'harsh_accel':
      return 'Harsh Accel';
    case 'speeding':
      return 'Speeding';
    case 'sharp_turn':
      return 'Sharp Turn';
    default:
      return type;
  }
}

export default function RideMapPanel({ telemetry, events }: Props) {
  const routePoints = useMemo(
    () =>
      (telemetry ?? [])
        .filter(
          (p) =>
            typeof p.lat === 'number' &&
            typeof p.lng === 'number' &&
            Number.isFinite(p.lat) &&
            Number.isFinite(p.lng),
        )
        .map((p) => [p.lat, p.lng] as [number, number]),
    [telemetry],
  );

  const eventPoints = useMemo(
    () =>
      (events ?? []).filter(
        (e) =>
          typeof e.lat === 'number' &&
          typeof e.lng === 'number' &&
          Number.isFinite(e.lat) &&
          Number.isFinite(e.lng),
      ),
    [events],
  );

  if (routePoints.length < 2) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Ride Map</h2>
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Not enough telemetry to render the map.
        </div>
      </div>
    );
  }

  const start = routePoints[0];
  const end = routePoints[routePoints.length - 1];
  const center = start;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Ride Map</h2>
          <p className="mt-1 text-sm text-slate-500">
            Real map tiles with route and event markers.
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <MapContainer
          center={center}
          zoom={14}
          scrollWheelZoom
          style={{ height: 440, width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Polyline positions={routePoints} pathOptions={{ color: '#0f172a', weight: 4 }} />

          <CircleMarker
            center={start}
            radius={8}
            pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 1 }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              Start
            </Tooltip>
          </CircleMarker>

          <CircleMarker
            center={end}
            radius={8}
            pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 1 }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              End
            </Tooltip>
          </CircleMarker>

          {eventPoints.map((event) => (
            <CircleMarker
              key={event.id}
              center={[event.lat as number, event.lng as number]}
              radius={7}
              pathOptions={{
                color: getEventColor(event.type),
                fillColor: getEventColor(event.type),
                fillOpacity: 0.9,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <div className="text-xs">
                  <div className="font-semibold">{getEventLabel(event.type)}</div>
                  <div>
                    {event.ts ? new Date(event.ts).toLocaleString() : '-'}
                  </div>
                  <div>
                    Severity:{' '}
                    {typeof event.severity === 'number'
                      ? event.severity.toFixed(2)
                      : '-'}
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800">
          Start
        </span>
        <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-800">
          End
        </span>
        <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-800">
          Harsh Brake
        </span>
        <span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-800">
          Harsh Accel
        </span>
        <span className="rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-800">
          Speeding
        </span>
      </div>
    </div>
  );
}