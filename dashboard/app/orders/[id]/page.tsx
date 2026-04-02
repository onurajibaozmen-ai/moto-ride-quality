import Link from 'next/link';
import { fetchJson } from '@/lib/api';

type OrderDetail = {
  id: string;
  externalRef: string | null;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  status: string;
  assignedCourierId: string | null;
  rideId: string | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  estimatedPickupTime: string | null;
  estimatedDeliveryTime: string | null;
  actualPickupTime: string | null;
  actualDeliveryTime: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  courier: {
    id: string;
    name: string;
    phone: string;
  } | null;
  ride: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    score: number | null;
  } | null;
  metrics: {
    pickupDelaySeconds: number | null;
    deliveryDelaySeconds: number | null;
    onTimePickup: boolean | null;
    onTimeDelivery: boolean | null;
    pickupEtaStatus: 'pending' | 'on_time' | 'late' | 'early' | 'unknown';
    deliveryEtaStatus: 'pending' | 'on_time' | 'late' | 'early' | 'unknown';
  };
};

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatDelay(seconds: number | null | undefined) {
  if (typeof seconds !== 'number') return '-';
  const abs = Math.abs(seconds);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  const sign = seconds > 0 ? '+' : seconds < 0 ? '-' : '';
  return `${sign}${mins}m ${secs}s`;
}

function badgeClass(status: string) {
  switch (status) {
    case 'DELIVERED':
    case 'on_time':
      return 'bg-emerald-100 text-emerald-700';
    case 'PICKED_UP':
    case 'early':
      return 'bg-blue-100 text-blue-700';
    case 'ASSIGNED':
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'late':
    case 'CANCELLED':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export default async function OrderDetailPage(
  props: PageProps<'/orders/[id]'>
) {
  const { id } = await props.params;
  const data = (await fetchJson(`/dashboard/orders/${id}`)) as OrderDetail;

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link href="/orders" className="text-sm text-blue-600 hover:underline">
            ← Back to orders
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Order Detail
          </h1>
          <p className="mt-1 font-mono text-xs text-slate-500">{data.id}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Status</div>
            <div className="mt-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${badgeClass(
                  data.status,
                )}`}
              >
                {data.status}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Pickup Delay</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {formatDelay(data.metrics?.pickupDelaySeconds)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Delivery Delay</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {formatDelay(data.metrics?.deliveryDelaySeconds)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">On-Time Delivery</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {data.metrics?.onTimeDelivery === null
                ? '-'
                : data.metrics.onTimeDelivery
                ? 'Yes'
                : 'No'}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Order Info</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-slate-500">External Ref</div>
                <div className="mt-1 text-slate-900">
                  {data.externalRef ?? '-'}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Created</div>
                <div className="mt-1 text-slate-900">
                  {formatDate(data.createdAt)}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Pickup Location</div>
                <div className="mt-1 text-slate-900">
                  {data.pickupLat}, {data.pickupLng}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Dropoff Location</div>
                <div className="mt-1 text-slate-900">
                  {data.dropoffLat}, {data.dropoffLng}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="text-sm text-slate-500">Notes</div>
                <div className="mt-1 text-slate-900">
                  {data.notes ?? '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Courier / Ride</h2>

            <div className="mt-4 grid gap-4">
              <div>
                <div className="text-sm text-slate-500">Courier</div>
                {data.courier ? (
                  <div className="mt-1">
                    <div className="font-medium text-slate-900">
                      {data.courier.name}
                    </div>
                    <div className="text-sm text-slate-500">
                      {data.courier.phone}
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 text-slate-500">-</div>
                )}
              </div>

              <div>
                <div className="text-sm text-slate-500">Ride</div>
                {data.ride ? (
                  <Link
                    href={`/rides/${data.ride.id}`}
                    className="mt-1 inline-block font-mono text-xs text-blue-600 hover:underline"
                  >
                    {data.ride.id}
                  </Link>
                ) : (
                  <div className="mt-1 text-slate-500">-</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">ETA Timeline</h2>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">Step</th>
                  <th className="px-4 py-3">Estimated</th>
                  <th className="px-4 py-3">Actual</th>
                  <th className="px-4 py-3">Delay</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-900">Pickup</td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(data.estimatedPickupTime)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(data.actualPickupTime)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDelay(data.metrics?.pickupDelaySeconds)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${badgeClass(
                        data.metrics?.pickupEtaStatus ?? 'unknown',
                      )}`}
                    >
                      {data.metrics?.pickupEtaStatus ?? 'unknown'}
                    </span>
                  </td>
                </tr>

                <tr className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-900">Delivery</td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(data.estimatedDeliveryTime)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(data.actualDeliveryTime)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDelay(data.metrics?.deliveryDelaySeconds)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${badgeClass(
                        data.metrics?.deliveryEtaStatus ?? 'unknown',
                      )}`}
                    >
                      {data.metrics?.deliveryEtaStatus ?? 'unknown'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}