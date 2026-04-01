import { apiFetch } from '@/lib/api';

type RiskyRide = {
  id: string;
  status: string;
  score: number | null;
  startedAt: string;
  endedAt: string | null;
  totalDistanceM: number | null;
  durationS: number | null;
  user: {
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
};

type PilotSummaryResponse = {
  generatedAt: string;
  riskyRides: RiskyRide[];
};

export default async function SummaryPage() {
  const data = (await apiFetch('/dashboard/pilot-summary')) as PilotSummaryResponse;

  const riskyRides = Array.isArray(data?.riskyRides) ? data.riskyRides : [];

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pilot Summary</h1>
          <p className="mt-1 text-sm text-slate-500">
            Generated at:{' '}
            {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : '-'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 text-lg font-semibold text-slate-900">
            Risky Rides
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">Courier</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Distance</th>
                  <th className="px-4 py-3">Started</th>
                </tr>
              </thead>
              <tbody>
                {riskyRides.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No risky rides found.
                    </td>
                  </tr>
                ) : (
                  riskyRides.map((ride) => (
                    <tr key={ride.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {ride.user?.name ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {ride.user?.phone ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {typeof ride.score === 'number' ? ride.score.toFixed(2) : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {ride.scoreCard?.confidenceLevel ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {typeof ride.totalDistanceM === 'number'
                          ? `${Math.round(ride.totalDistanceM)} m`
                          : '-'}
                      </td>
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
      </div>
    </main>
  );
}