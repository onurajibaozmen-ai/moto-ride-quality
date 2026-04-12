export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from 'next/link';
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

export default async function HomePage() {
  const data = await getOverview();

  const cards = [
    { label: 'Total Orders', value: data?.orders?.total ?? 0 },
    { label: 'Pending Orders', value: data?.orders?.pending ?? 0 },
    { label: 'Active Rides', value: data?.rides?.active ?? 0 },
    { label: 'Completed Rides', value: data?.rides?.completed ?? 0 },
    { label: 'Total Couriers', value: data?.couriers?.total ?? 0 },
    { label: 'Ready Couriers', value: data?.couriers?.ready ?? 0 },
    { label: 'Delivery Couriers', value: data?.couriers?.delivery ?? 0 },
    { label: 'Offline Couriers', value: data?.couriers?.offline ?? 0 },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Delivery Ops Dashboard
          </h1>
          <p className="mt-2 text-slate-600">
            M15 dispatch workflow hardening görünümü.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
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
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <Link
            href="/rides"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="text-lg font-semibold text-slate-900">Rides</div>
            <p className="mt-2 text-sm text-slate-600">
              Ride detail ve plan görünümü.
            </p>
          </Link>

          <Link
            href="/couriers"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="text-lg font-semibold text-slate-900">Couriers</div>
            <p className="mt-2 text-sm text-slate-600">
              Availability ve courier scoring.
            </p>
          </Link>

          <Link
            href="/orders"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="text-lg font-semibold text-slate-900">Orders</div>
            <p className="mt-2 text-sm text-slate-600">
              Siparişler ve dispatch panel.
            </p>
          </Link>

          <Link
            href="/dispatch/queue"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="text-lg font-semibold text-slate-900">
              Dispatch Queue
            </div>
            <p className="mt-2 text-sm text-slate-600">
              15 dk bekleyen sipariş kuyruğu.
            </p>
          </Link>

          <Link
            href="/dispatch/logs"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="text-lg font-semibold text-slate-900">
              Dispatch Logs
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Approve / reject / auto-assign geçmişi.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}