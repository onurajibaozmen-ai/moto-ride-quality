import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type CourierItem = {
  id: string;
  name: string;
  phone: string;
  lastSeenAt: string | null;
  online: boolean;
  lastRide: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    totalDistanceM: number | null;
    durationS: number | null;
    score: number | null;
    analytics?: {
      qualityScore?: number | null;
    } | null;
    scoreCard?: {
      confidenceLevel?: string | null;
    } | null;
  } | null;
};

export default async function CouriersPage() {
  const couriers = (await apiFetch('/dashboard/couriers')) as CourierItem[];

  const items = Array.isArray(couriers) ? couriers : [];

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Couriers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Courier status and latest ride snapshot
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Courier</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Online</th>
                <th className="px-4 py-3">Last Seen</th>
                <th className="px-4 py-3">Last Ride</th>
                <th className="px-4 py-3">Last Score</th>
                <th className="px-4 py-3">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No couriers found.
                  </td>
                </tr>
              ) : (
                items.map((courier) => (
                  <tr key={courier.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {courier.name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{courier.phone ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          courier.online
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {courier.online ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {courier.lastSeenAt
                        ? new Date(courier.lastSeenAt).toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {courier.lastRide ? (
                        <Link
                          href={`/rides/${courier.lastRide.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {courier.lastRide.id}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {typeof courier.lastRide?.score === 'number'
                        ? courier.lastRide.score.toFixed(2)
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {courier.lastRide?.scoreCard?.confidenceLevel ?? '-'}
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