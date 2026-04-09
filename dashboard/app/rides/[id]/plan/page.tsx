import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import SimpleMap from '@/components/maps/simple-map';

type RidePlanResponse = {
  ride: {
    id: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    score: number | null;
  };
  courier: {
    id: string;
    name: string;
    phone: string;
    availabilityStatus?: string;
  } | null;
  totalOrders: number;
  orders: Array<{
    id: string;
    externalRef?: string | null;
    status: string;
    actualPickupTime?: string | null;
    actualDeliveryTime?: string | null;
    estimatedPickupTime?: string | null;
    estimatedDeliveryTime?: string | null;
    metrics?: {
      pickupDelaySeconds?: number | null;
      deliveryDelaySeconds?: number | null;
      pickupEtaStatus?: string;
      deliveryEtaStatus?: string;
    };
  }>;
  stops: Array<{
    stopId: string;
    orderId: string;
    orderRef?: string | null;
    type: 'pickup' | 'dropoff';
    lat: number;
    lng: number;
    status: string;
    sequence: number;
  }>;
  recommendedSequence: Array<{
    stopId: string;
    orderId: string;
    orderRef?: string | null;
    type: 'pickup' | 'dropoff';
    lat: number;
    lng: number;
    status: string;
    sequence: number;
  }>;
  actualSequence: Array<{
    stopId: string;
    orderId: string;
    orderRef?: string | null;
    type: 'pickup' | 'dropoff';
    lat: number;
    lng: number;
    status: string;
    sequence: number;
    actualTs?: string | null;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

async function getRidePlan(id: string): Promise<RidePlanResponse | null> {
  try {
    return await apiFetch<RidePlanResponse>(`/dashboard/rides/${id}/plan`);
  } catch (error) {
    console.error('Failed to fetch ride plan', error);
    return null;
  }
}

export default async function RidePlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = await getRidePlan(id);

  if (!plan) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              Ride plan not found
            </h1>
            <p className="mt-2 text-slate-600">Ride plan alınamadı.</p>
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

  const stopMarkers = plan.recommendedSequence.map((stop) => ({
    id: stop.stopId,
    lat: stop.lat,
    lng: stop.lng,
    label: String(stop.sequence),
    title: `${stop.type.toUpperCase()} - ${stop.orderRef ?? stop.orderId}`,
  }));

  const stopPath = plan.recommendedSequence.map((stop) => ({
    lat: stop.lat,
    lng: stop.lng,
  }));

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Ride Plan</h1>
            <p className="mt-2 text-slate-600">{plan.ride.id}</p>
          </div>
          <Link
            href={`/rides/${plan.ride.id}`}
            className="text-blue-600 hover:underline"
          >
            Back to ride detail
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Ride Status</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {plan.ride.status}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Courier</div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {plan.courier?.name ?? '-'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Total Orders</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {plan.totalOrders}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Ride Score</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {plan.ride.score ?? '-'}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Ride Plan Map
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Stop sequence harita görünümü.
          </p>

          <div className="mt-4">
            <SimpleMap markers={stopMarkers} path={stopPath} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Recommended Sequence
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Sequence</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Lat</th>
                  <th className="px-4 py-3 text-left">Lng</th>
                </tr>
              </thead>
              <tbody>
                {plan.recommendedSequence.map((stop) => (
                  <tr key={stop.stopId} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-700">{stop.sequence}</td>
                    <td className="px-4 py-3 text-slate-700">{stop.type}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {stop.orderRef ?? stop.orderId}
                      </div>
                      <div className="text-xs text-slate-500">{stop.orderId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{stop.status}</td>
                    <td className="px-4 py-3 text-slate-700">{stop.lat}</td>
                    <td className="px-4 py-3 text-slate-700">{stop.lng}</td>
                  </tr>
                ))}

                {plan.recommendedSequence.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No recommended stops found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Actual Sequence</h2>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Sequence</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actual Time</th>
                </tr>
              </thead>
              <tbody>
                {plan.actualSequence.map((stop) => (
                  <tr key={stop.stopId} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-700">{stop.sequence}</td>
                    <td className="px-4 py-3 text-slate-700">{stop.type}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {stop.orderRef ?? stop.orderId}
                      </div>
                      <div className="text-xs text-slate-500">{stop.orderId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{stop.status}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(stop.actualTs)}
                    </td>
                  </tr>
                ))}

                {plan.actualSequence.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No actual stops found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Ride Orders & ETA Metrics
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Pickup ETA</th>
                  <th className="px-4 py-3 text-left">Delivery ETA</th>
                  <th className="px-4 py-3 text-left">Pickup Delay (s)</th>
                  <th className="px-4 py-3 text-left">Delivery Delay (s)</th>
                </tr>
              </thead>
              <tbody>
                {plan.orders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {order.externalRef ?? order.id}
                      </div>
                      <div className="text-xs text-slate-500">{order.id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{order.status}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {order.metrics?.pickupEtaStatus ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {order.metrics?.deliveryEtaStatus ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {order.metrics?.pickupDelaySeconds ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {order.metrics?.deliveryDelaySeconds ?? '-'}
                    </td>
                  </tr>
                ))}

                {plan.orders.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No orders in this ride.
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