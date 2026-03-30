import Link from "next/link";
import { fetchJson } from "@/lib/api";

type Ride = {
  id: string;
  status: string;
  startedAt: string;
  endedAt?: string | null;
  totalDistanceM?: number;
  durationS?: number;
  score?: number | null;
  scoreVersion?: string | null;
  confidenceLevel?: string | null;
  qualityScore?: number | null;
  qualityFlags?: string[];
  eventsCount?: number;
  telemetryCount?: number;
  courier?: {
    id: string;
    name: string;
    phone: string;
  };
};

async function getRides() {
  return fetchJson<Ride[]>("/dashboard/rides");
}

export default async function RidesPage() {
  const rides = await getRides();

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Rides</h1>
          <p className="mt-1 text-sm text-slate-600">
            Completed and active ride records.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Ride ID</th>
                <th className="px-4 py-3">Courier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Distance (m)</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Events</th>
                <th className="px-4 py-3">Started</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((ride) => (
                <tr key={ride.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/rides/${ride.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {ride.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{ride.courier?.name ?? "-"}</td>
                  <td className="px-4 py-3">{ride.status}</td>
                  <td className="px-4 py-3">
                    {Math.round(ride.totalDistanceM ?? 0)}
                  </td>
                  <td className="px-4 py-3">{ride.score ?? "-"}</td>
                  <td className="px-4 py-3">{ride.confidenceLevel ?? "-"}</td>
                  <td className="px-4 py-3">{ride.eventsCount ?? 0}</td>
                  <td className="px-4 py-3">
                    {new Date(ride.startedAt).toLocaleString()}
                  </td>
                </tr>
              ))}

              {rides.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No rides found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}