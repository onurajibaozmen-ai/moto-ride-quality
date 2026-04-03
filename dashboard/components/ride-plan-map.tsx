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

type Stop = {
  stopId: string;
  orderId: string;
  orderRef: string;
  type: 'pickup' | 'dropoff';
  lat: number;
  lng: number;
  status: string;
  sequence: number;
  actualTs?: string | Date | null;
};

type Props = {
  recommendedSequence: Stop[];
  actualSequence: Stop[];
};

function stopColor(type: 'pickup' | 'dropoff') {
  return type === 'pickup' ? '#2563eb' : '#16a34a';
}

function lineColor(kind: 'recommended' | 'actual') {
  return kind === 'recommended' ? '#0f172a' : '#dc2626';
}

export default function RidePlanMap({
  recommendedSequence,
  actualSequence,
}: Props) {
  const recommendedPoints = useMemo(
    () =>
      (recommendedSequence ?? []).map((stop) => [stop.lat, stop.lng] as [number, number]),
    [recommendedSequence],
  );

  const actualPoints = useMemo(
    () =>
      (actualSequence ?? []).map((stop) => [stop.lat, stop.lng] as [number, number]),
    [actualSequence],
  );

  const center = recommendedPoints[0] ?? actualPoints[0] ?? [41.0082, 28.9784];

  if (recommendedPoints.length === 0 && actualPoints.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Route Visualization</h2>
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          No route stops available.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Route Visualization</h2>
          <p className="mt-1 text-sm text-slate-500">
            Recommended vs actual stop execution on map
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <MapContainer
          center={center as [number, number]}
          zoom={14}
          scrollWheelZoom
          style={{ height: 480, width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {recommendedPoints.length >= 2 && (
            <Polyline
              positions={recommendedPoints}
              pathOptions={{
                color: lineColor('recommended'),
                weight: 4,
                opacity: 0.85,
              }}
            />
          )}

          {actualPoints.length >= 2 && (
            <Polyline
              positions={actualPoints}
              pathOptions={{
                color: lineColor('actual'),
                weight: 4,
                opacity: 0.7,
                dashArray: '8 8',
              }}
            />
          )}

          {recommendedSequence.map((stop) => (
            <CircleMarker
              key={`rec-${stop.stopId}`}
              center={[stop.lat, stop.lng]}
              radius={10}
              pathOptions={{
                color: stopColor(stop.type),
                fillColor: stopColor(stop.type),
                fillOpacity: 0.95,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <div className="text-xs">
                  <div className="font-semibold">
                    Recommended #{stop.sequence} • {stop.type}
                  </div>
                  <div>{stop.orderRef}</div>
                  <div>
                    {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}

          {actualSequence.map((stop) => (
            <CircleMarker
              key={`act-${stop.stopId}`}
              center={[stop.lat, stop.lng]}
              radius={6}
              pathOptions={{
                color: '#dc2626',
                fillColor: '#dc2626',
                fillOpacity: 0.9,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <div className="text-xs">
                  <div className="font-semibold">
                    Actual #{stop.sequence} • {stop.type}
                  </div>
                  <div>{stop.orderRef}</div>
                  <div>
                    {stop.actualTs ? new Date(stop.actualTs).toLocaleString() : '-'}
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
          Solid line = Recommended
        </span>
        <span className="rounded-full bg-rose-100 px-3 py-1 font-medium text-rose-700">
          Dashed line = Actual
        </span>
        <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700">
          Pickup stop
        </span>
        <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
          Dropoff stop
        </span>
      </div>
    </div>
  );
}