import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="mb-8 flex items-center gap-3">
      <Link
        href="/"
        className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
      >
        Overview
      </Link>

      <Link
        href="/rides"
        className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
      >
        Rides
      </Link>

      <Link
        href="/couriers"
        className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
      >
        Couriers
      </Link>

      <Link
        href="/summary"
        className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
      >
        Summary
      </Link>
    </nav>
  );
}