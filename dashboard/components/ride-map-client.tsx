"use client";

import dynamic from "next/dynamic";

const RideMap = dynamic(() => import("@/components/ride-map"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
      Loading map...
    </div>
  ),
});

type TelemetryPoint = {
  timestamp: string;
  lat: number;
  lng: number;
};

type RideEvent = {
  id: string;
  type: string;
  timestamp: string;
  lat?: number | null;
  lng?: number | null;
};

export default function RideMapClient({
  telemetry,
  events,
}: {
  telemetry: TelemetryPoint[];
  events: RideEvent[];
}) {
  return <RideMap telemetry={telemetry} events={events} />;
}