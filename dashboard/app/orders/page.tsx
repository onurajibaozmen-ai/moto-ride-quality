import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type OrderStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'ALL';

type OrderItem = {
  id: string;
  externalRef?: string | null;
  status: string;
  createdAt?: string | null;
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

type OrdersPageProps = {
  searchParams?: Promise<{
    status?: string;
    courierId?: string;
    from?: string;
    to?: string;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatStatusLabel(status: OrderStatus) {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'ASSIGNED':
      return 'Assigned';
    case 'PICKED_UP':
      return 'Picked Up';
    case 'DELIVERED':
      return 'Delivered';
    case 'ALL':
    default:
      return 'All';
  }
}

function getStatusBadgeClass(status?: string) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-800';
    case 'ASSIGNED':
      return 'bg-blue-100 text-blue-700';
    case 'PICKED_UP':
      return 'bg-violet-100 text-violet-700';
    case 'DELIVERED':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function isValidStatus(value?: string): value is Exclude<OrderStatus, 'ALL'> {
  return (
    value === 'PENDING' ||
    value === 'ASSIGNED' ||
    value === 'PICKED_UP' ||
    value === 'DELIVERED'
  );
}

async function getOrders(): Promise<OrdersResponse> {
  try {
    return await apiFetch<OrdersResponse>('/dashboard/orders?page=1&limit=200');
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

function isWithinDateRange(
  order: OrderItem,
  from?: string,
  to?: string,
): boolean {
  if (!from && !to) return true;

  const sourceDate =
    order.createdAt ||
    order.assignedAt ||
    order.pickedUpAt ||
    order.deliveredAt ||
    order.actualDeliveryTime ||
    null;

  if (!sourceDate) return false;

  const orderDate = new Date(sourceDate).getTime();

  if (from) {
    const fromDate = new Date(`${from}T00:00:00`).getTime();
    if (orderDate < fromDate) return false;
  }

  if (to) {
    const toDate = new Date(`${to}T23:59:59`).getTime();
    if (orderDate > toDate) return false;
  }

  return true;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  const selectedStatus: OrderStatus = isValidStatus(resolvedSearchParams.status)
    ? resolvedSearchParams.status
    : 'ALL';

  const selectedCourierId = resolvedSearchParams.courierId ?? '';
  const fromDate = resolvedSearchParams.from ?? '';
  const toDate = resolvedSearchParams.to ?? '';

  const [overview, data] = await Promise.all([getOverview(), getOrders()]);
  const allOrders = Array.isArray(data?.items) ? data.items : [];

  const courierOptions = Array.from(
    new Map(
      allOrders
        .filter((order) => order.courier?.id)
        .map((order) => [
          order.courier!.id,
          {
            id: order.courier!.id,
            name: order.courier!.name,
          },
        ]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filteredOrders = allOrders.filter((order) => {
    const matchesStatus =
      selectedStatus === 'ALL' ? true : order.status === selectedStatus;

    const matchesCourier = selectedCourierId
      ? order.courier?.id === selectedCourierId
      : true;

    const matchesDate = isWithinDateRange(order, fromDate, toDate);

    return matchesStatus && matchesCourier && matchesDate;
  });

  const statusCards: Array<{
    key: OrderStatus;
    label: string;
    value: number;
  }> = [
    {
      key: 'ALL',
      label: 'Total',
      value: overview?.orders?.total ?? allOrders.length,
    },
    {
      key: 'PENDING',
      label: 'Pending',
      value: overview?.orders?.pending ?? 0,
    },
    {
      key: 'ASSIGNED',
      label: 'Assigned',
      value: overview?.orders?.assigned ?? 0,
    },
    {
      key: 'PICKED_UP',
      label: 'Picked Up',
      value: overview?.orders?.pickedUp ?? 0,
    },
    {
      key: 'DELIVERED',
      label: 'Delivered',
      value: overview?.orders?.delivered ?? 0,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Orders</h1>
            <p className="mt-2 text-slate-600">
              Sipariş operasyonları ve dispatch görünümü.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dispatch/queue"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              Dispatch Queue
            </Link>
            <Link
              href="/dispatch/logs"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              Dispatch Logs
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {statusCards.map((card) => {
            const href =
              card.key === 'ALL'
                ? `/orders${
                    selectedCourierId || fromDate || toDate
                      ? `?${new URLSearchParams(
                          Object.fromEntries(
                            Object.entries({
                              courierId: selectedCourierId,
                              from: fromDate,
                              to: toDate,
                            }).filter(([, v]) => v),
                          ),
                        ).toString()}`
                      : ''
                  }`
                : `/orders?${new URLSearchParams(
                    Object.fromEntries(
                      Object.entries({
                        status: card.key,
                        courierId: selectedCourierId,
                        from: fromDate,
                        to: toDate,
                      }).filter(([, v]) => v),
                    ),
                  ).toString()}`;

            const isActive = selectedStatus === card.key;

            return (
              <Link
                key={card.key}
                href={href}
                className={`rounded-2xl border p-4 shadow-sm transition ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-900 hover:shadow-md'
                }`}
              >
                <div
                  className={`text-xs ${
                    isActive ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {card.label}
                </div>
                <div className="mt-1 text-3xl font-semibold">{card.value}</div>
              </Link>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
              <p className="mt-1 text-sm text-slate-500">
                Tarih ve courier bazlı filtreleme yapabilirsin.
              </p>
            </div>

            <form
              action="/orders"
              method="GET"
              className="grid w-full grid-cols-1 gap-3 md:grid-cols-4 lg:max-w-4xl"
            >
              <input type="hidden" name="status" value={selectedStatus === 'ALL' ? '' : selectedStatus} />

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Courier
                </label>
                <select
                  name="courierId"
                  defaultValue={selectedCourierId}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                >
                  <option value="">All couriers</option>
                  {courierOptions.map((courier) => (
                    <option key={courier.id} value={courier.id}>
                      {courier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  From date
                </label>
                <input
                  type="date"
                  name="from"
                  defaultValue={fromDate}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  To date
                </label>
                <input
                  type="date"
                  name="to"
                  defaultValue={toDate}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Apply
                </button>

                <Link
                  href={selectedStatus === 'ALL' ? '/orders' : `/orders?status=${selectedStatus}`}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                >
                  Clear
                </Link>
              </div>
            </form>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {formatStatusLabel(selectedStatus)} Orders
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Toplam {filteredOrders.length} kayıt gösteriliyor.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Courier</th>
                  <th className="px-4 py-3 text-left">Ride</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Est. Delivery</th>
                  <th className="px-4 py-3 text-left">Actual Delivery</th>
                  <th className="px-4 py-3 text-left">Dispatch UX</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {order.externalRef ?? order.id}
                      </div>
                      <div className="text-xs text-slate-500">{order.id}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(
                          order.status,
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-700">
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
                        '-'
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {order.ride ? (
                        <div>
                          <div className="font-medium text-slate-900">
                            {order.ride.id}
                          </div>
                          <div className="text-xs text-slate-500">
                            {order.ride.status}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(order.createdAt)}
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
                        className="font-medium text-blue-600 hover:underline"
                      >
                        Explain / Compare / Assign
                      </Link>
                    </td>
                  </tr>
                ))}

                {filteredOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Filtrelere uygun order bulunamadı.
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