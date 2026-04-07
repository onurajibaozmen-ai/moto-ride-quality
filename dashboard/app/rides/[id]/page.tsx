import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type RideDetailResponse = {
  id: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  score: number | null;
  courier: {
    id: string;
    name: string;
    phone: string;
    isActive?: boolean;
    lastSeenAt?: string | null;
    availabilityStatus?: string;
    availabilityUpdatedAt?: string | null;
  } | null;
  orderCount: number;
  orders: Array<{
    id: string;
    externalRef: string | null;
    status: string;
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
    estimatedPickupTime?: string | null;
    estimatedDeliveryTime?: string | null;
    actualPickupTime?: string | null;
    actualDeliveryTime?: string | null;
    courier?: {
      id: string;
      name: string;
      phone: string;
      availabilityStatus?: string;
    } | null;
  }>;
  telemetry: Array<{
    id: string;
    ts: string;
    lat: number;
    lng: number;
    speedKmh?: number | null;
    heading?: number | null;
    accuracyM?: number | null;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

async function getRideDetail(id: string): Promise<RideDetailResponse | null> {
  try {
    return await apiFetch<RideDetailResponse>(`/dashboard/rides/${id}`);
  } catch (error) {
    console.error('Failed to fetch ride detail', error);
    return null;
  }
}

export default async function RideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ride = await getRideDetail(id);

  if (!ride) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              Ride not found
            </h1>
            <p className="mt-2 text-slate-600">
              Ride detayı alınamadı.
            </p>
            <Link
              href="/rides"
              className="mt-4 inline-block text-blue-600 hover:underline"
            >
              Back to rides
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Ride Detail</h1>
            <p className="mt-2 text-slate-600">{ride.id}</p>
          </div>
          <Link href={`/rides/${ride.id}/plan`} className="text-blue-600 hover:underline">
            View ride plan
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Status</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {ride.status}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Score</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {ride.score ?? '-'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Started At</div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {formatDate(ride.startedAt)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Ended At</div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {formatDate(ride.endedAt)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="text-lg font-semibold text-slate-900">Courier</h2>
            {ride.courier ? (
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <div>
                  <span className="font-medium text-slate-900">Name:</span>{' '}
                  {ride.courier.name}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Phone:</span>{' '}
                  {ride.courier.phone}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Availability:</span>{' '}
                  {ride.courier.availabilityStatus ?? '-'}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Last Seen:</span>{' '}
                  {formatDate(ride.courier.lastSeenAt)}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No courier assigned.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Orders ({ride.orderCount})
            </h2>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Order</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Est. Pickup</th>
                    <th className="px-4 py-3 text-left">Est. Delivery</th>
                    <th className="px-4 py-3 text-left">Actual Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {ride.orders.map((order) => (
                    <tr key={order.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {order.externalRef ?? order.id}
                        </div>
                        <div className="text-xs text-slate-500">{order.id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{order.status}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDate(order.estimatedPickupTime)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDate(order.estimatedDeliveryTime)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDate(order.actualDeliveryTime)}
                      </td>
                    </tr>
                  ))}

                  {ride.orders.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        No orders found for this ride.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Telemetry
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">Latitude</th>
                  <th className="px-4 py-3 text-left">Longitude</th>
                  <th className="px-4 py-3 text-left">Speed (km/h)</th>
                  <th className="px-4 py-3 text-left">Heading</th>
                  <th className="px-4 py-3 text-left">Accuracy (m)</th>
                </tr>
              </thead>
              <tbody>
                {ride.telemetry.map((point) => (
                  <tr key={point.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(point.ts)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {point.lat.toFixed(6)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {point.lng.toFixed(6)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {point.speedKmh ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {point.heading ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {point.accuracyM ?? '-'}
                    </td>
                  </tr>
                ))}

                {ride.telemetry.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No telemetry found.
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