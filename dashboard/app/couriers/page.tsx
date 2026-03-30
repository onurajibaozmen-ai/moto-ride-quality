import { fetchJson } from "@/lib/api";

type Courier = {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  lastSeenAt?: string | null;
  totalCompletedRides: number;
  averageScore: number;
  totalDistanceM: number;
  totalEvents: number;
  lowConfidenceRides: number;
};

async function getCouriers() {
  return fetchJson<Courier[]>("/dashboard/couriers");
}

export default async function CouriersPage() {
  const couriers = await getCouriers();

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Couriers</h1>
          <p className="mt-1 text-sm text-slate-600">
            Courier performance and scoring summary.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Completed Rides</th>
                <th className="px-4 py-3">Average Score</th>
                <th className="px-4 py-3">Distance (m)</th>
                <th className="px-4 py-3">Events</th>
                <th className="px-4 py-3">Low Confidence</th>
              </tr>
            </thead>
            <tbody>
              {couriers.map((courier) => (
                <tr key={courier.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{courier.name}</td>
                  <td className="px-4 py-3">{courier.phone}</td>
                  <td className="px-4 py-3">{courier.totalCompletedRides}</td>
                  <td className="px-4 py-3">{courier.averageScore}</td>
                  <td className="px-4 py-3">{Math.round(courier.totalDistanceM)}</td>
                  <td className="px-4 py-3">{courier.totalEvents}</td>
                  <td className="px-4 py-3">{courier.lowConfidenceRides}</td>
                </tr>
              ))}

              {couriers.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No couriers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}