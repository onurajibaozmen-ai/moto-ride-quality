import Link from 'next/link';
import { fetchJson } from '@/lib/api';

type CourierScoreResponse = {
  courier: {
    id: string;
    name: string;
    phone: string;
    role: string;
  };
  summary: {
    totalCompletedRides: number;
    totalAssignedOrders: number;
    totalDeliveredOrders: number;
    onTimeDeliveredOrders: number;
    onTimeDeliveryRate: number | null;
    averageRideScore: number | null;
    averageDeliveryDelaySeconds: number | null;
    deliveredOrdersPerRide: number | null;
    multiOrderRideCount: number;
    multiOrderRate: number | null;
    averageOrdersPerRide: number | null;
  };
  score: {
    drivingScore: number | null;
    punctualityScore: number | null;
    deliveryEfficiencyScore: number | null;
    multiOrderScore: number | null;
    overallScore: number | null;
    version: string;
  };
  recent: {
    rides: Array<{
      id: string;
      startedAt: string;
      endedAt: string | null;
      status: string;
      score: number | null;
      totalDistanceM: number | null;
      durationS: number | null;
    }>;
    orders: Array<{
      id: string;
      externalRef: string | null;
      status: string;
      estimatedDeliveryTime: string | null;
      actualDeliveryTime: string | null;
      metrics: {
        deliveryDelaySeconds: number | null;
        deliveryEtaStatus: string;
        onTimeDelivery: boolean | null;
      };
    }>;
  };
};

function formatScore(value: number | null | undefined) {
  return typeof value === 'number' ? value.toFixed(2) : '-';
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : '-';
}

function formatDelay(seconds: number | null | undefined) {
  if (typeof seconds !== 'number') return '-';
  const abs = Math.abs(seconds);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  const sign = seconds > 0 ? '+' : seconds < 0 ? '-' : '';
  return `${sign}${mins}m ${secs}s`;
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

export default async function CourierDetailPage(
  props: PageProps<'/couriers/[id]'>
) {
  const { id } = await props.params;
  const data = (await fetchJson(`/dashboard/couriers/${id}/score`)) as CourierScoreResponse;

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Link href="/couriers" className="text-sm text-blue-600 hover:underline">
            ← Back to couriers
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Courier Score Detail
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {data.courier.name} • {data.courier.phone}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Overall Score</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {formatScore(data.score.overallScore)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Driving</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {formatScore(data.score.drivingScore)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Punctuality</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {formatScore(data.score.punctualityScore)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Delivery Efficiency</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {formatScore(data.score.deliveryEfficiencyScore)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Multi-order</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {formatScore(data.score.multiOrderScore)}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Operational Summary</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-slate-500">Completed Rides</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {data.summary.totalCompletedRides}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Assigned Orders</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {data.summary.totalAssignedOrders}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Delivered Orders</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {data.summary.totalDeliveredOrders}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">On-Time Delivery Rate</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {data.summary.onTimeDeliveryRate !== null
                    ? `${data.summary.onTimeDeliveryRate.toFixed(2)}%`
                    : '-'}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Avg Ride Score</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {formatScore(data.summary.averageRideScore)}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Avg Delivery Delay</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {formatDelay(data.summary.averageDeliveryDelaySeconds)}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Delivered Orders / Ride</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {data.summary.deliveredOrdersPerRide ?? '-'}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Avg Orders / Ride</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {data.summary.averageOrdersPerRide ?? '-'}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Multi-order Ride Count</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {data.summary.multiOrderRideCount}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Multi-order Rate</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {data.summary.multiOrderRate !== null
                    ? `${data.summary.multiOrderRate.toFixed(2)}%`
                    : '-'}
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Score version: {data.score.version}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actual Delivery</th>
                    <th className="px-4 py-3">Delay</th>
                    <th className="px-4 py-3">ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No recent orders.
                      </td>
                    </tr>
                  ) : (
                    data.recent.orders.map((order) => (
                      <tr key={order.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-mono text-xs text-slate-900">
                          {order.externalRef ?? order.id}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{order.status}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDate(order.actualDeliveryTime)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDelay(order.metrics.deliveryDelaySeconds)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${etaBadgeClass(
                              order.metrics.deliveryEtaStatus,
                            )}`}
                          >
                            {order.metrics.deliveryEtaStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent Rides</h2>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ride</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Ended</th>
                  <th className="px-4 py-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.rides.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No recent rides.
                    </td>
                  </tr>
                ) : (
                  data.recent.rides.map((ride) => (
                    <tr key={ride.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <Link
                          href={`/rides/${ride.id}`}
                          className="font-mono text-xs text-blue-600 hover:underline"
                        >
                          {ride.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{ride.status}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDate(ride.startedAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDate(ride.endedAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatScore(ride.score)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}