import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import RidePlanMapClient from '@/components/ride-plan-map-client';

type Stop = {
  stopId: string;
  orderId: string;
  orderRef: string;
  type: 'pickup' | 'dropoff';
  lat: number;
  lng: number;
  status: string;
  sequence: number;
  actualTs?: string | null;
};

type PlanResponse = {
  ride: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    score: number | null;
  };
  courier: {
    id: string;
    name: string;
    phone: string;
  };
  totalOrders: number;
  orders: Array<{
    id: string;
    externalRef: string | null;
    status: string;
    actualPickupTime: string | null;
    actualDeliveryTime: string | null;
    estimatedPickupTime: string | null;
    estimatedDeliveryTime: string | null;
    metrics: {
      pickupDelaySeconds: number | null;
      deliveryDelaySeconds: number | null;
      pickupEtaStatus: string;
      deliveryEtaStatus: string;
    };
  }>;
  stops: Stop[];
  recommendedSequence: Stop[];
  actualSequence: Stop[];
};

function badge(type: string) {
  if (type === 'pickup') return 'bg-blue-100 text-blue-700';
  if (type === 'dropoff') return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-700';
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function calculateSequenceAccuracy(
  recommended: Stop[],
  actual: Stop[],
): number | null {
  if (!recommended.length || !actual.length) return null;

  const limit = Math.min(recommended.length, actual.length);
  let correct = 0;

  for (let i = 0; i < limit; i++) {
    if (recommended[i].stopId === actual[i].stopId) {
      correct += 1;
    }
  }

  return Number(((correct / limit) * 100).toFixed(2));
}

export default async function RidePlanPage(
  props: PageProps<'/rides/[id]/plan'>
) {
  const { id } = await props.params;

  const data = (await apiFetch(`/orders/ride/${id}/plan`)) as PlanResponse;

  const recommended = data?.recommendedSequence ?? [];
  const actual = data?.actualSequence ?? [];
  const sequenceAccuracy = calculateSequenceAccuracy(recommended, actual);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link href={`/rides/${id}`} className="text-sm text-blue-600 hover:underline">
            ← Back to ride
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Ride Plan
          </h1>
          <p className="text-sm text-slate-500">
            Multi-order stop sequencing and execution visibility
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Ride</div>
            <div className="mt-2 font-mono text-xs text-slate-900">
              {data.ride.id}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Courier</div>
            <div className="mt-2 font-medium text-slate-900">
              {data.courier?.name ?? '-'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Total Orders</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {data.totalOrders}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Sequence Accuracy</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {sequenceAccuracy !== null ? `${sequenceAccuracy}%` : '-'}
            </div>
          </div>
        </div>

        <RidePlanMapClient
          recommendedSequence={recommended}
          actualSequence={actual}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Recommended Sequence
              </h2>
            </div>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">Seq</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Location</th>
                </tr>
              </thead>
              <tbody>
                {recommended.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No recommended sequence.
                    </td>
                  </tr>
                ) : (
                  recommended.map((stop) => (
                    <tr key={stop.stopId} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {stop.sequence}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${badge(
                            stop.type,
                          )}`}
                        >
                          {stop.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-900">
                        {stop.orderRef}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Actual Sequence
              </h2>
            </div>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">Seq</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Completed At</th>
                </tr>
              </thead>
              <tbody>
                {actual.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No actual execution sequence yet.
                    </td>
                  </tr>
                ) : (
                  actual.map((stop) => (
                    <tr key={stop.stopId} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {stop.sequence}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${badge(
                            stop.type,
                          )}`}
                        >
                          {stop.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-900">
                        {stop.orderRef}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDate(stop.actualTs ?? null)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Orders in this Ride
            </h2>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Est. Pickup</th>
                <th className="px-4 py-3">Actual Pickup</th>
                <th className="px-4 py-3">Est. Delivery</th>
                <th className="px-4 py-3">Actual Delivery</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No orders attached to this ride.
                  </td>
                </tr>
              ) : (
                data.orders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-mono text-xs text-slate-900">
                      {order.externalRef ?? order.id}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{order.status}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(order.estimatedPickupTime)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(order.actualPickupTime)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(order.estimatedDeliveryTime)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(order.actualDeliveryTime)}
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