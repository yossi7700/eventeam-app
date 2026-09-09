"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CalendarCheck,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Users,
  Ticket,
  DollarSign,
  Percent,
  Wallet,
  HourglassIcon,
} from "lucide-react";
import { getDashboardKpis } from "@/lib/edge-functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type KpiTone = "default" | "positive" | "warning" | "muted";

const toneClasses: Record<KpiTone, string> = {
  default: "bg-primary/10 text-primary",
  positive: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  muted: "bg-muted text-muted-foreground",
};

function KpiTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: KpiTone;
}) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="flex items-center justify-between px-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="size-4.5" />
        </span>
      </CardContent>
    </Card>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-[74px] rounded-xl" />
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          A snapshot of your events, guests, and earnings.
        </p>
      </div>

      {isPending && <KpiSkeleton />}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load KPIs</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {kpis && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <KpiTile label="Total events" value={kpis.total_events} icon={CalendarDays} />
          <KpiTile label="Active events" value={kpis.active_events} icon={CalendarCheck} tone="positive" />
          {kpis.total_companies !== null && (
            <KpiTile label="Total companies" value={kpis.total_companies} icon={Building2} />
          )}
          {kpis.pending_companies !== null && (
            <KpiTile label="Pending companies" value={kpis.pending_companies} icon={Clock} tone="warning" />
          )}
          {kpis.active_companies !== null && (
            <KpiTile label="Active companies" value={kpis.active_companies} icon={CheckCircle2} tone="positive" />
          )}
          {kpis.inactive_companies !== null && (
            <KpiTile label="Inactive companies" value={kpis.inactive_companies} icon={XCircle} tone="muted" />
          )}
          {kpis.stripe_connected !== null && (
            <KpiTile label="Stripe connected" value={kpis.stripe_connected} icon={CreditCard} />
          )}
          <KpiTile label="Total guests" value={kpis.total_guests} icon={Users} />
          <KpiTile label="Total registrations" value={kpis.total_registrations} icon={Ticket} />
          <KpiTile
            label="Total earnings"
            value={`$${kpis.total_earnings.toFixed(2)}`}
            icon={DollarSign}
            tone="positive"
          />
          <KpiTile
            label="Total commission"
            value={`$${kpis.total_commission.toFixed(2)}`}
            icon={Percent}
          />
          <KpiTile
            label="Cash cleared"
            value={`$${kpis.cash_cleared.toFixed(2)}`}
            icon={Wallet}
            tone="positive"
          />
          <KpiTile
            label="Cash pending"
            value={`$${kpis.cash_pending.toFixed(2)}`}
            icon={HourglassIcon}
            tone="warning"
          />
        </div>
      )}

      {kpis && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming events</CardTitle>
            </CardHeader>
            <CardContent>
              {kpis.upcoming_events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming events.</p>
              ) : (
                <ul className="-mx-2 divide-y">
                  {kpis.upcoming_events.map((event) => (
                    <li key={event.id}>
                      <Link
                        href={`/events/${event.id}/edit`}
                        className="flex items-center justify-between rounded-md px-2 py-2.5 text-sm transition-colors hover:bg-muted/60"
                      >
                        <span className="font-medium">{event.title}</span>
                        <span className="text-muted-foreground">
                          {new Date(event.start_date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent registrants</CardTitle>
            </CardHeader>
            <CardContent>
              {kpis.recent_registrants.length === 0 ? (
                <p className="text-sm text-muted-foreground">No registrations yet.</p>
              ) : (
                <ul className="-mx-2 divide-y">
                  {kpis.recent_registrants.map((r) => (
                    <li key={r.id} className="flex items-center justify-between px-2 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.primary_guest_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.event_title} &middot; {r.company_name}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 font-mono">
                        ${Number(r.price_breakdown.total_amount).toFixed(2)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
