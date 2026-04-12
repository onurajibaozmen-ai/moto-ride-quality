export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type CourierItem = {
  id: string;
  name: string;
  phone: string;
  role?: string;
  isActive?: boolean;
  lastSeenAt?: string | null;
  availabilityStatus?: 'OFFLINE' | 'READY' | 'DELIVERY';
  availabilityUpdatedAt?: string | null;
  shiftAutoReadyEnabled?: boolean;
  activeRide?: {
    id: string;
    status: string;
    openOrderCount?: number;
    orderCount?: number;
  } | null;
  latestTelemetry?: {
    ts: string;
    lat: number;
    lng: number;
    rideId?: string | null;
  } | null;
  dailyStats?: {
    deliveredCountToday?: number;
    totalRouteDistanceMetersToday?: number;
  };
  dispatch?: {
    isAssignable?: boolean;
    hasOpenOrders?: boolean;
    openOrderCount?: number;
  };
};

type CouriersResponse = {
  page?: number;
  limit?: number;
  total?: number;
  items?: CourierItem[];
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function availabilityBadgeClass(status?: CourierItem['availabilityStatus']) {
  switch (status) {
    case 'READY':
      return 'bg-emerald-100 text-emerald-700';
    case 'DELIVERY':
      return 'bg-blue-100 text-blue-700';
    case 'OFFLINE':
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

async function getCouriers(): Promise<CouriersResponse> {
  try {
    return await apiFetch<CouriersResponse>(
      '/dashboard/couriers?page=1&limit=100',
    );
  } catch (error) {
    console.error('Failed to fetch couriers', error);
    return { items: [] };
  }
}

export default async function CouriersPage() {
  const data = await getCouriers();
  const couriers = Array.isArray(data?.items) ? data.items : [];

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Couriers</h1>
          <p className="mt-2 text-slate-600">
            Courier availability, günlük performans ve scoring görünümü.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Availability</th>
                  <th className="px-4 py-3 text-left">Assignable</th>
                  <th className="px-4 py-3 text-left">Delivered Today</th>
                  <th className="px-4 py-3 text-left">Route Distance Today</th>
                  <th className="px-4 py-3 text-left">Open Orders</th>
                  <th className="px-4 py-3 text-left">Active Ride</th>
                  <th className="px-4 py-3 text-left">Last Seen</th>
                  <th className="px-4 py-3 text-left">Latest Telemetry</th>
                  <th className="px-4 py-3 text-left">Scoring</th>
                </tr>
              </thead>
              <tbody>
                {couriers.map((courier) => (
                  <tr key={courier.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <Link
                        href={`/couriers/${courier.id}`}
                        className="font-medium text-slate-900 hover:text-blue-600 hover:underline"
                      >
                        {courier.name}
                      </Link>
                      <div className="text-xs text-slate-500">{courier.id}</div>
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {courier.phone}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${availabilityBadgeClass(
                          courier.availabilityStatus,
                        )}`}
                      >
                        {courier.availabilityStatus ?? 'OFFLINE'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {courier.dispatch?.isAssignable ? 'Yes' : 'No'}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {courier.dailyStats?.deliveredCountToday ?? 0}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {courier.dailyStats?.totalRouteDistanceMetersToday ?? 0} m
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {courier.dispatch?.openOrderCount ??
                        courier.activeRide?.openOrderCount ??
                        courier.activeRide?.orderCount ??
                        0}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {courier.activeRide ? (
                        <div>
                          <div className="font-medium text-slate-900">
                            {courier.activeRide.id}
                          </div>
                          <div className="text-xs text-slate-500">
                            {courier.activeRide.status}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(courier.lastSeenAt)}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {courier.latestTelemetry ? (
                        <div>
                          <div>
                            {courier.latestTelemetry.lat.toFixed(5)},{' '}
                            {courier.latestTelemetry.lng.toFixed(5)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatDate(courier.latestTelemetry.ts)}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <Link
                        href={`/couriers/${courier.id}/scoring`}
                        className="text-blue-600 hover:underline"
                      >
                        View scoring
                      </Link>
                    </td>
                  </tr>
                ))}

                {couriers.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No couriers found.
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