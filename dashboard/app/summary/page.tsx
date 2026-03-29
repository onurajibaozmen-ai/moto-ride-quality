import Nav from '../components/nav';
import { Badge, ScoreBadge } from '../components/ui';

async function getPilotSummary() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const res = await fetch(`${baseUrl}/dashboard/pilot-summary`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch pilot summary');
  }

  return res.json();
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default async function SummaryPage() {
  const data = await getPilotSummary();

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl">
        <Nav />

        <h1 className="mb-6 text-3xl font-bold text-slate-900">
          Pilot Summary
        </h1>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard title="Total Couriers" value={data.totalCouriers} />
          <StatCard title="Online Couriers" value={data.onlineCourierCount} />
          <StatCard title="Active Rides" value={data.activeRides} />
          <StatCard title="Completed Rides" value={data.completedRides} />
          <StatCard title="Total Events" value={data.totalEvents} />
          <StatCard title="Average Score" value={data.averageScore ?? '-'} />
        </div>

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">
            Event Breakdown
          </h2>

          <div className="flex flex-wrap gap-3">
            <Badge
              label={`Harsh Brake: ${data.eventBreakdown.harshBrake}`}
              tone="red"
            />
            <Badge
              label={`Harsh Accel: ${data.eventBreakdown.harshAccel}`}
              tone="yellow"
            />
            <Badge
              label={`Speeding: ${data.eventBreakdown.speeding}`}
              tone="purple"
            />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">
            Riski En Yüksek Ride’lar
          </h2>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Ride ID</th>
                  <th className="px-4 py-3">Courier</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.riskyRides.map((ride: any) => (
                  <tr key={ride.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-mono text-xs">{ride.id}</td>
                    <td className="px-4 py-3">{ride.user?.name ?? '-'}</td>
                    <td className="px-4 py-3">{ride.user?.phone ?? '-'}</td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={ride.score} />
                    </td>
                    <td className="px-4 py-3">{ride.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}