export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { apiFetch, bulkAutoAssign } from '@/lib/api';

type DispatchQueueResponse = {
  readyCourierCount: number;
  pendingOrderCount: number;
  queue: Array<{
    id: string;
    externalRef: string | null;
    status: string;
    createdAt: string;
    waitingMinutes: number;
    triggerEligible: boolean;
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
  }>;
};

type TriggerCheckResponse = {
  hasPendingOrders: boolean;
  readyCourierCount: number;
  oldestPendingOrder: {
    id: string;
    externalRef: string | null;
    createdAt: string;
  } | null;
  oldestWaitingMinutes: number;
  triggerSatisfied: boolean;
  reasons: string[];
};

async function getQueue(): Promise<DispatchQueueResponse | null> {
  try {
    return await apiFetch<DispatchQueueResponse>('/dashboard/dispatch/queue');
  } catch (error) {
    console.error('Failed to fetch dispatch queue', error);
    return null;
  }
}

async function getTrigger(): Promise<TriggerCheckResponse | null> {
  try {
    return await apiFetch<TriggerCheckResponse>(
      '/dashboard/dispatch/trigger-check',
    );
  } catch (error) {
    console.error('Failed to fetch trigger check', error);
    return null;
  }
}

async function runBulkAutoAssign() {
  'use server';

  try {
    await bulkAutoAssign(10);
  } catch (error) {
    console.error('Bulk auto assign failed', error);
  }
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export default async function DispatchQueuePage() {
  const [queueData, triggerData] = await Promise.all([getQueue(), getTrigger()]);

  const queue = queueData?.queue ?? [];

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Dispatch Queue
            </h1>
            <p className="mt-2 text-slate-600">
              Pending queue ve trigger uygunluğu görünümü.
            </p>
          </div>

          <form action={runBulkAutoAssign}>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Bulk Auto Assign
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Pending Orders</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {queueData?.pendingOrderCount ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Ready Couriers</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {queueData?.readyCourierCount ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Oldest Waiting</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {triggerData?.oldestWaitingMinutes ?? 0} min
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Trigger Satisfied</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {triggerData?.triggerSatisfied ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Trigger Check</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <div>
              <span className="font-medium text-slate-900">Oldest Order:</span>{' '}
              {triggerData?.oldestPendingOrder?.externalRef ??
                triggerData?.oldestPendingOrder?.id ??
                '-'}
            </div>
            <div>
              <span className="font-medium text-slate-900">Created At:</span>{' '}
              {formatDate(triggerData?.oldestPendingOrder?.createdAt)}
            </div>
            <div>
              <span className="font-medium text-slate-900">Reasons:</span>{' '}
              {(triggerData?.reasons ?? []).join(', ') || '-'}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Created At</th>
                  <th className="px-4 py-3 text-left">Waiting</th>
                  <th className="px-4 py-3 text-left">Trigger Eligible</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {item.externalRef ?? item.id}
                      </div>
                      <div className="text-xs text-slate-500">{item.id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.status}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.waitingMinutes} min
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.triggerEligible ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))}

                {queue.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No pending queue items found.
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