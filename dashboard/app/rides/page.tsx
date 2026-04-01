import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type RideItem = {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationS: number | null;
  totalDistanceM: number | null;
  score: number | null;
  courier: {
    id: string;
    name: string;
    phone: string;
  };
  analytics: {
    qualityScore?: number | null;
    qualityFlags?: unknown;
  } | null;
  scoreCard: {
    confidenceLevel?: string | null;
  } | null;
  eventCount: number;
  telemetryCount: number;
};

type RidesResponse = {
  page: number;
  limit: number;
  total: number;
  items: RideItem[];
};

export default async function RidesPage() {
  const data = (await apiFetch('/dashboard/rides?page=1&limit=50')) as RidesResponse;

  const rides = Array.isArray(data?.items) ? data.items : [];

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Rides</h1>
          <p className="mt-1 text-sm text-slate-500">
            Total rides: {data?.total ?? 0}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Ride ID</th>
                <th className="px-4 py-3">Courier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Distance</th>
                <th className="px-4 py-3">Events</th>
                <th className="px-4 py-3">Started</th>
              </tr>
            </thead>
            <tbody>
              {rides.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No rides found.
                  </td>
                </tr>
              ) : (
                rides.map((ride) => (
                  <tr key={ride.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      <Link
                        href={`/rides/${ride.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {ride.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {ride.courier?.name ?? '-'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {ride.courier?.phone ?? '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{ride.status}</td>
                    <td className="px-4 py-3 text-slate-900">
                      {typeof ride.score === 'number' ? ride.score.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {ride.scoreCard?.confidenceLevel ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {typeof ride.totalDistanceM === 'number'
                        ? `${(ride.totalDistanceM / 1000).toFixed(2)} km`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{ride.eventCount ?? 0}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {ride.startedAt
                        ? new Date(ride.startedAt).toLocaleString()
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}