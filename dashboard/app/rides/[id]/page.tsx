import Link from 'next/link';
import { apiFetch } from '@/lib/api';

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
    sampleCount?: number;
    validPointCount?: number;
    gpsGapCount?: number;
    lowAccuracyCount?: number;
    movingSeconds?: number;
    idleSeconds?: number;
    totalDistanceM?: number;
    avgSpeedKmh?: number | null;
    p95SpeedKmh?: number | null;
    maxSpeedKmh?: number | null;
    medianAccuracyM?: number | null;
    qualityScore?: number | null;
    qualityFlags?: unknown;
  } | null;
  scoreCard: {
    totalScore?: number;
    safetyScore?: number | null;
    complianceScore?: number | null;
    smoothnessScore?: number | null;
    efficiencyScore?: number | null;
    confidenceLevel?: string | null;
    scoringVersion?: string;
    breakdownJson?: unknown;
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

export default async function RideDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = 'then' in params ? await params : params;
  const id = resolvedParams.id;

  const data = (await apiFetch(`/rides/${id}/detail`)) as RideDetailResponse;

  const flags = Array.isArray(data?.analytics?.qualityFlags)
    ? data.analytics?.qualityFlags.filter(
        (item): item is string => typeof item === 'string',
      )
    : [];

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">
              <Link href="/rides" className="hover:underline">
                Rides
              </Link>{' '}
              / {data.ride.id}
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              Ride Detail
            </h1>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Score</div>
            <div className="mt-2 text-3xl font-semibold">
              {typeof data?.ride?.score === 'number'
                ? data.ride.score.toFixed(2)
                : '-'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Confidence</div>
            <div className="mt-2 text-3xl font-semibold">
              {data?.scoreCard?.confidenceLevel ?? '-'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Distance</div>
            <div className="mt-2 text-3xl font-semibold">
              {typeof data?.ride?.totalDistanceM === 'number'
                ? `${(data.ride.totalDistanceM / 1000).toFixed(2)} km`
                : '-'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Duration</div>
            <div className="mt-2 text-3xl font-semibold">
              {typeof data?.ride?.durationS === 'number'
                ? `${Math.round(data.ride.durationS / 60)} min`
                : '-'}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Ride Info</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs text-slate-500">Courier</div>
                <div className="text-sm font-medium text-slate-900">
                  {data?.courier?.name ?? '-'}
                </div>
                <div className="text-xs text-slate-500">
                  {data?.courier?.phone ?? '-'}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Status</div>
                <div className="text-sm font-medium text-slate-900">
                  {data?.ride?.status ?? '-'}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Started</div>
                <div className="text-sm text-slate-900">
                  {data?.ride?.startedAt
                    ? new Date(data.ride.startedAt).toLocaleString()
                    : '-'}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Ended</div>
                <div className="text-sm text-slate-900">
                  {data?.ride?.endedAt
                    ? new Date(data.ride.endedAt).toLocaleString()
                    : '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Score Card</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Safety</span>
                <span>{typeof data?.scoreCard?.safetyScore === 'number' ? data.scoreCard.safetyScore.toFixed(2) : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Compliance</span>
                <span>{typeof data?.scoreCard?.complianceScore === 'number' ? data.scoreCard.complianceScore.toFixed(2) : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Smoothness</span>
                <span>{typeof data?.scoreCard?.smoothnessScore === 'number' ? data.scoreCard.smoothnessScore.toFixed(2) : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Efficiency</span>
                <span>{typeof data?.scoreCard?.efficiencyScore === 'number' ? data.scoreCard.efficiencyScore.toFixed(2) : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Quality Score</span>
                <span>
                  {typeof data?.analytics?.qualityScore === 'number'
                    ? data.analytics.qualityScore.toFixed(2)
                    : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Insights</h2>

            <div className="mt-4 space-y-3">
              {(data?.insights ?? []).map((insight) => (
                <div
                  key={insight.code}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-900">
                      {insight.title}
                    </div>
                    <span className="text-xs uppercase text-slate-500">
                      {insight.level}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {insight.message}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Analytics</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Sample Count</span>
                <span>{data?.analytics?.sampleCount ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Valid Points</span>
                <span>{data?.analytics?.validPointCount ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">GPS Gaps</span>
                <span>{data?.analytics?.gpsGapCount ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Low Accuracy</span>
                <span>{data?.analytics?.lowAccuracyCount ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Avg Speed</span>
                <span>
                  {typeof data?.analytics?.avgSpeedKmh === 'number'
                    ? `${data.analytics.avgSpeedKmh.toFixed(2)} km/h`
                    : '-'}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-xs text-slate-500">Quality Flags</div>
              <div className="flex flex-wrap gap-2">
                {flags.length === 0 ? (
                  <span className="text-sm text-slate-500">No flags</span>
                ) : (
                  flags.map((flag) => (
                    <span
                      key={flag}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                    >
                      {flag}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Events ({data?.events?.length ?? 0})
          </h2>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {(data?.events ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                      No events found.
                    </td>
                  </tr>
                ) : (
                  (data.events ?? []).map((event) => (
                    <tr key={event.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{event.type}</td>
                      <td className="px-4 py-3">
                        {typeof event.severity === 'number'
                          ? event.severity.toFixed(2)
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(event.ts).toLocaleString()}
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