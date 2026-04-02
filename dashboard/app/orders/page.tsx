import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type OrderItem = {
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

type OrdersResponse = {
  page: number;
  limit: number;
  total: number;
  items: OrderItem[];
};

type OrdersOverview = {
  totalOrders: number;
  pendingOrders: number;
  assignedOrders: number;
  pickedUpOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  onTimeDeliveryCount: number;
  lateDeliveryCount: number;
  averagePickupDelaySeconds: number | null;
  averageDeliveryDelaySeconds: number | null;
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

function statusBadgeClass(status: string) {
  switch (status) {
    case 'DELIVERED':
      return 'bg-emerald-100 text-emerald-700';
    case 'PICKED_UP':
      return 'bg-blue-100 text-blue-700';
    case 'ASSIGNED':
      return 'bg-amber-100 text-amber-800';
    case 'CANCELLED':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function etaBadgeClass(status: string) {
  switch (status) {
    case 'on_time':
      return 'bg-emerald-100 text-emerald-700';
    case 'late':
      return 'bg-rose-100 text-rose-700';
    case 'early':
      return 'bg-blue-100 text-blue-700';
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export default async function OrdersPage() {
  const [overview, data] = await Promise.all([
    apiFetch('/dashboard/orders/overview') as Promise<OrdersOverview>,
    apiFetch('/dashboard/orders?page=1&limit=50') as Promise<OrdersResponse>,
  ]);

  const orders = Array.isArray(data?.items) ? data.items : [];

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            Order operations, ETA accuracy, and delivery timing visibility
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Total Orders</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {overview?.totalOrders ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Pending</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {overview?.pendingOrders ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Delivered</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {overview?.deliveredOrders ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">On-Time Deliveries</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {overview?.onTimeDeliveryCount ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Late Deliveries</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {overview?.lateDeliveryCount ?? 0}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Average Pickup Delay</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {formatDelay(overview?.averagePickupDelaySeconds)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Average Delivery Delay</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {formatDelay(overview?.averageDeliveryDelaySeconds)}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Courier</th>
                <th className="px-4 py-3">Ride</th>
                <th className="px-4 py-3">Est. Delivery</th>
                <th className="px-4 py-3">Actual Delivery</th>
                <th className="px-4 py-3">Delay</th>
                <th className="px-4 py-3">ETA Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {order.externalRef ?? order.id}
                        </Link>
                      </div>
                      <div className="font-mono text-xs text-slate-500">{order.id}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(
                          order.status,
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {order.courier ? (
                        <div>
                          <div className="font-medium text-slate-900">
                            {order.courier.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {order.courier.phone}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {order.ride ? (
                        <Link
                          href={`/rides/${order.ride.id}`}
                          className="font-mono text-xs text-blue-600 hover:underline"
                        >
                          {order.ride.id}
                        </Link>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(order.estimatedDeliveryTime)}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(order.actualDeliveryTime)}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {formatDelay(order.metrics?.deliveryDelaySeconds)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${etaBadgeClass(
                          order.metrics?.deliveryEtaStatus ?? 'unknown',
                        )}`}
                      >
                        {order.metrics?.deliveryEtaStatus ?? 'unknown'}
                      </span>
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