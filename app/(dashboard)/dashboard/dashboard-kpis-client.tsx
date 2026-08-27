"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardKpis } from "@/lib/edge-functions";

function KpiTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
      ))}
    </div>
  );
}

export function DashboardKpisClient() {
  const { data: kpis, isPending, error } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: getDashboardKpis,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {isPending && <KpiSkeleton />}

      {error && (
        <p className="text-sm text-red-600">Failed to load KPIs: {error.message}</p>
      )}

      {kpis && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <KpiTile label="Total events" value={kpis.total_events} />
          <KpiTile label="Active events" value={kpis.active_events} />
          {kpis.total_companies !== null && (
            <KpiTile label="Total companies" value={kpis.total_companies} />
          )}
          {kpis.pending_companies !== null && (
            <KpiTile label="Pending companies" value={kpis.pending_companies} />
          )}
          <KpiTile label="Total guests" value={kpis.total_guests} />
          <KpiTile label="Total registrations" value={kpis.total_registrations} />
          <KpiTile label="Total earnings" value={`$${kpis.total_earnings.toFixed(2)}`} />
          <KpiTile label="Total commission" value={`$${kpis.total_commission.toFixed(2)}`} />
          <KpiTile label="Cash cleared" value={`$${kpis.cash_cleared.toFixed(2)}`} />
          <KpiTile label="Cash pending" value={`$${kpis.cash_pending.toFixed(2)}`} />
        </div>
      )}
    </div>
  );
}
