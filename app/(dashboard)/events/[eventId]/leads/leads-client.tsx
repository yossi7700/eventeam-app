"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, DollarSign, Ticket, Users, Wallet, HourglassIcon, Bell } from "lucide-react";
import { leadsCache, listRegistrationsForEvent, type RegistrationWithGuests } from "@/lib/queries/leads";
import { exportLeadsCsv, markCashCleared, notifyCashPending } from "@/lib/edge-functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const paymentStatusVariants: Record<string, "outline" | "default" | "secondary" | "destructive"> = {
  pending: "outline",
  confirmed: "default",
  cancelled: "secondary",
  refunded: "destructive",
};

const cashStatusVariants: Record<string, "outline" | "default"> = {
  pending: "outline",
  cleared_manually: "default",
};

// Mirrors the old system's eventRegistrationStats(): total registrations,
// total guests, total amount, cash cleared, cash pending -- shown here for
// the first time (the old event-detail page surfaced these but nothing in
// the rebuild did).
function EventStatsSummary({ registrations }: { registrations: RegistrationWithGuests[] }) {
  const totalRegistrations = registrations.length;
  const totalGuests = registrations.reduce((sum, r) => sum + r.guests.length, 0);
  const totalAmount = registrations.reduce((sum, r) => sum + Number(r.total_amount), 0);
  const cashCleared = registrations.reduce(
    (sum, r) =>
      sum +
      r.guest_payments
        .filter((p) => p.method === "cash" && p.status === "cleared_manually")
        .reduce((s, p) => s + Number(p.amount), 0),
    0
  );
  const cashPending = registrations.reduce(
    (sum, r) =>
      sum +
      r.guest_payments
        .filter((p) => p.method === "cash" && p.status === "pending")
        .reduce((s, p) => s + Number(p.amount), 0),
    0
  );

  const tiles = [
    { label: "Registrations", value: String(totalRegistrations), icon: Ticket },
    { label: "Guests", value: String(totalGuests), icon: Users },
    { label: "Total amount", value: `$${totalAmount.toFixed(2)}`, icon: DollarSign },
    { label: "Cash cleared", value: `$${cashCleared.toFixed(2)}`, icon: Wallet },
    { label: "Cash pending", value: `$${cashPending.toFixed(2)}`, icon: HourglassIcon },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {tiles.map(({ label, value, icon: Icon }) => (
        <Card key={label} className="gap-1 py-3">
          <CardContent className="px-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="size-3.5" />
              {label}
            </div>
            <p className="mt-1 text-lg font-semibold">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function LeadsClient({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());

  const { data: registrations, isPending, error } = useQuery({
    queryKey: leadsCache.listKey(eventId),
    queryFn: () => listRegistrationsForEvent(eventId),
  });

  const exportMutation = useMutation({
    mutationFn: () => exportLeadsCsv(eventId),
    onSuccess: (data) => {
      window.open(data.url, "_blank", "noopener,noreferrer");
      toast.success("Export ready — download started.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const clearMutation = useMutation({
    mutationFn: markCashCleared,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsCache.listKey(eventId) });
      toast.success("Payment status updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const notifyMutation = useMutation({
    mutationFn: notifyCashPending,
    onSuccess: (_data, registrationId) => {
      setNotifiedIds((prev) => new Set(prev).add(registrationId));
      toast.success("Company notified.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
          <Download />
          {exportMutation.isPending ? "Generating..." : "Export CSV"}
        </Button>
      </div>

      {isPending && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load leads</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {registrations && registrations.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No registrations yet for this event.
          </CardContent>
        </Card>
      )}

      {registrations && registrations.length > 0 && (
        <EventStatsSummary registrations={registrations} />
      )}

      {registrations && registrations.length > 0 && (
        <div className="grid gap-2">
          {registrations.map((r) => {
            const cashPayment = r.guest_payments.find((p) => p.method === "cash");
            return (
              <Card key={r.id} className="py-0">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.primary_guest_name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {r.primary_guest_email} &middot; {r.guests.length} guest(s)
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-medium">${Number(r.total_amount).toFixed(2)}</span>
                      <Badge variant={paymentStatusVariants[r.status] ?? "outline"} className="capitalize">
                        {r.status}
                      </Badge>
                    </div>
                  </div>

                  {cashPayment && (
                    <div className="flex flex-wrap items-center gap-2 border-t pt-2">
                      <Badge variant={cashStatusVariants[cashPayment.status] ?? "outline"} className="capitalize">
                        Cash: {cashPayment.status.replace("_", " ")}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => clearMutation.mutate(cashPayment.id)}
                        disabled={clearMutation.isPending}
                      >
                        {cashPayment.status === "cleared_manually" ? "Mark as pending" : "Mark as cleared"}
                      </Button>
                      {cashPayment.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => notifyMutation.mutate(r.id)}
                          disabled={notifyMutation.isPending || notifiedIds.has(r.id)}
                        >
                          <Bell className="size-3.5" />
                          {notifiedIds.has(r.id) ? "Notified" : "Notify company"}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
