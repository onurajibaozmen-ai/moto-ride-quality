import RideMapClient from "@/components/ride-map-client";
import { fetchJson } from "@/lib/api";

type Insight = {
  title: string;
  severity: "low" | "medium" | "high";
  summary: string;
  recommendation: string;
};

type RideDetailResponse = {
  id: string;
  status: string;
  startedAt: string;
  endedAt?: string | null;
  score?: number | null;
  confidenceLevel?: string | null;
  courier?: {
    id: string;
    name: string;
    phone: string;
  };
  analytics?: {
    totalDistanceM?: number;
    movingSeconds?: number;
    idleSeconds?: number;
    avgSpeedKmh?: number | null;
    p95SpeedKmh?: number | null;
    maxSpeedKmh?: number | null;
    medianAccuracyM?: number | null;
    qualityScore?: number | null;
    qualityFlags?: string[];
  } | null;
  telemetry: Array<{
    timestamp: string;
    lat: number;
    lng: number;
    speedKmh?: number | null;
    accuracyM?: number | null;
    heading?: number | null;
    accelX?: number | null;
    accelY?: number | null;
    accelZ?: number | null;
  }>;
  events: Array<{
    id: string;
    type: string;
    timestamp: string;
    lat?: number | null;
    lng?: number | null;
    severity?: number | null;
    penalty?: number;
  }>;
  insights?: Insight[];
};

async function getRideDetail(id: string) {
  return fetchJson<RideDetailResponse>(`/dashboard/rides/${id}/detail`);
}

function formatNumber(value?: number | null, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}

function severityClasses(severity: Insight["severity"]) {
  if (severity === "high") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (severity === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default async function RideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getRideDetail(id);

  const analytics = data.analytics ?? {};
  const qualityFlags = analytics.qualityFlags ?? [];
  const insights = data.insights ?? [];

  const metricCards = [
    { label: "Total Score", value: formatNumber(data.score, 0) },
    { label: "Confidence", value: data.confidenceLevel ?? "-" },
    { label: "Distance (m)", value: formatNumber(analytics.totalDistanceM, 0) },
    { label: "Avg Speed", value: formatNumber(analytics.avgSpeedKmh, 2) },
    { label: "P95 Speed", value: formatNumber(analytics.p95SpeedKmh, 2) },
    { label: "Max Speed", value: formatNumber(analytics.maxSpeedKmh, 2) },
  ];

  return (
    <main className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Ride Detail</h1>
          <p className="mt-2 font-mono text-xs text-slate-500">{data.id}</p>
          <p className="mt-2 text-sm text-slate-600">
            Courier: {data.courier?.name ?? "-"}
            {data.courier?.phone ? ` • ${data.courier.phone}` : ""}
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metricCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="text-sm text-slate-500">{card.label}</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">
                {card.value}
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Coaching Insights
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Actionable explanations for this ride’s score and risk profile.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {insights.map((insight, index) => (
              <div
                key={`${insight.title}-${index}`}
                className={`rounded-2xl border p-5 ${severityClasses(
                  insight.severity,
                )}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold">{insight.title}</h3>
                  <span className="rounded-full border px-2 py-1 text-xs font-medium uppercase">
                    {insight.severity}
                  </span>
                </div>

                <p className="mt-3 text-sm">{insight.summary}</p>

                <div className="mt-4 rounded-xl bg-white/70 p-3 text-sm">
                  <span className="font-semibold">Recommendation:</span>{" "}
                  {insight.recommendation}
                </div>
              </div>
            ))}
          </div>
        </section>

        <RideMapClient telemetry={data.telemetry} events={data.events} />

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Event Timeline
            </h2>

            {data.events.length > 0 ? (
              <div className="space-y-2">
                {data.events.map((event) => (
                  <div
                    key={event.id}
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

            <div className="mt-6 grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Moving Seconds</span>
                <span className="font-medium text-slate-900">
                  {formatNumber(analytics.movingSeconds, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Idle Seconds</span>
                <span className="font-medium text-slate-900">
                  {formatNumber(analytics.idleSeconds, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Median Accuracy (m)</span>
                <span className="font-medium text-slate-900">
                  {formatNumber(analytics.medianAccuracyM, 2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quality Score</span>
                <span className="font-medium text-slate-900">
                  {formatNumber(analytics.qualityScore, 2)}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}