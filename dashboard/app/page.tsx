import Link from "next/link";
import { fetchJson } from "@/lib/api";

type Overview = {
  totalCouriers: number;
  activeRides: number;
  completedRides: number;
  totalEvents: number;
  averageScore: number;
  lowConfidenceRideCount: number;
};

async function getOverview() {
  return fetchJson<Overview>("/dashboard/overview");
}

export default async function HomePage() {
  const data = await getOverview();

  const cards = [
    { label: "Total Couriers", value: data.totalCouriers ?? 0 },
    { label: "Active Rides", value: data.activeRides ?? 0 },
    { label: "Completed Rides", value: data.completedRides ?? 0 },
    { label: "Total Events", value: data.totalEvents ?? 0 },
    { label: "Average Score", value: data.averageScore ?? 0 },
    { label: "Low Confidence Rides", value: data.lowConfidenceRideCount ?? 0 },
  ];

  return (
    <main className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Ride Quality Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Production overview of courier ride quality metrics.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="text-sm text-slate-500">{card.label}</div>
              <div className="mt-3 text-4xl font-semibold text-slate-900">
                {card.value}
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link
            href="/rides"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:bg-slate-50"
          >
            <div className="text-lg font-semibold">Rides</div>
            <p className="mt-2 text-sm text-slate-600">
              Browse completed and active rides.
            </p>
          </Link>

          <Link
            href="/couriers"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:bg-slate-50"
          >
            <div className="text-lg font-semibold">Couriers</div>
            <p className="mt-2 text-sm text-slate-600">
              See courier performance summaries.
            </p>
          </Link>

          <Link
            href="/summary"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:bg-slate-50"
          >
            <div className="text-lg font-semibold">Summary</div>
            <p className="mt-2 text-sm text-slate-600">
              View pilot-level aggregate summary.
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}