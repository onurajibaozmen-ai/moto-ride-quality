import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type OrderItem = {
  id: string;
  externalRef?: string | null;
  status: string;
  assignedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  estimatedPickupTime?: string | null;
  estimatedDeliveryTime?: string | null;
  actualPickupTime?: string | null;
  actualDeliveryTime?: string | null;
  courier?: {
    id: string;
    name: string;
    phone: string;
  } | null;
  ride?: {
    id: string;
    status: string;
    startedAt?: string | null;
    endedAt?: string | null;
    score?: number | null;
  } | null;
};

type OrdersResponse = {
  page?: number;
  limit?: number;
  total?: number;
  items?: OrderItem[];
};

type OverviewResponse = {
  orders?: {
    total?: number;
    pending?: number;
    assigned?: number;
    pickedUp?: number;
    delivered?: number;
  };
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

async function getOrders(): Promise<OrdersResponse> {
  try {
    return await apiFetch<OrdersResponse>('/dashboard/orders?page=1&limit=100');
  } catch (error) {
    console.error('Failed to fetch orders', error);
    return { items: [] };
  }
}

async function getOverview(): Promise<OverviewResponse> {
  try {
    return await apiFetch<OverviewResponse>('/dashboard/overview');
  } catch (error) {
    console.error('Failed to fetch overview', error);
    return {};
  }
}

export default async function OrdersPage() {
  const [overview, data] = await Promise.all([getOverview(), getOrders()]);
  const orders = Array.isArray(data?.items) ? data.items : [];

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Orders</h1>
          <p className="mt-2 text-slate-600">
            Sipariş operasyonları ve dispatch görünümü.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Total</div>
            <div className="mt-1 text-2xl font-semibold">
              {overview?.orders?.total ?? 0}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Pending</div>
            <div className="mt-1 text-2xl font-semibold">
              {overview?.orders?.pending ?? 0}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Assigned</div>
            <div className="mt-1 text-2xl font-semibold">
              {overview?.orders?.assigned ?? 0}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Picked Up</div>
            <div className="mt-1 text-2xl font-semibold">
              {overview?.orders?.pickedUp ?? 0}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Delivered</div>
            <div className="mt-1 text-2xl font-semibold">
              {overview?.orders?.delivered ?? 0}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Courier</th>
                  <th className="px-4 py-3 text-left">Ride</th>
                  <th className="px-4 py-3 text-left">Est. Delivery</th>
                  <th className="px-4 py-3 text-left">Actual Delivery</th>
                  <th className="px-4 py-3 text-left">Dispatch</th>
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
                    <td className="px-4 py-3 text-slate-700">
                      {order.courier?.name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {order.ride?.id ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(order.estimatedDeliveryTime)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(order.actualDeliveryTime)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        View dispatch panel
                      </Link>
                    </td>
                  </tr>
                ))}

                {orders.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No orders found.
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