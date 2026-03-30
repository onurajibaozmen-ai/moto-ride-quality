import { fetchJson } from "@/lib/api";

type ScoreBreakdownResponse = {
  rideId: string;
  totalScore?: number | null;
  scoringVersion?: string | null;
  confidenceLevel?: string | null;
  qualityScore?: number | null;
  qualityFlags?: string[];
  analytics?: {
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
  } | null;
  eventCounts?: {
    harshBrake?: number;
    harshAccel?: number;
    speeding?: number;
  } | null;
  components?: {
    penalties?: {
      safetyPenalty?: number;
      compliancePenalty?: number;
      smoothnessPenalty?: number;
      efficiencyPenalty?: number;
    };
    scores?: {
      safetyScore?: number;
      complianceScore?: number;
      smoothnessScore?: number;
      efficiencyScore?: number;
      totalScore?: number;
    };
    events?: Array<{
      type: string;
      timestamp: string;
      severity?: number;
      penalty?: number;
    }>;
    scoringVersion?: string;
  } | null;
};

async function getRideBreakdown(id: string) {
  return fetchJson<ScoreBreakdownResponse>(
    `/dashboard/rides/${id}/score-breakdown`,
  );
}

function formatNumber(value?: number | null, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}

export default async function RideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getRideBreakdown(id);

  const penalties = data.components?.penalties ?? {};
  const scores = data.components?.scores ?? {};
  const analytics = data.analytics ?? {};
  const eventCounts = data.eventCounts ?? {};
  const qualityFlags = data.qualityFlags ?? [];
  const events = data.components?.events ?? [];

  const penaltyCards = [
    {
      label: "Safety Penalty",
      value: penalties.safetyPenalty ?? 0,
    },
    {
      label: "Compliance Penalty",
      value: penalties.compliancePenalty ?? 0,
    },
    {
      label: "Smoothness Penalty",
      value: penalties.smoothnessPenalty ?? 0,
    },
    {
      label: "Efficiency Penalty",
      value: penalties.efficiencyPenalty ?? 0,
    },
  ];

  const scoreCards = [
    {
      label: "Total Score",
      value: data.totalScore ?? scores.totalScore ?? 0,
    },
    {
      label: "Safety Score",
      value: scores.safetyScore ?? 0,
    },
    {
      label: "Compliance Score",
      value: scores.complianceScore ?? 0,
    },
    {
      label: "Smoothness Score",
      value: scores.smoothnessScore ?? 0,
    },
    {
      label: "Efficiency Score",
      value: scores.efficiencyScore ?? 0,
    },
    {
      label: "Quality Score",
      value: data.qualityScore ?? 0,
    },
  ];

  return (
    <main className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Ride Detail</h1>
          <p className="mt-2 font-mono text-xs text-slate-500">{data.rideId}</p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <div className="text-sm text-slate-500">Total Score</div>
              <div className="mt-2 text-5xl font-bold text-slate-900">
                {formatNumber(data.totalScore ?? scores.totalScore, 0)}
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-500">Confidence</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {data.confidenceLevel ?? "-"}
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-500">Scoring Version</div>
              <div className="mt-2 text-lg font-medium text-slate-900">
                {data.scoringVersion ?? data.components?.scoringVersion ?? "-"}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Score Breakdown
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {scoreCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="text-sm text-slate-500">{card.label}</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {formatNumber(card.value, 0)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Penalties
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {penaltyCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="text-sm text-slate-500">{card.label}</div>
                <div className="mt-2 text-3xl font-semibold text-red-600">
                  -{formatNumber(card.value, 2)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Event Counts
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Harsh Brake</span>
                <span className="font-medium text-slate-900">
                  {eventCounts.harshBrake ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Harsh Accel</span>
                <span className="font-medium text-slate-900">
                  {eventCounts.harshAccel ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Speeding</span>
                <span className="font-medium text-slate-900">
                  {eventCounts.speeding ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Quality Flags
            </h2>
            {qualityFlags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {qualityFlags.map((flag) => (
                  <span
                    key={flag}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No quality flags.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Event Timeline
          </h2>

          {events.length > 0 ? (
            <div className="space-y-2">
              {events.map((event, index) => (
                <div
                  key={`${event.type}-${event.timestamp}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 text-sm"
                >
                  <div className="font-medium text-slate-900">{event.type}</div>
                  <div className="text-slate-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                  <div className="text-slate-500">
                    Severity: {formatNumber(event.severity ?? 0, 2)}
                  </div>
                  <div className="font-semibold text-red-600">
                    -{formatNumber(event.penalty ?? 0, 0)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No events detected.</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Ride Analytics
          </h2>

          <div className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="text-slate-500">Distance (m)</div>
              <div className="mt-1 font-semibold text-slate-900">
                {formatNumber(analytics.totalDistanceM, 0)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Moving Seconds</div>
              <div className="mt-1 font-semibold text-slate-900">
                {formatNumber(analytics.movingSeconds, 0)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Idle Seconds</div>
              <div className="mt-1 font-semibold text-slate-900">
                {formatNumber(analytics.idleSeconds, 0)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Sample Count</div>
              <div className="mt-1 font-semibold text-slate-900">
                {formatNumber(analytics.sampleCount, 0)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Avg Speed (km/h)</div>
              <div className="mt-1 font-semibold text-slate-900">
                {formatNumber(analytics.avgSpeedKmh, 2)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">P95 Speed (km/h)</div>
              <div className="mt-1 font-semibold text-slate-900">
                {formatNumber(analytics.p95SpeedKmh, 2)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Max Speed (km/h)</div>
              <div className="mt-1 font-semibold text-slate-900">
                {formatNumber(analytics.maxSpeedKmh, 2)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Median Accuracy (m)</div>
              <div className="mt-1 font-semibold text-slate-900">
                {formatNumber(analytics.medianAccuracyM, 2)}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}