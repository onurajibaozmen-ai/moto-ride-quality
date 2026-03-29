import Nav from '../components/nav';
import { Badge } from '../components/ui';

async function getCouriers() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const res = await fetch(`${baseUrl}/dashboard/couriers`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch couriers');
  }

  return res.json();
}

export default async function CouriersPage() {
  const couriers = await getCouriers();

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl">
        <Nav />

        <h1 className="mb-6 text-3xl font-bold text-slate-900">Couriers</h1>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3">Courier ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Online</th>
                <th className="px-4 py-3">Last Seen</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Last Ride ID</th>
                <th className="px-4 py-3">Last Ride Status</th>
                <th className="px-4 py-3">Last Ride Score</th>
                <th className="px-4 py-3">Created At</th>
              </tr>
            </thead>
            <tbody>
              {couriers.map((courier: any) => (
                <tr key={courier.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{courier.id}</td>
                  <td className="px-4 py-3">{courier.name}</td>
                  <td className="px-4 py-3">{courier.phone}</td>
                  <td className="px-4 py-3">
                    <Badge
                      label={courier.isOnline ? 'ONLINE' : 'OFFLINE'}
                      tone={courier.isOnline ? 'green' : 'gray'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {courier.lastSeenAt
                      ? new Date(courier.lastSeenAt).toLocaleString()
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      label={courier.isActive ? 'ACTIVE' : 'INACTIVE'}
                      tone={courier.isActive ? 'blue' : 'gray'}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {courier.lastRide?.id ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    {courier.lastRide?.status ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    {courier.lastRide?.score ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(courier.createdAt).toLocaleString()}
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