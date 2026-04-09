import SimpleMap from '@/components/maps/simple-map';
import Link from 'next/link';
import {
  apiFetch,
  approveAutoAssign,
  autoAssignOrder,
  manualAssignOrder,
  rejectRecommendation,
} from '@/lib/api';


type OrderDetailResponse = {
  id: string;
  externalRef?: string | null;
  status: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  notes?: string | null;
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
    lastSeenAt?: string | null;
    availabilityStatus?: string;
    availabilityUpdatedAt?: string | null;
  } | null;
  ride?: {
    id: string;
    status: string;
    startedAt?: string | null;
    endedAt?: string | null;
    score?: number | null;
  } | null;
  dispatchPanel?: {
    order: {
      id: string;
      externalRef?: string | null;
      status: string;
      assignedCourierId?: string | null;
      rideId?: string | null;
      pickupLat: number;
      pickupLng: number;
      dropoffLat: number;
      dropoffLng: number;
    };
    currentAssignment: {
      courier: {
        id: string;
        name: string;
        phone: string;
        availabilityStatus?: string;
      };
      ride: {
        id: string;
        status: string;
        startedAt?: string | null;
      } | null;
    } | null;
    recommendation: {
      ruleEngine?: {
        name: string;
        priorityOrder: string[];
      };
      recommendedCourier: CandidateCourier | null;
      candidates: CandidateCourier[];
    };
    batchSuggestions: {
      suggestions: BatchSuggestion[];
    };
  };
  dispatchLogs?: DispatchLogItem[];
};

type CandidateCourier = {
  courier: {
    id: string;
    name: string;
    phone: string;
    lastSeenAt?: string | null;
    availabilityStatus?: string;
  };
  online: boolean;
  activeRide: {
    id: string;
    status: string;
    orderCount: number;
  } | null;
  location: {
    lat: number | null;
    lng: number | null;
    ts: string | null;
    rideId: string | null;
    ageSeconds: number | null;
    source: string;
    fresh: boolean;
  };
  dailyStats: {
    deliveredCountToday: number;
    totalRouteDistanceMetersToday: number;
  };
  constraints: {
    activeOrderCount: number;
    activeStopCount: number;
    detourMeters: number;
    valid: boolean;
    reasons: string[];
  };
  metrics: {
    pickupDistanceM: number | null;
    estimatedPickupEtaMinutes: number | null;
    deliveredCountPriorityScore: number;
    routeDistancePriorityScore: number;
    distanceScore: number;
    onlineScore: number;
    freshnessScore: number;
    activeRidePenalty: number;
    activeRideOrderPenalty: number;
    staleLocationPenalty: number;
    missingLocationPenalty: number;
    availabilityStatus?: string;
    recommendationReason?: {
      basedOn: string;
      deliveredCountToday: number;
      totalRouteDistanceMetersToday: number;
      hasFreshLocation: boolean;
      online: boolean;
      hasActiveRide: boolean;
    };
  };
  recommendationScore: number;
};

type BatchSuggestion = {
  order: {
    id: string;
    externalRef?: string | null;
    status: string;
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
  };
  metrics: {
    pickupDistanceM: number;
    dropoffDistanceM: number;
    averageDistanceM: number;
  };
  batchScore: number;
};

type DispatchLogItem = {
  id: string;
  orderId: string;
  recommendedCourierId: string | null;
  status: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
  recommendedCourier: {
    id: string;
    name: string;
    phone: string;
    availabilityStatus: string;
  } | null;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatMeters(value?: number | null) {
  if (value === null || value === undefined) return '-';
  return `${value} m`;
}

function formatMinutes(value?: number | null) {
  if (value === null || value === undefined) return '-';
  return `${value} min`;
}

function yesNo(value?: boolean) {
  return value ? 'Yes' : 'No';
}

async function getOrderDetail(id: string): Promise<OrderDetailResponse | null> {
  try {
    return await apiFetch<OrderDetailResponse>(`/dashboard/orders/${id}`);
  } catch (error) {
    console.error('Failed to fetch order detail', error);
    return null;
  }
}

async function triggerAutoAssign(orderId: string) {
  'use server';

  try {
    await autoAssignOrder(orderId);
  } catch (error) {
    console.error('Auto assign failed', error);
  }
}

async function triggerApproveAutoAssign(orderId: string) {
  'use server';

  try {
    await approveAutoAssign(orderId);
  } catch (error) {
    console.error('Approve auto assign failed', error);
  }
}

async function triggerRejectRecommendation(orderId: string, courierId?: string) {
  'use server';

  try {
    await rejectRecommendation(orderId, {
      rejectedCourierId: courierId,
      reason: 'ops_manual_reject',
    });
  } catch (error) {
    console.error('Reject recommendation failed', error);
  }
}

async function triggerManualAssign(
  orderId: string,
  courierId: string,
  rideId?: string | null,
) {
  'use server';

  try {
    await manualAssignOrder(orderId, {
      courierId,
      rideId: rideId ?? undefined,
    });
  } catch (error) {
    console.error('Manual assign failed', error);
  }
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderDetail(id);

  if (!order) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              Order not found
            </h1>
            <p className="mt-2 text-slate-600">Sipariş detayı alınamadı.</p>
            <Link
              href="/orders"
              className="mt-4 inline-block text-blue-600 hover:underline"
            >
              Back to orders
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const orderMarkers = [
    {
      id: 'pickup',
      lat: order.pickupLat,
      lng: order.pickupLng,
      label: 'P',
      title: 'Pickup',
    },
    {
      id: 'dropoff',
      lat: order.dropoffLat,
      lng: order.dropoffLng,
      label: 'D',
      title: 'Dropoff',
    },
  ];

  const recommendation = order.dispatchPanel?.recommendation;
  const recommendedCourier = recommendation?.recommendedCourier ?? null;
  const candidates = recommendation?.candidates ?? [];
  const suggestions = order.dispatchPanel?.batchSuggestions?.suggestions ?? [];
  const dispatchLogs = order.dispatchLogs ?? [];

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Order Detail</h1>
            <p className="mt-2 text-slate-600">{order.externalRef ?? order.id}</p>
          </div>
          <Link href="/orders" className="text-blue-600 hover:underline">
            Back to orders
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Status</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {order.status}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Assigned At</div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {formatDate(order.assignedAt)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Estimated Delivery</div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {formatDate(order.estimatedDeliveryTime)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Actual Delivery</div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {formatDate(order.actualDeliveryTime)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Current Assignment
            </h2>

            {order.dispatchPanel?.currentAssignment ? (
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <div>
                  <span className="font-medium text-slate-900">Courier:</span>{' '}
                  {order.dispatchPanel.currentAssignment.courier.name}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Phone:</span>{' '}
                  {order.dispatchPanel.currentAssignment.courier.phone}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Availability:</span>{' '}
                  {order.dispatchPanel.currentAssignment.courier.availabilityStatus ??
                    '-'}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Ride:</span>{' '}
                  {order.dispatchPanel.currentAssignment.ride?.id ?? '-'}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No courier assigned yet.
              </p>
            )}

            <div className="mt-6 space-y-3">
              <form action={triggerAutoAssign.bind(null, order.id)}>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Auto Assign
                </button>
              </form>

              <form action={triggerApproveAutoAssign.bind(null, order.id)}>
                <button
                  type="submit"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
                >
                  Approve Auto Assign
                </button>
              </form>

              <form
                action={triggerRejectRecommendation.bind(
                  null,
                  order.id,
                  recommendedCourier?.courier.id,
                )}
              >
                <button
                  type="submit"
                  className="w-full rounded-xl border border-red-300 bg-white px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Reject Current Recommendation
                </button>
              </form>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Recommended Courier
            </h2>

            {recommendedCourier ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">
                      {recommendedCourier.courier.name}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {recommendedCourier.courier.phone}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Score</div>
                    <div className="text-2xl font-bold text-emerald-700">
                      {recommendedCourier.recommendationScore}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 text-sm text-slate-700">
                  <div>
                    <span className="font-medium text-slate-900">Delivered Today:</span>{' '}
                    {recommendedCourier.dailyStats.deliveredCountToday}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">Route Distance Today:</span>{' '}
                    {recommendedCourier.dailyStats.totalRouteDistanceMetersToday} m
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">ETA:</span>{' '}
                    {formatMinutes(recommendedCourier.metrics.estimatedPickupEtaMinutes)}
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-700">
                  <div className="font-medium text-slate-900 mb-3">
                    Why this courier was selected
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div>
                      <span className="font-medium text-slate-900">Engine:</span>{' '}
                      {recommendedCourier.metrics.recommendationReason?.basedOn ?? '-'}
                    </div>
                    <div>
                      <span className="font-medium text-slate-900">Fresh location:</span>{' '}
                      {yesNo(
                        recommendedCourier.metrics.recommendationReason
                          ?.hasFreshLocation,
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-slate-900">Online:</span>{' '}
                      {yesNo(
                        recommendedCourier.metrics.recommendationReason?.online,
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-slate-900">Has active ride:</span>{' '}
                      {yesNo(
                        recommendedCourier.metrics.recommendationReason
                          ?.hasActiveRide,
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-slate-900">Pickup distance:</span>{' '}
                      {formatMeters(recommendedCourier.metrics.pickupDistanceM)}
                    </div>
                    <div>
                      <span className="font-medium text-slate-900">Detour:</span>{' '}
                      {formatMeters(recommendedCourier.constraints.detourMeters)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-700">
                  <div className="font-medium text-slate-900 mb-3">
                    Score breakdown
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div>Delivered count priority: {recommendedCourier.metrics.deliveredCountPriorityScore}</div>
                    <div>Route distance priority: {recommendedCourier.metrics.routeDistancePriorityScore}</div>
                    <div>Distance score: {recommendedCourier.metrics.distanceScore}</div>
                    <div>Online score: {recommendedCourier.metrics.onlineScore}</div>
                    <div>Freshness score: {recommendedCourier.metrics.freshnessScore}</div>
                    <div>Active ride penalty: -{recommendedCourier.metrics.activeRidePenalty}</div>
                    <div>Active ride order penalty: -{recommendedCourier.metrics.activeRideOrderPenalty}</div>
                    <div>Stale location penalty: -{recommendedCourier.metrics.staleLocationPenalty}</div>
                    <div>Missing location penalty: -{recommendedCourier.metrics.missingLocationPenalty}</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No recommendation available.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Candidate Compare View
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Courier</th>
                  <th className="px-4 py-3 text-left">Delivered Today</th>
                  <th className="px-4 py-3 text-left">Route Distance</th>
                  <th className="px-4 py-3 text-left">Pickup Distance</th>
                  <th className="px-4 py-3 text-left">ETA</th>
                  <th className="px-4 py-3 text-left">Online</th>
                  <th className="px-4 py-3 text-left">Fresh Location</th>
                  <th className="px-4 py-3 text-left">Constraints</th>
                  <th className="px-4 py-3 text-left">Score</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr
                    key={candidate.courier.id}
                    className="border-t border-slate-200"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {candidate.courier.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {candidate.courier.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {candidate.dailyStats.deliveredCountToday}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMeters(
                        candidate.dailyStats.totalRouteDistanceMetersToday,
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMeters(candidate.metrics.pickupDistanceM)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMinutes(candidate.metrics.estimatedPickupEtaMinutes)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {yesNo(candidate.online)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {yesNo(candidate.location.fresh)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {candidate.constraints.valid
                        ? 'Valid'
                        : candidate.constraints.reasons.join(', ')}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {candidate.recommendationScore}
                    </td>
                    <td className="px-4 py-3">
                      <form
                        action={triggerManualAssign.bind(
                          null,
                          order.id,
                          candidate.courier.id,
                          candidate.activeRide?.id,
                        )}
                      >
                        <button
                          type="submit"
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 hover:bg-slate-50"
                        >
                          Assign to this candidate
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}

                {candidates.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No candidates found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Order Map</h2>
          <p className="mt-2 text-sm text-slate-600">
            Pickup ve dropoff noktaları.
          </p>

          <div className="mt-4">
            <SimpleMap
              markers={orderMarkers}
              path={[
                { lat: order.pickupLat, lng: order.pickupLng },
                { lat: order.dropoffLat, lng: order.dropoffLng },
              ]}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Dispatch History
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Recommended Courier</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                  <th className="px-4 py-3 text-left">Created At</th>
                </tr>
              </thead>
              <tbody>
                {dispatchLogs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-700">{log.status}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.recommendedCourier
                        ? `${log.recommendedCourier.name} (${log.recommendedCourier.phone})`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.reason ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))}

                {dispatchLogs.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No dispatch logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Batch Suggestions
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Pickup Distance</th>
                  <th className="px-4 py-3 text-left">Dropoff Distance</th>
                  <th className="px-4 py-3 text-left">Avg Distance</th>
                  <th className="px-4 py-3 text-left">Batch Score</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((suggestion) => (
                  <tr
                    key={suggestion.order.id}
                    className="border-t border-slate-200"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {suggestion.order.externalRef ?? suggestion.order.id}
                      </div>
                      <div className="text-xs text-slate-500">
                        {suggestion.order.id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {suggestion.order.status}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {suggestion.metrics.pickupDistanceM}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {suggestion.metrics.dropoffDistanceM}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {suggestion.metrics.averageDistanceM}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {suggestion.batchScore}
                    </td>
                  </tr>
                ))}

                {suggestions.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No batch suggestions found.
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