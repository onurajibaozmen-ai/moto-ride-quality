import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type Stop = {
  stopId: string;
  orderId: string;
  orderRef: string;
  type: 'pickup' | 'dropoff';
  lat: number;
  lng: number;
  status: string;
  sequence: number;
};

type PlanResponse = {
  ride: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    score: number | null;
  };
  courier: {
    id: string;
    name: string;
    phone: string;
  };
  totalOrders: number;
  stops: Stop[];
  recommendedSequence: Stop[];
};

function badge(type: string) {
  if (type === 'pickup') return 'bg-blue-100 text-blue-700';
  if (type === 'dropoff') return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-700';
}

export default async function RidePlanPage(
  props: PageProps<'/rides/[id]/plan'>
) {
  const { id } = await props.params;

  const data = (await apiFetch(
    `/orders/ride/${id}/plan`
  )) as PlanResponse;

  const stops = data?.recommendedSequence ?? [];

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">

        <div>
          <Link href={`/rides/${id}`} className="text-sm text-blue-600 hover:underline">
            ← Back to ride
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Ride Plan
          </h1>
          <p className="text-sm text-slate-500">
            Multi-order stop sequence & routing
          </p>
        </div>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white border rounded-xl p-4">
            <div className="text-sm text-slate-500">Ride</div>
            <div className="font-mono text-xs mt-1">{data.ride.id}</div>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <div className="text-sm text-slate-500">Courier</div>
            <div className="mt-1 font-medium">{data.courier?.name}</div>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <div className="text-sm text-slate-500">Total Orders</div>
            <div className="mt-1 text-xl font-semibold">
              {data.totalOrders}
            </div>
          </div>
        </div>

        {/* Stops */}
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3">Seq</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Location</th>
              </tr>
            </thead>
            <tbody>
              {stops.map((stop) => (
                <tr key={stop.stopId} className="border-t">
                  <td className="px-4 py-3 font-semibold">
                    {stop.sequence}
                  </td>

                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${badge(stop.type)}`}>
                      {stop.type}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-mono text-xs">
                    {stop.orderRef}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  );
}