import Link from 'next/link';
import { fetchJson } from '@/lib/api';
import OrderDispatchPanel from '@/components/order-dispatch-panel';

type OrderDetailResponse = {
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
    name: string | null;
    phone: string | null;
  } | null;
  ride: {
    id: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    score: number | null;
  } | null;
  metrics?: {
    pickupDelaySeconds: number | null;
    deliveryDelaySeconds: number | null;
    onTimePickup: boolean | null;
    onTimeDelivery: boolean | null;
    pickupEtaStatus: string;
    deliveryEtaStatus: string;
  };
};

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatSeconds(value: number | null | undefined) {
  if (typeof value !== 'number') return '-';
  return `${value}s`;
}

export default async function OrderDetailPage(
  props: PageProps<'/orders/[id]'>
) {
  const { id } = await props.params;

  const order = (await fetchJson(`/dashboard/orders/${id}`)) as OrderDetailResponse | null;

  if (!order) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl">
          <Link href="/orders" className="text-sm text-blue-600 hover:underline">
            ← Back to orders
          </Link>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">Order not found</h1>
            <p className="mt-2 text-sm text-slate-600">
              The requested order could not be loaded.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link href="/orders" className="text-sm text-blue-600 hover:underline">
            ← Back to orders
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Order Detail</h1>
          <p className="mt-1 font-mono text-xs text-slate-500">{order.id}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">External Ref</div>
            <div className="mt-2 text-lg font-semibold text-slate-900">
              {order.externalRef ?? '-'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Status</div>
            <div className="mt-2 text-lg font-semibold text-slate-900">
              {order.status}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Courier</div>
            <div className="mt-2 text-lg font-semibold text-slate-900">
              {order.courier?.name ?? '-'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Ride</div>
            <div className="mt-2 text-lg font-semibold text-slate-900">
              {order.ride?.id ?? '-'}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-slate-500">Created At</div>
                <div className="mt-1 text-slate-900">{formatDate(order.createdAt)}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Updated At</div>
                <div className="mt-1 text-slate-900">{formatDate(order.updatedAt)}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Assigned At</div>
                <div className="mt-1 text-slate-900">{formatDate(order.assignedAt)}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Pickup Time</div>
                <div className="mt-1 text-slate-900">{formatDate(order.actualPickupTime)}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Delivery Time</div>
                <div className="mt-1 text-slate-900">{formatDate(order.actualDeliveryTime)}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Courier Phone</div>
                <div className="mt-1 text-slate-900">{order.courier?.phone ?? '-'}</div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Pickup Coordinates</div>
                <div className="mt-1 font-medium text-slate-900">
                  {order.pickupLat}, {order.pickupLng}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Dropoff Coordinates</div>
                <div className="mt-1 font-medium text-slate-900">
                  {order.dropoffLat}, {order.dropoffLng}
                </div>
              </div>
            </div>

            {order.notes ? (
              <div className="mt-6 rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Notes</div>
                <div className="mt-1 text-slate-900">{order.notes}</div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">ETA Metrics</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pickup Delay</span>
                <span className="font-medium text-slate-900">
                  {formatSeconds(order.metrics?.pickupDelaySeconds)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Delivery Delay</span>
                <span className="font-medium text-slate-900">
                  {formatSeconds(order.metrics?.deliveryDelaySeconds)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pickup ETA Status</span>
                <span className="font-medium text-slate-900">
                  {order.metrics?.pickupEtaStatus ?? '-'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Delivery ETA Status</span>
                <span className="font-medium text-slate-900">
                  {order.metrics?.deliveryEtaStatus ?? '-'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">On-time Pickup</span>
                <span className="font-medium text-slate-900">
                  {order.metrics?.onTimePickup == null
                    ? '-'
                    : order.metrics.onTimePickup
                    ? 'Yes'
                    : 'No'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">On-time Delivery</span>
                <span className="font-medium text-slate-900">
                  {order.metrics?.onTimeDelivery == null
                    ? '-'
                    : order.metrics.onTimeDelivery
                    ? 'Yes'
                    : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Dispatch Intelligence</h2>
          <div className="mt-4">
            <OrderDispatchPanel orderId={order.id} />
          </div>
        </div>

        {order.ride ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Linked Ride</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-slate-500">Ride ID</div>
                <div className="mt-1 font-mono text-sm text-slate-900">
                  {order.ride.id}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Ride Status</div>
                <div className="mt-1 text-slate-900">{order.ride.status}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Ride Started</div>
                <div className="mt-1 text-slate-900">
                  {formatDate(order.ride.startedAt)}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Ride Ended</div>
                <div className="mt-1 text-slate-900">
                  {formatDate(order.ride.endedAt)}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Link
                href={`/rides/${order.ride.id}`}
                className="inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                View Ride Detail
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}