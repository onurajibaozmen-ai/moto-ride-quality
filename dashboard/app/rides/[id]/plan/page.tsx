import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import SimpleMap from '@/components/maps/simple-map';

type RidePlanResponse = {
  rideId?: string;
  ride?: {
    id: string;
    status?: string;
    startedAt?: string | null;
    endedAt?: string | null;
    score?: number | null;
  };
  courier?: {
    id: string;
    name: string;
    phone: string;
    availabilityStatus?: string;
  } | null;
  totalOrders?: number;
  totalRouteDistance?: number;
  totalRouteDistanceMeters?: number;
  orders?: Array<{
    id: string;
    externalRef?: string | null;
    status: string;
    pickupAddress?: string | null;
    dropoffAddress?: string | null;
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
  stops?: Array<{
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
  recommendedSequence?: Array<{
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
  actualSequence?: Array<{
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

function formatMeters(value?: number | null) {
  if (value === null || value === undefined) return '-';
  return `${value.toLocaleString()} m`;
}

function formatSeconds(value?: number | null) {
  if (value === null || value === undefined) return '-';
  return `${value}s`;
}

async function getRidePlan(id: string): Promise<RidePlanResponse | null> {
  try {
    return await apiFetch<RidePlanResponse>(`/orders/rides/${id}/plan`);
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

  const recommendedSequence = plan.recommendedSequence ?? plan.stops ?? [];
  const actualSequence = plan.actualSequence ?? [];
  const orders = plan.orders ?? [];

  const stopMarkers = recommendedSequence.map((stop) => ({
    id: stop.stopId,
    lat: stop.lat,
    lng: stop.lng,
    label: String(stop.sequence),
    title: `${stop.type.toUpperCase()} - ${stop.orderRef ?? stop.orderId}`,
  }));

  const stopPath = recommendedSequence.map((stop) => ({
    lat: stop.lat,
    lng: stop.lng,
  }));

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Ride Plan</h1>
            <p className="mt-2 text-slate-600">
              {plan.ride?.id ?? plan.rideId ?? id}
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/rides" className="text-blue-600 hover:underline">
              Back to rides
            </Link>
            <Link
              href={`/rides/${plan.ride?.id ?? plan.rideId ?? id}`}
              className="text-blue-600 hover:underline"
            >
              Ride detail
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Ride Status</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {plan.ride?.status ?? '-'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Courier</div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {plan.courier?.name ?? '-'}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {plan.courier?.phone ?? '-'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Availability</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {plan.courier?.availabilityStatus ?? '-'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Total Orders</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {plan.totalOrders ?? orders.length}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Route Distance</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {formatMeters(
                plan.totalRouteDistanceMeters ?? plan.totalRouteDistance ?? null,
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Started At</div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {formatDate(plan.ride?.startedAt)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Ended At</div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {formatDate(plan.ride?.endedAt)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Ride Score</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {plan.ride?.score ?? '-'}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Route Map
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Recommended stop sequence ve rota görünümü.
          </p>

          <div className="mt-4">
            {stopMarkers.length > 0 ? (
              <SimpleMap markers={stopMarkers} path={stopPath} />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Haritada gösterilecek stop bulunamadı.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Recommended Sequence
            </h2>
            <div className="text-sm text-slate-500">
              {recommendedSequence.length} stop
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Seq</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Coordinates</th>
                </tr>
              </thead>
              <tbody>
                {recommendedSequence.map((stop) => (
                  <tr key={stop.stopId} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {stop.sequence}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          stop.type === 'pickup'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {stop.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {stop.orderRef ?? stop.orderId}
                      </div>
                      <div className="text-xs text-slate-500">{stop.orderId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{stop.status}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {stop.lat}, {stop.lng}
                    </td>
                  </tr>
                ))}

                {recommendedSequence.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No recommended sequence found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Actual Sequence
            </h2>
            <div className="text-sm text-slate-500">
              {actualSequence.length} completed stop
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Seq</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actual Time</th>
                </tr>
              </thead>
              <tbody>
                {actualSequence.map((stop) => (
                  <tr key={stop.stopId} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {stop.sequence}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          stop.type === 'pickup'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {stop.type}
                      </span>
                    </td>
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

                {actualSequence.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Henüz tamamlanmış actual stop yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Orders in Ride
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Pickup Address</th>
                  <th className="px-4 py-3 text-left">Dropoff Address</th>
                  <th className="px-4 py-3 text-left">Pickup ETA</th>
                  <th className="px-4 py-3 text-left">Delivery ETA</th>
                  <th className="px-4 py-3 text-left">Pickup Delay</th>
                  <th className="px-4 py-3 text-left">Delivery Delay</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {order.externalRef ?? order.id}
                      </div>
                      <div className="text-xs text-slate-500">{order.id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{order.status}</td>
                    <td className="max-w-xs px-4 py-3 text-slate-700">
                      <div className="line-clamp-2">
                        {order.pickupAddress ?? '-'}
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-700">
                      <div className="line-clamp-2">
                        {order.dropoffAddress ?? '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {order.metrics?.pickupEtaStatus ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {order.metrics?.deliveryEtaStatus ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatSeconds(order.metrics?.pickupDelaySeconds)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatSeconds(order.metrics?.deliveryDelaySeconds)}
                    </td>
                  </tr>
                ))}

                {orders.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Ride içinde order bulunamadı.
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