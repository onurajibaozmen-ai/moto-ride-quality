import Nav from '../../components/nav';
import {
  EventTypeBadge,
  RideStatusBadge,
  ScoreBadge,
} from '../../components/ui';

async function getRideDetail(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const res = await fetch(`${baseUrl}/dashboard/rides/${id}/events`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch ride detail');
  }

  return res.json();
}

export default async function RideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getRideDetail(id);
  const ride = data.ride;
  const events = data.events;

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl">
        <Nav />

        <h1 className="mb-6 text-3xl font-bold text-slate-900">Ride Detail</h1>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm text-slate-500">Ride ID</div>
            <div className="mt-2 break-all font-mono text-sm">{ride.id}</div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm text-slate-500">Courier</div>
            <div className="mt-2 text-lg font-semibold">{ride.user?.name ?? '-'}</div>
            <div className="text-sm text-slate-500">{ride.user?.phone ?? '-'}</div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm text-slate-500">Status</div>
            <div className="mt-2">
              <RideStatusBadge status={ride.status} />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm text-slate-500">Score</div>
            <div className="mt-2">
              <ScoreBadge score={ride.score} />
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm text-slate-500">Started At</div>
            <div className="mt-2 text-base font-medium">
              {ride.startedAt ? new Date(ride.startedAt).toLocaleString() : '-'}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm text-slate-500">Ended At</div>
            <div className="mt-2 text-base font-medium">
              {ride.endedAt ? new Date(ride.endedAt).toLocaleString() : '-'}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm text-slate-500">Event Count</div>
            <div className="mt-2 text-3xl font-semibold">{events.length}</div>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Events</h2>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Lat</th>
                  <th className="px-4 py-3">Lng</th>
                  <th className="px-4 py-3">Meta</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event: any) => (
                  <tr key={event.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <EventTypeBadge type={event.type} />
                    </td>
                    <td className="px-4 py-3">{new Date(event.ts).toLocaleString()}</td>
                    <td className="px-4 py-3">{event.severity ?? '-'}</td>
                    <td className="px-4 py-3">{event.lat ?? '-'}</td>
                    <td className="px-4 py-3">{event.lng ?? '-'}</td>
                    <td className="px-4 py-3">
                      <pre className="max-w-xs overflow-auto text-xs text-slate-600">
                        {JSON.stringify(event.metaJson, null, 2)}
                      </pre>
                    </td>
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