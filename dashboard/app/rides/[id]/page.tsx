import Link from 'next/link';
import { fetchJson } from '@/lib/api';
import RideMapPanel from '../../../components/ride-map-panel';

type RideDetailResponse = {
  ride: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    durationS: number | null;
    totalDistanceM: number | null;
    score: number | null;
    scoreVersion: string | null;
  };
  courier: {
    id: string;
    name: string;
    phone: string;
  };
  analytics: {
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
  } | null;
  scoreCard: {
    totalScore: number;
    safetyScore: number | null;
    complianceScore: number | null;
    smoothnessScore: number | null;
    efficiencyScore: number | null;
    confidenceLevel: string;
    scoringVersion: string;
    breakdownJson: unknown;
  } | null;
  events: Array<{
    id: string;
    type: string;
    ts: string;
    lat: number | null;
    lng: number | null;
    severity: number | null;
  }>;
  telemetry: Array<{
    ts: string;
    lat: number;
    lng: number;
    speedKmh: number | null;
    accuracyM: number | null;
    heading: number | null;
  }>;
  insights: Array<{
    code: string;
    level: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
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

export default async function RideDetailPage(
  props: PageProps<'/rides/[id]'>
) {
  const { id } = await props.params;
  const data = (await fetchJson(`/rides/${id}/detail`)) as RideDetailResponse;

  const flags = Array.isArray(data?.analytics?.qualityFlags)
    ? data.analytics.qualityFlags.filter(
        (item): item is string => typeof item === 'string'
      )
    : [];

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/rides" className="text-sm text-blue-600 hover:underline">
              ← Back to rides
            </Link>
            <Link
              href={`/rides/${id}/plan`}
              className="inline-block rounded-lg bg-black px-4 py-2 text-white text-sm hover:opacity-90"
            >
              View Route Plan
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              Ride Detail
            </h1>
            <p className="mt-1 font-mono text-xs text-slate-500">{data?.ride?.id}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Score</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {typeof data?.ride?.score === 'number' ? data.ride.score.toFixed(2) : '-'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Distance</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {typeof data?.ride?.totalDistanceM === 'number'
                ? `${(data.ride.totalDistanceM / 1000).toFixed(2)} km`
                : '-'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Duration</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {formatDuration(data?.ride?.durationS)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Confidence</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {data?.scoreCard?.confidenceLevel ?? '-'}
            </div>
          </div>
        </div>

        <RideMapPanel telemetry={data?.telemetry ?? []} events={data?.events ?? []} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Ride Summary</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-slate-500">Courier</div>
                <div className="mt-1 font-medium text-slate-900">
                  {data?.courier?.name ?? '-'}
                </div>
                <div className="text-sm text-slate-500">{data?.courier?.phone ?? '-'}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Status</div>
                <div className="mt-1 font-medium text-slate-900">
                  {data?.ride?.status ?? '-'}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Started</div>
                <div className="mt-1 text-slate-900">
                  {data?.ride?.startedAt
                    ? new Date(data.ride.startedAt).toLocaleString()
                    : '-'}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Ended</div>
                <div className="mt-1 text-slate-900">
                  {data?.ride?.endedAt
                    ? new Date(data.ride.endedAt).toLocaleString()
                    : '-'}
                </div>
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
            <h2 className="text-lg font-semibold text-slate-900">Insights</h2>

            <div className="mt-4 space-y-3">
              {Array.isArray(data?.insights) && data.insights.length > 0 ? (
                data.insights.map((insight) => (
                  <div
                    key={insight.code}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-slate-900">{insight.title}</div>
                      <span className="text-xs uppercase tracking-wide text-slate-500">
                        {insight.level}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{insight.message}</p>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">No insights available.</div>
              )}
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
                {Array.isArray(data?.events) && data.events.length > 0 ? (
                  data.events.map((event) => (
                    <tr key={event.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-900">{event.type}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {event.ts ? new Date(event.ts).toLocaleString() : '-'}
                      </td>
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
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No events found.
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