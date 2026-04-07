import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type CourierScoringResponse = {
  courier: {
    id: string;
    name: string;
    phone: string;
    isActive: boolean;
    lastSeenAt: string | null;
    availabilityStatus: string;
    availabilityUpdatedAt: string | null;
  };
  analytics: {
    totalRides: number;
    activeRideCount: number;
    totalDeliveredOrders: number;
    deliveredCountToday: number;
    totalRouteDistanceMetersToday: number;
    onTimePickupCount: number;
    onTimeDeliveryCount: number;
  };
  recentRides: Array<{
    id: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    score: number | null;
    orderCount: number;
  }>;
  recentDeliveredOrders: Array<{
    id: string;
    externalRef: string | null;
    estimatedPickupTime: string | null;
    estimatedDeliveryTime: string | null;
    actualPickupTime: string | null;
    actualDeliveryTime: string | null;
    deliveredAt: string | null;
    routeDistanceMeters?: number;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

async function getCourierScoring(
  id: string,
): Promise<CourierScoringResponse | null> {
  try {
    return await apiFetch<CourierScoringResponse>(
      `/dashboard/couriers/${id}/scoring`,
    );
  } catch (error) {
    console.error('Failed to fetch courier scoring', error);
    return null;
  }
}

export default async function CourierScoringPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCourierScoring(id);

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              Courier scoring not found
            </h1>
            <p className="mt-2 text-slate-600">
              Sürücü puanlandırma verisi alınamadı.
            </p>
            <Link
              href="/couriers"
              className="mt-4 inline-block text-blue-600 hover:underline"
            >
              Back to couriers
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { courier, analytics, recentRides, recentDeliveredOrders } = data;

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Courier Scoring
            </h1>
            <p className="mt-2 text-slate-600">
              {courier.name} · {courier.phone}
            </p>
          </div>
          <Link href="/couriers" className="text-blue-600 hover:underline">
            Back to couriers
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Availability</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {courier.availabilityStatus}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Delivered Today</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {analytics.deliveredCountToday}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Route Distance Today</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {analytics.totalRouteDistanceMetersToday} m
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Last Seen</div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {formatDate(courier.lastSeenAt)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Total Rides</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {analytics.totalRides}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Active Ride Count</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {analytics.activeRideCount}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">On-Time Pickup</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {analytics.onTimePickupCount}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">On-Time Delivery</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {analytics.onTimeDeliveryCount}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent Rides</h2>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Ride ID</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Started</th>
                  <th className="px-4 py-3 text-left">Ended</th>
                  <th className="px-4 py-3 text-left">Score</th>
                  <th className="px-4 py-3 text-left">Orders</th>
                </tr>
              </thead>
              <tbody>
                {recentRides.map((ride) => (
                  <tr key={ride.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {ride.id}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{ride.status}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(ride.startedAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(ride.endedAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {ride.score ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {ride.orderCount}
                    </td>
                  </tr>
                ))}

                {recentRides.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
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

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Delivered Orders
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Delivered At</th>
                  <th className="px-4 py-3 text-left">Est. Delivery</th>
                  <th className="px-4 py-3 text-left">Actual Delivery</th>
                  <th className="px-4 py-3 text-left">Route Distance</th>
                </tr>
              </thead>
              <tbody>
                {recentDeliveredOrders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {order.externalRef ?? order.id}
                      </div>
                      <div className="text-xs text-slate-500">{order.id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(order.deliveredAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(order.estimatedDeliveryTime)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(order.actualDeliveryTime)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {order.routeDistanceMeters ?? '-'} m
                    </td>
                  </tr>
                ))}

                {recentDeliveredOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No delivered orders found.
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