import Link from 'next/link';
import { fetchJson } from '@/lib/api';

type RideDetailResponse = {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  totalDistanceM: number | null;
  durationS: number | null;
  score: number | null;
  scoreVersion: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    phone: string;
  };
  analytics: {
    id: string;
    rideId: string;
    sampleCount: number;
    validPointCount: number;
    gpsGapCount: number;
    lowAccuracyCount: number;
    movingSeconds: number;
    idleSeconds: number;
    totalDistanceM: number;
    avgSpeedKmh: number | null;
    p95SpeedKmh: number | null;
    maxSpeedKmh: number | null;
    medianAccuracyM: number | null;
    qualityScore: number | null;
    qualityFlags: unknown;
    createdAt: string;
    updatedAt: string;
  } | null;
  scoreCard: {
    id: string;
    rideId: string;
    totalScore: number;
    safetyScore: number | null;
    complianceScore: number | null;
    smoothnessScore: number | null;
    efficiencyScore: number | null;
    confidenceLevel: string;
    scoringVersion: string;
    breakdownJson: unknown;
    createdAt: string;
    updatedAt: string;
  } | null;
  telemetryPoints: Array<{
    id: string;
    ts: string;
    lat: number;
    lng: number;
    speedKmh: number | null;
    accuracyM: number | null;
    heading: number | null;
    accelX: number | null;
    accelY: number | null;
    accelZ: number | null;
  }>;
  rideEvents: Array<{
    id: string;
    type: string;
    ts: string;
    lat: number | null;
    lng: number | null;
    severity: number | null;
    metaJson: unknown;
  }>;
  orders: Array<{
    id: string;
    externalRef: string | null;
    status: string;
    estimatedPickupTime: string | null;
    estimatedDeliveryTime: string | null;
    actualPickupTime: string | null;
    actualDeliveryTime: string | null;
  }>;
};

function formatDuration(seconds: number | null | undefined) {
  if (typeof seconds !== 'number') return '-';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export default async function RideDetailPage(
  props: PageProps<'/rides/[id]'>
) {
  const { id } = await props.params;

  const data = (await fetchJson(`/dashboard/rides/${id}/detail`)) as RideDetailResponse;

  const flags = Array.isArray(data?.analytics?.qualityFlags)
    ? data.analytics!.qualityFlags.filter(
        (item): item is string => typeof item === 'string',
      )
    : [];

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/rides" className="text-sm text-blue-600 hover:underline">
              ← Back to rides
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              Ride Detail
            </h1>
            <p className="mt-1 font-mono text-xs text-slate-500">{data?.id}</p>
          </div>

          <div className="md:pt-1">
            <Link
              href={`/rides/${id}/plan`}
              className="inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              View Route Plan
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Score</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {typeof data?.score === 'number' ? data.score.toFixed(2) : '-'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Distance</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {typeof data?.totalDistanceM === 'number'
                ? `${(data.totalDistanceM / 1000).toFixed(2)} km`
                : '-'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Duration</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {formatDuration(data?.durationS)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Confidence</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {data?.scoreCard?.confidenceLevel ?? '-'}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Ride Summary</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-slate-500">Courier</div>
                <div className="mt-1 font-medium text-slate-900">
                  {data?.user?.name ?? '-'}
                </div>
                <div className="text-sm text-slate-500">{data?.user?.phone ?? '-'}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Status</div>
                <div className="mt-1 font-medium text-slate-900">
                  {data?.status ?? '-'}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Started</div>
                <div className="mt-1 text-slate-900">{formatDate(data?.startedAt)}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Ended</div>
                <div className="mt-1 text-slate-900">{formatDate(data?.endedAt)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Score Breakdown</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Safety</span>
                <span className="font-medium text-slate-900">
                  {typeof data?.scoreCard?.safetyScore === 'number'
                    ? data.scoreCard.safetyScore.toFixed(2)
                    : '-'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Compliance</span>
                <span className="font-medium text-slate-900">
                  {typeof data?.scoreCard?.complianceScore === 'number'
                    ? data.scoreCard.complianceScore.toFixed(2)
                    : '-'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Smoothness</span>
                <span className="font-medium text-slate-900">
                  {typeof data?.scoreCard?.smoothnessScore === 'number'
                    ? data.scoreCard.smoothnessScore.toFixed(2)
                    : '-'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Efficiency</span>
                <span className="font-medium text-slate-900">
                  {typeof data?.scoreCard?.efficiencyScore === 'number'
                    ? data.scoreCard.efficiencyScore.toFixed(2)
                    : '-'}
                </span>
              </div>

              <div className="pt-2 text-xs text-slate-500">
                Version: {data?.scoreCard?.scoringVersion ?? '-'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Analytics</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-slate-500">Quality Score</div>
                <div className="mt-1 font-medium text-slate-900">
                  {typeof data?.analytics?.qualityScore === 'number'
                    ? data.analytics.qualityScore.toFixed(3)
                    : '-'}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-slate-500">Avg Speed</div>
                <div className="mt-1 font-medium text-slate-900">
                  {typeof data?.analytics?.avgSpeedKmh === 'number'
                    ? `${data.analytics.avgSpeedKmh.toFixed(2)} km/h`
                    : '-'}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-slate-500">P95 Speed</div>
                <div className="mt-1 font-medium text-slate-900">
                  {typeof data?.analytics?.p95SpeedKmh === 'number'
                    ? `${data.analytics.p95SpeedKmh.toFixed(2)} km/h`
                    : '-'}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-slate-500">Max Speed</div>
                <div className="mt-1 font-medium text-slate-900">
                  {typeof data?.analytics?.maxSpeedKmh === 'number'
                    ? `${data.analytics.maxSpeedKmh.toFixed(2)} km/h`
                    : '-'}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-slate-500">Moving Time</div>
                <div className="mt-1 font-medium text-slate-900">
                  {formatDuration(data?.analytics?.movingSeconds)}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-slate-500">Idle Time</div>
                <div className="mt-1 font-medium text-slate-900">
                  {formatDuration(data?.analytics?.idleSeconds)}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-sm text-slate-500">Quality Flags</div>
              <div className="flex flex-wrap gap-2">
                {flags.length === 0 ? (
                  <span className="text-sm text-slate-500">No flags</span>
                ) : (
                  flags.map((flag) => (
                    <span
                      key={flag}
                      className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
                    >
                      {flag}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Orders</h2>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Est. Delivery</th>
                    <th className="px-4 py-3">Actual Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                        No orders linked to this ride.
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
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Events</h2>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Lat</th>
                  <th className="px-4 py-3">Lng</th>
                </tr>
              </thead>
              <tbody>
                {data.rideEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No events found.
                    </td>
                  </tr>
                ) : (
                  data.rideEvents.map((event) => (
                    <tr key={event.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-900">{event.type}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(event.ts)}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {typeof event.severity === 'number'
                          ? event.severity.toFixed(2)
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {typeof event.lat === 'number' ? event.lat.toFixed(5) : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {typeof event.lng === 'number' ? event.lng.toFixed(5) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Telemetry Points</h2>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Lat</th>
                  <th className="px-4 py-3">Lng</th>
                  <th className="px-4 py-3">Speed</th>
                  <th className="px-4 py-3">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {data.telemetryPoints.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No telemetry points found.
                    </td>
                  </tr>
                ) : (
                  data.telemetryPoints.slice(0, 100).map((point) => (
                    <tr key={point.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-700">{formatDate(point.ts)}</td>
                      <td className="px-4 py-3 text-slate-700">{point.lat.toFixed(5)}</td>
                      <td className="px-4 py-3 text-slate-700">{point.lng.toFixed(5)}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {typeof point.speedKmh === 'number'
                          ? `${point.speedKmh.toFixed(2)} km/h`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {typeof point.accuracyM === 'number'
                          ? `${point.accuracyM.toFixed(2)} m`
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {data.telemetryPoints.length > 100 && (
            <div className="mt-3 text-xs text-slate-500">
              Showing first 100 telemetry points.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}