import { fetchJson } from "@/lib/api";

type PilotSummary = {
  overview: {
    totalCouriers: number;
    activeRides: number;
    completedRides: number;
    totalEvents: number;
    averageScore: number;
    lowConfidenceRideCount: number;
  };
  couriers: Array<{
    id: string;
    name: string;
    phone: string;
    totalCompletedRides: number;
    averageScore: number;
    totalDistanceM: number;
    totalEvents: number;
    lowConfidenceRides: number;
  }>;
  recentCompletedRides: Array<{
    id: string;
    courierName: string;
    courierPhone: string;
    startedAt: string;
    endedAt?: string | null;
    totalDistanceM: number;
    score?: number | null;
    confidenceLevel?: string | null;
    qualityScore?: number | null;
    eventsCount: number;
  }>;
};

async function getSummary() {
  return fetchJson<PilotSummary>("/dashboard/pilot-summary");
}

export default async function SummaryPage() {
  const data = await getSummary();

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Summary</h1>
          <p className="mt-1 text-sm text-slate-600">
            Pilot summary across overview, couriers, and recent rides.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Average Score</div>
            <div className="mt-2 text-3xl font-semibold">{data.overview.averageScore}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Completed Rides</div>
            <div className="mt-2 text-3xl font-semibold">{data.overview.completedRides}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Low Confidence Rides</div>
            <div className="mt-2 text-3xl font-semibold">
              {data.overview.lowConfidenceRideCount}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent Completed Rides</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Courier</th>
                  <th className="px-4 py-3">Distance</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Events</th>
                </tr>
              </thead>
              <tbody>
                {data.recentCompletedRides.map((ride) => (
                  <tr key={ride.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{ride.courierName}</td>
                    <td className="px-4 py-3">{Math.round(ride.totalDistanceM)}</td>
                    <td className="px-4 py-3">{ride.score ?? "-"}</td>
                    <td className="px-4 py-3">{ride.confidenceLevel ?? "-"}</td>
                    <td className="px-4 py-3">{ride.eventsCount}</td>
                  </tr>
                ))}

                {data.recentCompletedRides.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No recent completed rides.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}