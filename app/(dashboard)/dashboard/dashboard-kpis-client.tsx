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
          {kpis.active_companies !== null && (
            <KpiTile label="Active companies" value={kpis.active_companies} />
          )}
          {kpis.inactive_companies !== null && (
            <KpiTile label="Inactive companies" value={kpis.inactive_companies} />
          )}
          {kpis.stripe_connected !== null && (
            <KpiTile label="Stripe connected" value={kpis.stripe_connected} />
          )}
          <KpiTile label="Total guests" value={kpis.total_guests} />
          <KpiTile label="Total registrations" value={kpis.total_registrations} />
          <KpiTile label="Total earnings" value={`$${kpis.total_earnings.toFixed(2)}`} />
          <KpiTile label="Total commission" value={`$${kpis.total_commission.toFixed(2)}`} />
          <KpiTile label="Cash cleared" value={`$${kpis.cash_cleared.toFixed(2)}`} />
          <KpiTile label="Cash pending" value={`$${kpis.cash_pending.toFixed(2)}`} />
        </div>
      )}

      {kpis && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-lg font-medium">Upcoming events</h2>
            {kpis.upcoming_events.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming events.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {kpis.upcoming_events.map((event) => (
                  <li key={event.id} className="px-4 py-3">
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(event.start_date).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-medium">Recent registrants</h2>
            {kpis.recent_registrants.length === 0 ? (
              <p className="text-sm text-gray-500">No registrations yet.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {kpis.recent_registrants.map((r) => (
                  <li key={r.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{r.primary_guest_name}</p>
                        <p className="text-sm text-gray-500">
                          {r.event_title} &middot; {r.company_name}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        ${Number(r.price_breakdown.total_amount).toFixed(2)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
