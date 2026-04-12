export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { apiFetch } from '@/lib/api';

type OverviewResponse = {
  orders?: {
    total?: number;
    pending?: number;
    assigned?: number;
    pickedUp?: number;
    delivered?: number;
  };
  rides?: {
    total?: number;
    active?: number;
    completed?: number;
  };
  couriers?: {
    total?: number;
    active?: number;
    ready?: number;
    delivery?: number;
    offline?: number;
  };
};

async function getOverview(): Promise<OverviewResponse> {
  try {
    return await apiFetch<OverviewResponse>('/dashboard/overview');
  } catch (error) {
    console.error('Failed to fetch overview', error);
    return {};
  }
}

export default async function SummaryPage() {
  const data = await getOverview();

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Summary</h1>
          <p className="mt-2 text-slate-600">M13 operasyon özeti.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm text-slate-500">Ready Couriers</div>
            <div className="mt-2 text-3xl font-semibold">
              {data?.couriers?.ready ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm text-slate-500">Active Rides</div>
            <div className="mt-2 text-3xl font-semibold">
              {data?.rides?.active ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm text-slate-500">Delivered Orders</div>
            <div className="mt-2 text-3xl font-semibold">
              {data?.orders?.delivered ?? 0}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}