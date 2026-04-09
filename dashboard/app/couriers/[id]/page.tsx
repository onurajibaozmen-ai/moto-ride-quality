import Link from 'next/link';
import SimpleMap from '@/components/maps/simple-map';
import { apiFetch } from '@/lib/api';

type CourierDetailResponse = {
  page?: number;
  limit?: number;
  total?: number;
  items?: Array<{
    id: string;
    name: string;
    phone: string;
    role?: string;
    isActive?: boolean;
    lastSeenAt?: string | null;
    availabilityStatus?: 'OFFLINE' | 'READY' | 'DELIVERY';
    availabilityUpdatedAt?: string | null;
    shiftAutoReadyEnabled?: boolean;
    activeRide?: {
      id: string;
      status: string;
      openOrderCount?: number;
    } | null;
    latestTelemetry?: {
      ts: string;
      lat: number;
      lng: number;
      rideId?: string | null;
    } | null;
    dailyStats?: {
      deliveredCountToday?: number;
      totalRouteDistanceMetersToday?: number;
    };
    dispatch?: {
      isAssignable?: boolean;
      hasOpenOrders?: boolean;
      openOrderCount?: number;
    };
  }>;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

async function getCourierDetail(
  id: string,
): Promise<NonNullable<CourierDetailResponse['items']>[number] | null> {
  try {
    const data = await apiFetch<CourierDetailResponse>(
      `/dashboard/couriers?page=1&limit=200`,
    );

    const items = Array.isArray(data?.items) ? data.items : [];
    return items.find((item) => item.id === id) ?? null;
  } catch (error) {
    console.error('Failed to fetch courier detail', error);
    return null;
  }
}

export default async function CourierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const courier = await getCourierDetail(id);

  if (!courier) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              Courier not found
            </h1>
            <p className="mt-2 text-slate-600">Courier detayı alınamadı.</p>
            <Link
              href="/couriers"
              className="mt-4 inline-block text-blue-600 hover:underline"
            >
              Back to couriers
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const courierMarkers =
    courier.latestTelemetry != null
      ? [
          {
            id: 'courier-last-location',
            lat: courier.latestTelemetry.lat,
            lng: courier.latestTelemetry.lng,
            label: 'C',
            title: `${courier.name} last known location`,
          },
        ]
      : [];

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Courier Detail
            </h1>
            <p className="mt-2 text-slate-600">
              {courier.name} · {courier.phone}
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/couriers" className="text-blue-600 hover:underline">
              Back to couriers
            </Link>
            <Link
              href={`/couriers/${courier.id}/scoring`}
              className="text-blue-600 hover:underline"
            >
              View scoring
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Availability</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {courier.availabilityStatus ?? 'OFFLINE'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Assignable</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {courier.dispatch?.isAssignable ? 'Yes' : 'No'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Delivered Today</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {courier.dailyStats?.deliveredCountToday ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Route Distance Today</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {courier.dailyStats?.totalRouteDistanceMetersToday ?? 0} m
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Operational Status
            </h2>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div>
                <span className="font-medium text-slate-900">Courier ID:</span>{' '}
                {courier.id}
              </div>
              <div>
                <span className="font-medium text-slate-900">Role:</span>{' '}
                {courier.role ?? '-'}
              </div>
              <div>
                <span className="font-medium text-slate-900">Active:</span>{' '}
                {courier.isActive ? 'Yes' : 'No'}
              </div>
              <div>
                <span className="font-medium text-slate-900">
                  Shift auto ready:
                </span>{' '}
                {courier.shiftAutoReadyEnabled ? 'Yes' : 'No'}
              </div>
              <div>
                <span className="font-medium text-slate-900">
                  Availability updated:
                </span>{' '}
                {formatDate(courier.availabilityUpdatedAt)}
              </div>
              <div>
                <span className="font-medium text-slate-900">Last seen:</span>{' '}
                {formatDate(courier.lastSeenAt)}
              </div>
              <div>
                <span className="font-medium text-slate-900">
                  Open orders:
                </span>{' '}
                {courier.dispatch?.openOrderCount ?? 0}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Active Ride & Telemetry
            </h2>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div>
                <span className="font-medium text-slate-900">Active ride:</span>{' '}
                {courier.activeRide?.id ?? '-'}
              </div>
              <div>
                <span className="font-medium text-slate-900">Ride status:</span>{' '}
                {courier.activeRide?.status ?? '-'}
              </div>
              <div>
                <span className="font-medium text-slate-900">
                  Ride open orders:
                </span>{' '}
                {courier.activeRide?.openOrderCount ?? 0}
              </div>
              <div>
                <span className="font-medium text-slate-900">
                  Latest telemetry:
                </span>{' '}
                {courier.latestTelemetry
                  ? `${courier.latestTelemetry.lat.toFixed(5)}, ${courier.latestTelemetry.lng.toFixed(5)}`
                  : '-'}
              </div>
              <div>
                <span className="font-medium text-slate-900">
                  Telemetry time:
                </span>{' '}
                {formatDate(courier.latestTelemetry?.ts)}
              </div>
              <div>
                <span className="font-medium text-slate-900">
                  Telemetry ride:
                </span>{' '}
                {courier.latestTelemetry?.rideId ?? '-'}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Courier Location Map
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Son telemetry konumu.
          </p>

          <div className="mt-4">
            {courierMarkers.length > 0 ? (
              <SimpleMap markers={courierMarkers} />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Bu courier için henüz telemetry konumu yok.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}