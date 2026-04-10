import Link from 'next/link';
import SimpleMap from '@/components/maps/simple-map';
import {
  apiFetch,
  approveAutoAssign,
  autoAssignOrder,
  manualAssignOrder,
  rejectRecommendation,
} from '@/lib/api';
import { getDirectionsPath } from '@/lib/maps/get-directions';
import { decodePolyline } from '@/lib/maps/decode-polyline';

type CandidateCourier = {
  courier: {
    id: string;
    name: string;
    phone: string;
    availabilityStatus?: string;
  };
  online?: boolean;
  recommendationScore: number;
  metrics?: {
    pickupDistanceM?: number | null;
    estimatedPickupEtaMinutes?: number | null;
    deliveredCountPriorityScore?: number;
    routeDistancePriorityScore?: number;
    distanceScore?: number;
    onlineScore?: number;
    freshnessScore?: number;
    activeRidePenalty?: number;
    activeRideOrderPenalty?: number;
    staleLocationPenalty?: number;
    missingLocationPenalty?: number;
  };
  dailyStats?: {
    deliveredCountToday?: number;
    totalRouteDistanceMetersToday?: number;
  };
  constraints?: {
    activeOrderCount?: number;
    activeStopCount?: number;
    detourMeters?: number;
    valid?: boolean;
    reasons?: string[];
  };
  activeRide?: {
    id: string;
    status: string;
    orderCount?: number;
  } | null;
  location?: {
    lat?: number | null;
    lng?: number | null;
    ts?: string | null;
    rideId?: string | null;
    ageSeconds?: number | null;
    source?: string;
    fresh?: boolean;
  };
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

type BatchSuggestion = {
  orderId?: string;
  order?: {
    id: string;
    externalRef?: string | null;
    status?: string;
    pickupAddress?: string | null;
    dropoffAddress?: string | null;
  };
  valid?: boolean;
  detour?: number;
  stopCount?: number;
  reasons?: string[];
  score?: number;
  batchScore?: number;
  insertionPreview?: {
    valid?: boolean;
    reasons?: string[];
    projectedStopCount?: number;
    projectedDetourMeters?: number;
    projectedSequence?: Array<{
      stopId: string;
      orderId: string;
      orderRef?: string | null;
      type: 'pickup' | 'dropoff';
      lat: number;
      lng: number;
      sequence: number;
    }>;
  };
  sequence?: Array<{
    stopId: string;
    orderId: string;
    orderRef?: string | null;
    type: 'pickup' | 'dropoff';
    lat: number;
    lng: number;
    sequence: number;
  }>;
};

type OrderDetailResponse = {
  id: string;
  externalRef?: string | null;
  status: string;

  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;

  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  pickupFormattedAddress?: string | null;
  dropoffFormattedAddress?: string | null;

  notes?: string | null;
  deliveryNote?: string | null;

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
      recommendedCourier: CandidateCourier | null;
      candidates: CandidateCourier[];
    };
    batchSuggestions?: {
      targetOrderId?: string;
      rules?: {
        maxStop?: number;
        maxDetour?: number;
      };
      suggestions?: BatchSuggestion[];
    };
  };

  dispatchLogs?: DispatchLogItem[];
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatMeters(value?: number | null) {
  if (value === null || value === undefined) return '-';
  return `${Math.round(value).toLocaleString()} m`;
}

function formatMinutes(value?: number | null) {
  if (value === null || value === undefined) return '-';
  return `${value} min`;
}

function yesNo(value?: boolean) {
  return value ? 'Yes' : 'No';
}

function getPickupLabel(order: OrderDetailResponse) {
  return (
    order.pickupFormattedAddress ||
    order.pickupAddress ||
    `${order.pickupLat}, ${order.pickupLng}`
  );
}

function getDropoffLabel(order: OrderDetailResponse) {
  return (
    order.dropoffFormattedAddress ||
    order.dropoffAddress ||
    `${order.dropoffLat}, ${order.dropoffLng}`
  );
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

  let routePath = [
    { lat: order.pickupLat, lng: order.pickupLng },
    { lat: order.dropoffLat, lng: order.dropoffLng },
  ];

  try {
    const encoded = await getDirectionsPath(
      { lat: order.pickupLat, lng: order.pickupLng },
      { lat: order.dropoffLat, lng: order.dropoffLng },
    );

    if (encoded) {
      routePath = decodePolyline(encoded);
    }
  } catch (error) {
    console.error('Directions fallback used', error);
  }

  const recommendation = order.dispatchPanel?.recommendation;
  const recommendedCourier = recommendation?.recommendedCourier ?? null;
  const candidates = recommendation?.candidates ?? [];
  const batchSuggestions = order.dispatchPanel?.batchSuggestions?.suggestions ?? [];
  const batchRules = order.dispatchPanel?.batchSuggestions?.rules;
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Address Details
            </h2>

            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Pickup Address
                </div>
                <div className="mt-1 text-slate-900">{getPickupLabel(order)}</div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Dropoff Address
                </div>
                <div className="mt-1 text-slate-900">{getDropoffLabel(order)}</div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Pickup Coordinates
                  </div>
                  <div className="mt-1 text-slate-900">
                    {order.pickupLat}, {order.pickupLng}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Dropoff Coordinates
                  </div>
                  <div className="mt-1 text-slate-900">
                    {order.dropoffLat}, {order.dropoffLng}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Order Map</h2>
            <p className="mt-2 text-sm text-slate-600">
              Pickup ve dropoff noktaları.
            </p>

            <div className="mt-4">
              <SimpleMap markers={orderMarkers} path={routePath} />
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

                <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-3">
                  <div>
                    <span className="font-medium text-slate-900">Delivered Today:</span>{' '}
                    {recommendedCourier.dailyStats?.deliveredCountToday ?? '-'}
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">Route Distance Today:</span>{' '}
                    {recommendedCourier.dailyStats?.totalRouteDistanceMetersToday ?? '-'} m
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">ETA:</span>{' '}
                    {formatMinutes(recommendedCourier.metrics?.estimatedPickupEtaMinutes)}
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-700">
                  <div className="mb-3 font-medium text-slate-900">
                    Score breakdown
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div>Pickup distance: {formatMeters(recommendedCourier.metrics?.pickupDistanceM)}</div>
                    <div>Online: {yesNo(recommendedCourier.online)}</div>
                    <div>Constraint valid: {yesNo(recommendedCourier.constraints?.valid)}</div>
                    <div>Detour: {formatMeters(recommendedCourier.constraints?.detourMeters)}</div>
                    <div>Active stop count: {recommendedCourier.constraints?.activeStopCount ?? '-'}</div>
                    <div>Reasons: {(recommendedCourier.constraints?.reasons ?? []).join(', ') || '-'}</div>
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
                      {candidate.dailyStats?.deliveredCountToday ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMeters(
                        candidate.dailyStats?.totalRouteDistanceMetersToday,
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMeters(candidate.metrics?.pickupDistanceM)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMinutes(candidate.metrics?.estimatedPickupEtaMinutes)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {yesNo(candidate.online)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {candidate.constraints?.valid
                        ? 'Valid'
                        : (candidate.constraints?.reasons ?? []).join(', ') || '-'}
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
                      colSpan={9}
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Batch Suggestions
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Bu order başka bir rotaya eklenirse olası sequence ve kurallar.
              </p>
            </div>

            <div className="text-sm text-slate-500">
              Max stop: {batchRules?.maxStop ?? '-'} · Max detour:{' '}
              {formatMeters(batchRules?.maxDetour)}
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {batchSuggestions.map((suggestion, index) => {
              const suggestionKey =
                suggestion.orderId ||
                suggestion.order?.id ||
                `batch-suggestion-${index}`;

              return (
                <div
                  key={suggestionKey}
                className={`rounded-2xl border p-5 ${
                  suggestion.valid
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-amber-200 bg-amber-50'
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">
                      Candidate Order: {suggestion.orderId}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          suggestion.valid
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {suggestion.valid ? 'VALID' : 'INVALID'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        Score: {suggestion.score ?? '-'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        Projected Stops: {suggestion.stopCount ?? '-'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        Detour: {formatMeters(suggestion.detour)}
                      </span>
                    </div>

                    <div className="mt-3 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Reasons:</span>{' '}
                      {(suggestion.reasons ?? []).length > 0
                        ? (suggestion.reasons ?? []).join(', ')
                        : 'No blocking reason'}
                    </div>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white/70 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-left">Seq</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-left">Order</th>
                        <th className="px-4 py-3 text-left">Coordinates</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(suggestion.sequence ?? []).map((stop, stopIndex) => (
                        <tr
                          key={
                            stop.stopId ||
                            `${suggestionKey}-${stop.orderId}-${stop.type}-${stopIndex}`
                          }
                          className="border-t border-slate-200/70"
                        >
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
                          <td className="px-4 py-3 text-slate-700">
                            {stop.orderId}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {stop.lat}, {stop.lng}
                          </td>
                        </tr>
                      ))}

                      {(suggestion.sequence ?? []).length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-6 text-center text-slate-500"
                          >
                            Sequence preview not available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              );
            })}

            {batchSuggestions.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No batch suggestions found.
              </div>
            )}
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Notes</h2>

            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Order Notes
                </div>
                <div className="mt-1 text-slate-900">{order.notes ?? '-'}</div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Delivery Note
                </div>
                <div className="mt-1 text-slate-900">
                  {order.deliveryNote ?? '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Current Courier Snapshot
            </h2>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div>
                <span className="font-medium text-slate-900">Courier:</span>{' '}
                {order.courier?.name ?? '-'}
              </div>
              <div>
                <span className="font-medium text-slate-900">Phone:</span>{' '}
                {order.courier?.phone ?? '-'}
              </div>
              <div>
                <span className="font-medium text-slate-900">Availability:</span>{' '}
                {order.courier?.availabilityStatus ?? '-'}
              </div>
              <div>
                <span className="font-medium text-slate-900">Last Seen:</span>{' '}
                {formatDate(order.courier?.lastSeenAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}