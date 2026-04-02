import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ride Quality Dashboard",
  description: "Courier ride quality dashboard",
};

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/rides", label: "Rides" },
  { href: "/couriers", label: "Couriers" },
  { href: "/orders", label: "Orders"},
  { href: "/summary", label: "Summary" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-lg font-semibold text-slate-900">
                Ride Quality Dashboard
              </Link>

              <nav className="flex items-center gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>

          <div>{children}</div>
        </div>
      </body>
    </html>
  );
}