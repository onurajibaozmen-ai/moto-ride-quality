import Link from 'next/link';
import { fetchJson } from '@/lib/api';

type CourierScoreResponse = {
  courier: {
    id: string;
    name: string;
    phone: string;
    isActive?: boolean;
    lastSeenAt?: string | null;
    availabilityStatus?: string;
    availabilityUpdatedAt?: string | null;
  };
  analytics?: {
    totalRides: number;
    activeRideCount: number;
    totalDeliveredOrders: number;
    deliveredCountToday: number;
    totalRouteDistanceMetersToday: number;
    onTimePickupCount: number;
    onTimeDeliveryCount: number;
  };
  recentRides?: Array<{
    id: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    score: number | null;
    orderCount: number;
  }>;
  recentDeliveredOrders?: Array<{
    id: string;
    externalRef: string | null;
    estimatedPickupTime?: string | null;
    estimatedDeliveryTime?: string | null;
    actualPickupTime?: string | null;
    actualDeliveryTime?: string | null;
    deliveredAt?: string | null;
    routeDistanceMeters?: number | null;
  }>;

  // Eski shape ile uyumluluk için opsiyonel bırakıldı
  summary?: {
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
  score?: {
    drivingScore: number | null;
    punctualityScore: number | null;
    deliveryEfficiencyScore: number | null;
    multiOrderScore: number | null;
    overallScore: number | null;
    version: string;
  };
  recent?: {
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

function buildDerivedView(data: CourierScoreResponse) {
  // Yeni backend shape varsa onu kullan
  if (data.analytics) {
    const totalDeliveredOrders = data.analytics.totalDeliveredOrders ?? 0;
    const onTimeDeliveredOrders = data.analytics.onTimeDeliveryCount ?? 0;
    const onTimeDeliveryRate =
      totalDeliveredOrders > 0
        ? (onTimeDeliveredOrders / totalDeliveredOrders) * 100
        : null;

    const recentOrders =
      data.recentDeliveredOrders?.map((order) => {
        let deliveryDelaySeconds: number | null = null;

        if (order.estimatedDeliveryTime && order.actualDeliveryTime) {
          deliveryDelaySeconds = Math.round(
            (new Date(order.actualDeliveryTime).getTime() -
              new Date(order.estimatedDeliveryTime).getTime()) /
              1000,
          );
        }

        let deliveryEtaStatus = 'unknown';
        if (deliveryDelaySeconds === null) deliveryEtaStatus = 'unknown';
        else if (deliveryDelaySeconds > 0) deliveryEtaStatus = 'late';
        else if (deliveryDelaySeconds < 0) deliveryEtaStatus = 'early';
        else deliveryEtaStatus = 'on_time';

        return {
          id: order.id,
          externalRef: order.externalRef ?? null,
          status: 'DELIVERED',
          estimatedDeliveryTime: order.estimatedDeliveryTime ?? null,
          actualDeliveryTime: order.actualDeliveryTime ?? null,
          metrics: {
            deliveryDelaySeconds,
            deliveryEtaStatus,
            onTimeDelivery:
              deliveryDelaySeconds === null ? null : deliveryDelaySeconds <= 0,
          },
        };
      }) ?? [];

    return {
      summary: {
        totalCompletedRides: data.analytics.totalRides ?? 0,
        totalAssignedOrders: totalDeliveredOrders,
        totalDeliveredOrders,
        onTimeDeliveredOrders,
        onTimeDeliveryRate,
        averageRideScore: null,
        averageDeliveryDelaySeconds: null,
        deliveredOrdersPerRide: null,
        multiOrderRideCount: 0,
        multiOrderRate: null,
        averageOrdersPerRide: null,
      },
      score: {
        drivingScore: null,
        punctualityScore: null,
        deliveryEfficiencyScore: null,
        multiOrderScore: null,
        overallScore: null,
        version: 'm15-dashboard-compat',
      },
      recent: {
        rides:
          data.recentRides?.map((ride) => ({
            id: ride.id,
            startedAt: ride.startedAt ?? '',
            endedAt: ride.endedAt ?? null,
            status: ride.status,
            score: ride.score,
            totalDistanceM: null,
            durationS: null,
          })) ?? [],
        orders: recentOrders,
      },
    };
  }

  // Eski shape varsa direkt onu kullan
  return {
    summary: data.summary ?? {
      totalCompletedRides: 0,
      totalAssignedOrders: 0,
      totalDeliveredOrders: 0,
      onTimeDeliveredOrders: 0,
      onTimeDeliveryRate: null,
      averageRideScore: null,
      averageDeliveryDelaySeconds: null,
      deliveredOrdersPerRide: null,
      multiOrderRideCount: 0,
      multiOrderRate: null,
      averageOrdersPerRide: null,
    },
    score: data.score ?? {
      drivingScore: null,
      punctualityScore: null,
      deliveryEfficiencyScore: null,
      multiOrderScore: null,
      overallScore: null,
      version: 'legacy',
    },
    recent: data.recent ?? {
      rides: [],
      orders: [],
    },
  };
}

export default async function CourierDetailPage(
  props: PageProps<'/couriers/[id]'>
) {
  const { id } = await props.params;

  // DÜZELTME: /score değil /scoring
  const data = (await fetchJson(
    `/dashboard/couriers/${id}/scoring`,
  )) as CourierScoreResponse;

  const view = buildDerivedView(data);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Link href="/couriers" className="text-sm text-blue-600 hover:underline">
            ← Back to couriers
          </Link>
          <div className="mt-2 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Courier Score Detail
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {data.courier.name} • {data.courier.phone}
              </p>
            </div>

            <Link
              href={`/couriers/${id}/scoring`}
              className="text-sm text-blue-600 hover:underline"
            >
              Open scoring page
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Overall Score</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {formatScore(view.score.overallScore)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Driving</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {formatScore(view.score.drivingScore)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Punctuality</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {formatScore(view.score.punctualityScore)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Delivery Efficiency</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {formatScore(view.score.deliveryEfficiencyScore)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Multi-order</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {formatScore(view.score.multiOrderScore)}
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
                  {view.summary.totalCompletedRides}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Assigned Orders</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {view.summary.totalAssignedOrders}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Delivered Orders</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {view.summary.totalDeliveredOrders}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">On-Time Delivery Rate</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {view.summary.onTimeDeliveryRate !== null
                    ? `${view.summary.onTimeDeliveryRate.toFixed(2)}%`
                    : '-'}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Avg Ride Score</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {formatScore(view.summary.averageRideScore)}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Avg Delivery Delay</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {formatDelay(view.summary.averageDeliveryDelaySeconds)}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Delivered Orders / Ride</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {view.summary.deliveredOrdersPerRide ?? '-'}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Avg Orders / Ride</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {view.summary.averageOrdersPerRide ?? '-'}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Multi-order Ride Count</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {view.summary.multiOrderRideCount}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Multi-order Rate</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {view.summary.multiOrderRate !== null
                    ? `${view.summary.multiOrderRate.toFixed(2)}%`
                    : '-'}
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Score version: {view.score.version}
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
                  {view.recent.orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No recent orders.
                      </td>
                    </tr>
                  ) : (
                    view.recent.orders.map((order) => (
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
                {view.recent.rides.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No recent rides.
                    </td>
                  </tr>
                ) : (
                  view.recent.rides.map((ride) => (
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

        {data.analytics && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Live Courier Stats</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div>
                <div className="text-sm text-slate-500">Availability</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {data.courier.availabilityStatus ?? '-'}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Delivered Today</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {data.analytics.deliveredCountToday}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Route Distance Today</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {data.analytics.totalRouteDistanceMetersToday} m
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Active Ride Count</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {data.analytics.activeRideCount}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}