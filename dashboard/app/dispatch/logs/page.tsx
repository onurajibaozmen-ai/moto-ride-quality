import { apiFetch } from '@/lib/api';

type DispatchLogsResponse = {
  page: number;
  limit: number;
  total: number;
  items: Array<{
    id: string;
    orderId: string;
    recommendedCourierId: string | null;
    status: string;
    recommendationPayload: unknown;
    triggerSnapshot: unknown;
    reason: string | null;
    createdAt: string;
    updatedAt: string;
    order: {
      id: string;
      externalRef: string | null;
      status: string;
    };
    recommendedCourier: {
      id: string;
      name: string;
      phone: string;
      availabilityStatus: string;
    } | null;
  }>;
};

async function getDispatchLogs(): Promise<DispatchLogsResponse | null> {
  try {
    return await apiFetch<DispatchLogsResponse>(
      '/dashboard/dispatch/logs?page=1&limit=100',
    );
  } catch (error) {
    console.error('Failed to fetch dispatch logs', error);
    return null;
  }
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export default async function DispatchLogsPage() {
  const data = await getDispatchLogs();
  const items = data?.items ?? [];

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dispatch Logs</h1>
          <p className="mt-2 text-slate-600">
            Recommendation, approve, reject ve auto-assign geçmişi.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Recommended Courier</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                  <th className="px-4 py-3 text-left">Created At</th>
                </tr>
              </thead>
              <tbody>
                {items.map((log) => (
                  <tr key={log.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {log.order.externalRef ?? log.order.id}
                      </div>
                      <div className="text-xs text-slate-500">
                        {log.order.id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{log.status}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.recommendedCourier
                        ? `${log.recommendedCourier.name} (${log.recommendedCourier.phone})`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.reason ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No dispatch logs found.
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