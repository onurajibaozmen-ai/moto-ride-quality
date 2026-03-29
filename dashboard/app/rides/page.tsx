import Link from 'next/link';
import Nav from '../components/nav';
import { RideStatusBadge, ScoreBadge } from '../components/ui';

async function getRides() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const res = await fetch(`${baseUrl}/dashboard/rides`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch rides');
  }

  return res.json();
}

export default async function RidesPage() {
  const rides = await getRides();

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl">
        <Nav />

        <h1 className="mb-6 text-3xl font-bold text-slate-900">Rides</h1>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3">Ride ID</th>
                <th className="px-4 py-3">Courier</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Distance</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Started At</th>
                <th className="px-4 py-3">Ended At</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((ride: any) => (
                <tr key={ride.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/rides/${ride.id}`} className="text-blue-600 underline">
                      {ride.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{ride.user?.name ?? '-'}</td>
                  <td className="px-4 py-3">{ride.user?.phone ?? '-'}</td>
                  <td className="px-4 py-3">
                    <RideStatusBadge status={ride.status} />
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={ride.score} />
                  </td>
                  <td className="px-4 py-3">{ride.totalDistanceM ?? 0} m</td>
                  <td className="px-4 py-3">{ride.durationS ?? 0} s</td>
                  <td className="px-4 py-3">
                    {ride.startedAt ? new Date(ride.startedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {ride.endedAt ? new Date(ride.endedAt).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}